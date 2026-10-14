# AtlasCMS-Vue

Vue.js frontend package for AtlasCMS admin panel. Provides Vue components, Inertia.js pages, and all frontend assets for the CMS admin interface.

## Installation

The current manifest has `private: true`: [npm refuses to publish it](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#private). Supported delivery for this checkout is local source, Git, or an npm archive. A registry release needs a separately prepared publishable manifest and release process.

Run installation commands from the Laravel/Vite consumer root. AtlasCMS-Vue's third-party dependencies still need registry access or a populated npm cache. AtlasShop-Vue also needs AtlasCMS-Vue installed in that consumer.

### Local Sources

In My Atlas CMS, populate the submodules first:

```bash
git submodule update --init --recursive
```

For another consumer, clone the package repositories into the matching `packages/` directories. Then declare the local paths in the consumer's `package.json`:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"
  }
}
```

```bash
npm install
```

### Git Dependency

Use [npm's Git dependency syntax](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#git-urls-as-dependencies), replacing `<commit-sha>` with the full commit SHA of the tested revision:

```bash
npm install '@devcats-atlas/atlas-cms-vue@git+https://github.com/DevCats-Atlas/Atlas-CMS-Vue.git#<commit-sha>'
```

For AtlasShop-Vue, install AtlasCMS-Vue by the same method or from local sources first. Keep the dependency entries and `package-lock.json` in the consumer repository; with an existing lock, use `npm ci` in CI. The Git URL requires access to the repository. A commit SHA pins the Atlas package; the lock pins resolved third-party dependencies.

### npm Archive

From this package's source directory, create an archive in an existing output directory:

```bash
npm pack --ignore-scripts --pack-destination /absolute/path/to/artifacts
```

Use the filename returned by `npm pack` (currently `devcats-atlas-atlas-cms-vue-1.0.0.tgz`). Install it from the consumer root:

```bash
npm install /absolute/path/to/artifacts/devcats-atlas-atlas-cms-vue-1.0.0.tgz
```

Keep the archive available at the path recorded in the consumer dependency and lock, including in CI. AtlasShop-Vue consumers need archives or source dependencies for both Vue packages. Packing works with `private: true`; publishing is a separate operation.

### Environment Path Override

After installing and declaring the dependency, export the variable before starting Vite:

```bash
export ATLAS_CMS_VUE_PATH=/absolute/path/to/AtlasCMS-Vue
npm run build
```

`loadAllPackages()` reads this variable from `process.env`; the documented Vite config calls it before `loadEnv()`, so a value only in `.env` is not loaded by that call. Relative overrides resolve from the consumer root. The selected directory must contain `resources/` and a working `vite.config.mjs`.

An override changes config/resource/page resolution; it does not install dependencies or add a package to discovery. Keep the package declared in `package.json` and AtlasCMS-Vue installed in `node_modules` so `@devcats-atlas/atlas-cms-vue/vite-utils.mjs` can be imported. Override precedence is environment → local `file:` directory → installed `node_modules`. A missing override directory falls back to the remaining locations. With the `atlasPages()` plugin below, pages are loaded from the selected package's `resources/admin/Pages/`, including external override directories.

## Vite Configuration

AtlasCMS-Vue automatically integrates with your Vite configuration. You need to add a simple import to your root `vite.config.js`.

### Step 1: Update `vite.config.js`

Add this import at the top of your `vite.config.js`:

```javascript
import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';

// Import AtlasCMS-Vue utilities
const utils = await import('@devcats-atlas/atlas-cms-vue/vite-utils.mjs');
const { loadAllPackages, atlasPages } = utils;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// Load all packages automatically from package.json
const { inputs, aliases, pageRoots } = await loadAllPackages(__dirname);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const host = env.VITE_DEV_HOST || 'localhost';
    const port = parsePort(env.VITE_DEV_PORT, 5174);

    return {
        plugins: [
            atlasPages({ projectRoot: __dirname, pageRoots }),
            laravel({
                input: inputs,
                refresh: true,
            }),
            vue({
                template: {
                    transformAssetUrls: {
                        base: null,
                        includeAbsolute: false,
                    },
                },
            }),
            tailwindcss(),
        ],
        resolve: {
            alias: aliases,
        },
        server: {
            host,
            port,
            strictPort: true,
            cors: true,
            hmr: {
                host,
                port,
            },
        },
    };
});
```

### Step 2: Ensure Package is in `package.json`

Keep `@devcats-atlas/atlas-cms-vue` listed in the consumer dependencies. For local sources use the example below; retain the Git or archive spec if you chose that installation method:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"
  }
}
```

