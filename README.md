# AtlasCMS-Vue

The Atlas CMS admin frontend: Vue 3 Inertia pages, layouts, field interfaces, shared components and CSS, plus the Vite utilities that discover Atlas Vue packages and register their pages. It has no build of its own — the Laravel host's Vite compiles it. Backend controllers and props are in AtlasCMS.

## Requirements

Dependencies (installed with the package): Vue `^3.5.44`, `@inertiajs/vue3` `^3.9.1`, `ckeditor5` `^49` and `@ckeditor/ckeditor5-vue` `^9` (loaded on demand by WYSIWYG fields). The host provides the toolchain; Atlas CMS is tested with Node `>=22.12.0`, Vite `^8.3.4`, `@vitejs/plugin-vue` `^6.0.10`, `laravel-vite-plugin` `^3.2.0` and `@tailwindcss/vite` `^4.3.3`. Use the host's lock with `npm ci`.

## Installation

The manifest is `private`, so there is no npm registry release. Install from the Laravel host root in one of three ways (AtlasShop-Vue the same way):

| Source | `package.json` dependency |
| --- | --- |
| Local checkout (`git submodule update --init --recursive` in Atlas CMS) | `"@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"` |
| Git, pinned to a release tag | `npm install '@devcats-atlas/atlas-cms-vue@git+https://github.com/DevCats-Atlas/Atlas-CMS-Vue.git#v1.3.4'` |
| Archive | `npm pack --ignore-scripts --pack-destination <dir>` in the package, then `npm install <dir>/devcats-atlas-atlas-cms-vue-<version>.tgz` |

Commit the host `package-lock.json`; keep an archive at the path recorded in the lock. To build against another checkout without changing `package.json`, export `ATLAS_CMS_VUE_PATH` (or `ATLAS_SHOP_VUE_PATH`) before starting Vite; it must be a process variable, not only in `.env`. The package must still be declared and installed.

## Vite configuration

The host `vite.config.js`:

```javascript
import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { loadAllPackages, atlasPages } = await import('@devcats-atlas/atlas-cms-vue/vite-utils.mjs');
const { inputs, aliases, pageRoots } = await loadAllPackages(__dirname);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const host = env.VITE_DEV_HOST || 'localhost';
    const port = Number.parseInt(env.VITE_DEV_PORT ?? '', 10) || 5174;

    return {
        plugins: [
            atlasPages({ projectRoot: __dirname, pageRoots }),
            laravel({ input: inputs, refresh: true }),
            vue({ template: { transformAssetUrls: { base: null, includeAbsolute: false } } }),
            tailwindcss(),
        ],
        resolve: { alias: aliases },
        build: { chunkSizeWarningLimit: 1024 },   // the CKEditor chunk
        server: { host, port, strictPort: true, cors: true, hmr: { host, port } },
    };
});
```

`loadAllPackages()` reads the host `package.json`, takes every `@devcats/*-vue` and `@devcats-atlas/*-vue` dependency, resolves its directory (environment variable `{NAME}_PATH` → `file:` path → `node_modules`), loads its `vite.config.mjs` and returns the Vite `inputs` (its `resources`), `aliases`, admin `pageRoots` and custom field `interfaceRoots`. The AtlasCMS Blade shell loads the admin entries with `@vite`.

## Page resolution

`atlasPages()` generates the `virtual:atlas-admin-pages` registry that `page-resolver.js` uses; register it for both build and dev. An Inertia name such as `Admin/Orders/Index` maps exactly to `Admin/Orders/Index.vue` under a page root (backslashes are normalized). Priority:

1. host `resources/admin/Pages/` (always included) — add a file with the same name to override a CMS or package page;
2. AtlasCMS-Vue's `resources/admin/Pages/`;
3. other declared Vue dependencies in manifest order (`dependencies`, then `devDependencies`);
4. extra roots you append.

The first exact match wins and only it is imported; imports stay lazy. An unknown name rejects with `Page not found: <name>`. There is no suffix or directory-name matching, and undeclared folders or Composer packages are not scanned. To add one, append its root:

```javascript
atlasPages({ projectRoot: __dirname, pageRoots: [...pageRoots, 'vendor/acme/reports/resources/admin/Pages'] })
```

In dev, adding or removing a page reloads the registry (host overrides included); component edits use HMR. Vite ignores edits inside `node_modules` — restart after changing installed packages, dependency declarations, environment paths or plugin options. Production needs a rebuild after page changes.

## Writing admin pages

Aliases: `@atlas-cms/admin` and `@admin` → `resources/admin`, `@` → `resources/admin/js`.

```vue
<script setup>
import { useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { adminUrl } from '@/utils/adminUrl';
import { useTranslation } from '@/utils/useTranslation';

const props = defineProps({ title: String, moduleHandle: String, rows: Object });
const { t } = useTranslation();
const form = useForm({ name: '' });
const save = () => form.post(adminUrl(`${props.moduleHandle}/create`));
</script>
```

