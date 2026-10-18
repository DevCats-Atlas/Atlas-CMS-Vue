# Vite integration

The consumer's Vite build compiles this package together with the host's own admin pages and every declared Atlas Vue package. Two functions from `vite-utils.mjs` do the wiring.

## Host configuration

The [host Vite config](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/vite.config.js) uses both:

```js
const { loadAllPackages, atlasPages } = await import('@devcats-atlas/atlas-cms-vue/vite-utils.mjs');
const { inputs, aliases, pageRoots } = await loadAllPackages(projectRoot);

export default defineConfig({
    plugins: [
        atlasPages({ projectRoot, pageRoots }),
        laravel({ input: [...inputs, 'resources/css/site.css'], refresh: true }),
        vue(),
        tailwindcss(),
    ],
    resolve: { alias: aliases },
});
```

| Value | Contents |
| --- | --- |
| `inputs` | Entry files the packages declare: this package's `resources/admin/css/app.css`, `js/app.js` and `js/page-resolver.js` |
| `aliases` | `@admin` → `resources/admin`, `@` → `resources/admin/js`, plus each package's own aliases (AtlasShop-Vue: `@atlasshop/admin`) |
| `pageRoots` | The `resources/admin/Pages` directory of every discovered package, in manifest order |

`atlasPages()` builds two virtual modules from the host's `resources/admin/` and those roots: `virtual:atlas-admin-pages` for [pages](pages.md#page-resolution) and `virtual:atlas-admin-interfaces` for [custom field interfaces](field-interfaces.md#writing-a-custom-interface). Pass `interfaceRoots` to override the interface directories, which default to `Custom/Interfaces` beside each `Pages` directory.

Public-site assets use a separate entry in Laravel's inputs (`resources/css/site.css` above) and the site's own Blade `@vite` directive.

## Package discovery

`loadAllPackages()` reads the consumer `package.json` and loads every declared `@devcats-atlas/*-vue` dependency. Each package supplies a `vite.config.mjs`:

```js
// vite.config.mjs of a Vue package
export default {
    resources: [{ type: 'js', file: 'resources/admin/js/app.js', context: 'admin' }],   // [] for page-only packages
    aliases: { '@reports/admin': path.resolve(__dirname, 'resources/admin') },
};
```

A package path resolves in this order:

1. `{NAME}_PATH` from the Vite process environment, e.g. `ATLAS_CMS_VUE_PATH` or `ATLAS_SHOP_VUE_PATH`. Export it in the shell that starts Vite; a `.env` entry alone is not read.
2. A `file:` dependency in `package.json`.
3. `node_modules/{package}`.

The dependency must stay declared and installed even when an environment path points elsewhere. Adding a Vue package: [package development](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/docs/package-development.md#vue-package).

## Development and production

- `npm run dev` (or `composer dev`) serves pages through Vite. New and removed page or interface files refresh the registry; edits use HMR.
- Restart Vite after changing dependencies, environment paths, plugin options or installed `node_modules`.
- Production serves the built assets: run `npm run build` after every package update or page change.
- The CKEditor chunk (about 980 kB) loads on demand when a WYSIWYG field renders; the host raises `chunkSizeWarningLimit` for it.