### How It Works

1. **Automatic Discovery**: The `loadAllPackages()` function reads your `package.json` and automatically finds `@devcats/*-vue` and `@devcats-atlas/*-vue` dependencies.

2. **Package Resolution**: Each package is resolved using this priority:
   - Environment variable (e.g., `ATLAS_CMS_VUE_PATH`)
   - Path from `package.json` (for `file:` protocol)
   - npm package in `node_modules`

3. **Config Loading**: Each package's `vite.config.mjs` file is automatically loaded, which defines:
   - Resource files (CSS, JS) to include in the build
   - Path aliases for imports

4. **Page Integration**: Pass the returned `pageRoots` to `atlasPages()`. The plugin generates lazy imports for admin pages alongside the resources/aliases configuration.

## Page Resolution

Register `atlasPages({ projectRoot: __dirname, pageRoots })` in the consumer's Vite plugins. `page-resolver.js` imports its `virtual:atlas-admin-pages` registry; the plugin is required for both build and dev.

An Inertia name such as `Admin/Orders/Index` maps exactly to `Admin/Orders/Index.vue` below a page root. Backslashes are normalized to slashes. Resolution priority is:

1. Host `resources/admin/Pages/` (always included). Add a file with the same relative name to override a CMS or package page.
2. AtlasCMS-Vue's selected `resources/admin/Pages/`.
3. Other successfully loaded, declared `@devcats/*-vue` or `@devcats-atlas/*-vue` dependencies in manifest order (`dependencies`, then `devDependencies`; a repeated dependency uses its dev spec).
4. Explicit extra roots appended by the consumer.

The first exact name wins. Only the winning file is imported for a collision. An unknown name rejects with `Page not found: <name>`. Imports remain lazy. No suffix matching or directory-name convention is used to select pages.

`loadAllPackages()` resolves each declared package through environment → `file:` → `node_modules`; its `pageRoots` use that same selected directory. A new scoped Vue dependency with a working `vite.config.mjs` (`resources` array and `aliases` object) and `resources/admin/Pages/` participates without a new resolver glob. Undeclared sibling folders and Composer packages are not scanned automatically.

For a Composer package or another page directory, append its root explicitly (relative paths resolve from the consumer):

```javascript
atlasPages({
    projectRoot: __dirname,
    pageRoots: [...pageRoots, 'vendor/acme/reports/resources/admin/Pages'],
})
```

Configure that package's component aliases/dependencies separately if its pages need them. In dev, adding/removing a `.vue` page invalidates the registry and reloads the browser, including host overrides; ordinary component edits use Vue HMR. Vite normally ignores edits inside `node_modules`; restart after changing installed npm pages. Restart Vite after changing dependency declarations, environment paths or plugin configuration. Production deployments need a new build after page changes.

## Package Structure

```
AtlasCMS-Vue/
├── vite.config.mjs          # Package Vite configuration
├── vite-utils.mjs           # Utilities for package resolution
├── resources/
│   └── admin/
│       ├── css/
│       │   └── app.css     # Admin styles
│       ├── js/
│       │   ├── app.js      # Main admin app entry
│       │   └── page-resolver.js  # Inertia.js page resolver
│       ├── Pages/          # Vue/Inertia pages
│       ├── Layouts/        # Layout components
│       └── Custom/         # Custom components
└── package.json
```

## Available Aliases

After installation, the following aliases are available in your Vue components:

