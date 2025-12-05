# AtlasCMS-Vue

Vue.js frontend package for AtlasCMS admin panel. Provides Vue components, Inertia.js pages, and all frontend assets for the CMS admin interface.

## Installation

### Option 1: npm Package (Production)

```bash
npm install @devcats-atlas/atlas-cms-vue
```

### Option 2: Local Development

```bash
npm install ./packages/AtlasCMS-Vue
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"
  }
}
```

Then run:

```bash
npm install
```

### Option 3: Environment Variable (CI/CD)

```bash
export ATLASCMSVUE_PATH=/path/to/atlas-cms-vue
```

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
const { loadAllPackages } = utils;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parsePort = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// Load all packages automatically from package.json
const { inputs, aliases } = await loadAllPackages(__dirname);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const host = env.VITE_DEV_HOST || 'localhost';
    const port = parsePort(env.VITE_DEV_PORT, 5174);

    return {
        plugins: [
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

Make sure `@devcats-atlas/atlas-cms-vue` is listed in your `package.json` dependencies:

```json
{
  "dependencies": {
    "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"
  }
}
```

### How It Works

1. **Automatic Discovery**: The `loadAllPackages()` function reads your `package.json` and automatically finds all `@devcats/*-vue` packages.

2. **Package Resolution**: Each package is resolved using this priority:
   - Environment variable (e.g., `ATLASCMSVUE_PATH`)
   - Path from `package.json` (for `file:` protocol)
   - npm package in `node_modules`

3. **Config Loading**: Each package's `vite.config.mjs` file is automatically loaded, which defines:
   - Resource files (CSS, JS) to include in the build
   - Path aliases for imports

4. **Automatic Integration**: All resources and aliases are automatically added to your Vite configuration.

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

To add more Vue packages (e.g., `@devcats-atlas/atlas-shop-vue`):

1. **Install the package**:
   ```bash
   npm install @devcats-atlas/atlas-shop-vue
   ```

2. **Add to `package.json`**:
   ```json
   {
     "dependencies": {
       "@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue",
       "@devcats-atlas/atlas-shop-vue": "file:./packages/AtlasShop-Vue"
     }
   }
   ```

3. **That's it!** The `loadAllPackages()` function will automatically discover and load it.

Each package must have a `vite.config.mjs` file that exports its resources and aliases.

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
4. **Environment variable**: You can override the path with `ATLASCMSVUE_PATH`

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

- Node.js 18+
- npm 9+
- Vite 5+
- Laravel Vite Plugin 2+
- Vue 3+

## License

[Your License Here]

## Support

For issues and questions, please [create an issue](https://github.com/your-org/atlas-cms-vue/issues).