- Build every admin URL with `adminUrl()` (relative to the configured prefix); never hardcode `/admin`.
- Shared props on every page: `auth`, `cmsNavigation`, `flash`, `translations`, `adminLocale`, `availableLanguages`, `adminPrefix`, `atlasVersion`.
- Reuse `AdminLayout`, `ModalDialog`, `ConfirmDialog` / `confirmDialog()`, `useToast()`, the CSS component classes (`.btn-*`, `.form-input`, …) and their `dark:` variants.
- Toasts: call `useToast().showToast({ title, message, intent })`. `AdminLayout` (and `SystemLayout`, which wraps it) renders the only `ToastStack`; a page inside it must not render its own, or every toast shows twice.
- Texts go through `t()` with keys in AtlasCMS `admin.php` (see its `docs/i18n.md`); the host test `tests/Frontend/adminTranslations.test.mjs` rejects untranslated text in templates and UI texts in scripts (menu items, toast titles, prop defaults) of this package.
- Uploads on update: `form.post(url, { forceFormData: true })` with `_method: 'put'`.

### Lists and column settings

The built-in lists share these pieces; custom list pages can import them the same way (`@/` is `resources/admin/js`):

| Import | What it does |
| --- | --- |
| `@/lists/useListSearch.js` | `useListSearch(url, initial, only)` → `{ form, perform, clear }`: the search box, reloading only the list props |
| `@/lists/useSelection.js` | `useSelection(rows, { deletable, allIds, deleteUrl, confirm })` → selection, header checkbox state, `deleteSelected()` (one `DELETE` per row with `{ item_id }`, failed rows stay selected) |
| `@/lists/useExpandedState.js` | `useExpandedState(storageKey)`: expanded tree branches, kept in `sessionStorage` when a key is given |
| `@/lists/useTreeDragDrop.js`, `@/lists/tree.js` | Drag-and-drop state; pure tree helpers (`flatten`, `dropPlacement`, `moveInList`, …) |
| `@/lists/useCreateChild.js` | Inline "add child" forms of a tree list |
| `@/lists/ListToolbar.vue`, `ListSearch.vue`, `ListPagination.vue` | Heading with bulk delete, search box, Laravel paginator links |
| `@/dbTable/listFilters.js`, `@/dbTable/uiConfig.js` | Pure helpers for db_table filters (URL ↔ values, chips) and the `ui_config` JSON |

Column settings of a table (`ui_config`, format in AtlasCMS `docs/db-table.md`) are edited with `UiConfigEditor`, which reads the columns from the given connection and emits the JSON on every change:

```vue
<script setup>
import UiConfigEditor from '@admin/Pages/Admin/System/Modules/components/UiConfigEditor.vue';
</script>

<template>
    <UiConfigEditor
        table-name="venues"
        connection=""
        :initial-ui-config="form.ui_config"
        @update:ui-config="(json) => { form.ui_config = json; }"
    />
</template>
```

Props: `tableName`, `connection` (empty — the default connection), `moduleId` (columns through the module endpoint; without it the generic one), `initialUiConfig` (JSON string or object), `excludeColumns`, and the module-only parts `withFieldGroups` and `withCasts`. It replaces `DataSourceUiBuilder.vue` and `FieldConfigurationBuilder.vue`, removed in 1.3.3.

Custom field interfaces (field type `custom`, setting `interface_path` such as `Posts/Analytics`) come from the `virtual:atlas-admin-interfaces` registry that `atlasPages()` builds with the page rules: host `resources/admin/Custom/Interfaces/` first, then AtlasCMS-Vue (which ships `LanguageLocaleData`), then other declared Vue packages; the first `{interface_path}.vue` wins. Without the `interfaceRoots` option each page root `…/admin/Pages` contributes `…/admin/Custom/Interfaces`; `loadAllPackages()` also returns `interfaceRoots` to pass explicitly. An interface receives `field` and `model` props like the built-in ones.

## Writing a Vue package

A package named `@devcats-atlas/{name}-vue` and declared in the host `package.json` is discovered automatically. Its root needs a `vite.config.mjs` and, for pages, `resources/admin/Pages/`:

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    resources: [],     // Vite entries, e.g. { type: 'css', file: 'resources/admin/css/app.css', context: 'admin' }
    aliases: { '@acme/admin': path.resolve(__dirname, 'resources/admin') },
};
```

List `vite.config.mjs` and `resources/**/*` in the manifest's `files` so Git and archive installs include them; check with `npm pack --dry-run --ignore-scripts --json`. AtlasShop-Vue is the reference.

## Verification

From the Atlas CMS host: `npm run build`, and `node --test tests/Frontend/*.test.mjs` (page registry, package discovery, packing and installing archives, DbTable form model and list filters, `ui_config`, list tree and selection, module settings form, admin translations). The package declares no license. Repository: [Atlas-CMS-Vue](https://github.com/DevCats-Atlas/Atlas-CMS-Vue).