- `@atlas-cms/admin` - Points to `resources/admin` directory
- `@admin` - Legacy alias for `resources/admin`
- `@` - Points to `resources/admin/js` directory

### Usage in Components

```vue
<script setup>
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
</script>
```

## Adding Additional Vue Packages

For AtlasShop-Vue, populate `packages/AtlasShop-Vue` and install it from the consumer root:

```bash
npm install ./packages/AtlasShop-Vue
```

Alternatively, use the Git or archive method in [Installation](#installation) with the AtlasShop-Vue repository/archive. Keep both Vue dependencies declared using the delivery method you selected. `loadAllPackages()` loads their resources and aliases from `vite.config.mjs`; pass their returned `pageRoots` to `atlasPages()` to register Inertia pages.

## Package Configuration (`vite.config.mjs`)

Each Vue package should have a `vite.config.mjs` file that exports its configuration:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    // Resource files to include in Vite build
    resources: [
        { type: 'css', file: 'resources/admin/css/app.css', context: 'admin' },
        { type: 'js', file: 'resources/admin/js/app.js', context: 'admin' },
    ],
    
    // Path aliases for this package
    aliases: {
        '@atlas-cms/admin': path.resolve(__dirname, 'resources/admin'),
        '@admin': path.resolve(__dirname, 'resources/admin'),
        '@': path.resolve(__dirname, 'resources/admin/js'),
    },
};
```

## Troubleshooting

### Package Not Found

If you see an error that the package is not found:

1. **Check `package.json`**: Ensure `@devcats-atlas/atlas-cms-vue` is listed in dependencies
2. **Run `npm install`**: Make sure dependencies are installed
3. **Check path**: If using `file:` protocol, verify the path is correct
4. **Environment variable**: You can override the path with `ATLAS_CMS_VUE_PATH`

### Resources Not Loading

If resources aren't loading:

1. **Check `vite.config.mjs`**: Ensure the package has a valid `vite.config.mjs` file
2. **Verify file paths**: Check that resource files exist at the specified paths
3. **Check Vite build**: Run `npm run dev` and check for errors in the console

### Aliases Not Working

If aliases aren't resolving:

1. **Check import path**: Ensure you're using the correct alias (e.g., `@admin` not `@/admin`)
2. **Rebuild**: Try running `npm run build` or restarting the dev server
3. **Check alias definition**: Verify aliases are correctly defined in the package's `vite.config.mjs`

## Development

### Local Development Setup

For local development, use the `file:` protocol in `package.json`:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"
  }
}
```

This creates a symlink in `node_modules`, so changes to the package are immediately reflected.

### Building

The package resources are automatically included when you build your main project:

```bash
npm run build
```

## Requirements

This package ships Vue/JavaScript sources and Vite utilities. Its manifest has no standalone build/test scripts or `engines.node` constraint. The consumer owns the build toolchain and must satisfy the engines and peer requirements of its selected Vite plugins.

Package dependencies are declared in `package.json`: Vue `^3.5.44`, `@inertiajs/vue3` `^3.9.1`, CKEditor `^49.0.0`, and `@ckeditor/ckeditor5-vue` `^9.0.0`. Install the matching AtlasCMS backend for the Inertia page/prop contracts.

The current My Atlas CMS integration host requires **Node >=22.12.0** and uses Vite `^8.3.4`, `@vitejs/plugin-vue` `^6.0.10`, Laravel Vite plugin `^3.2.0`, and Tailwind Vite plugin `^4.3.3`. Its Laravel Vite plugin requires Vite 8. These are the tested consumer versions, not independently declared package-wide minimums. Node 18 or a generic Node 20 installation is insufficient for that host.

Use npm from a compatible Node installation and the consumer's lock with `npm ci`. Run `npm run build` from the consumer root; in My Atlas CMS, `node --test tests/Frontend/*.test.mjs` verifies package helpers. The package does not compile TypeScript; AtlasShop's separate browser library uses the host compiler.

## License

[Your License Here]

## Support

For issues and questions, please [create an issue](https://github.com/your-org/atlas-cms-vue/issues).

