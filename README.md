# AtlasCMS-Vue

Admin Inertia pages, layouts, field interfaces and Vite utilities. AtlasCMS supplies controllers and props; the Laravel host builds this package. Dependencies are in [package.json](package.json).

## Installation

The host uses `"@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"`. Initialize submodules, then run `npm ci` and `npm run build` from the host. The package is private and has no standalone build or npm registry release.

To use another checkout, export `ATLAS_CMS_VUE_PATH` before starting Vite. It must be a process variable, not only a value in `.env`; the package must still be declared and installed.

## Vite integration

The [host config](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/vite.config.js) loads `loadAllPackages()` and `atlasPages()` from `@devcats-atlas/atlas-cms-vue/vite-utils.mjs`:

```js
const { inputs, aliases, pageRoots } = await loadAllPackages(projectRoot);
// Pass inputs to laravel({ input: inputs }), aliases to resolve.alias,
// and register atlasPages({ projectRoot, pageRoots }) alongside vue() and tailwindcss().
```

`loadAllPackages()` discovers declared `@devcats-atlas/*-vue` and `@devcats/*-vue` dependencies. Paths resolve from `{NAME}_PATH` → `file:` dependency → `node_modules`. Each package's `vite.config.mjs` supplies entries and aliases; the loader also returns `pageRoots` and `interfaceRoots`.

To add public-site assets, create a host entry such as `resources/frontend/js/app.js`, append it to the Laravel plugin's `input`, and load it from the site's Blade layout with `@vite`. Admin entries remain in this package. The demo shop serves AtlasShop's published assets.

## Page resolution

`atlasPages()` generates `virtual:atlas-admin-pages`. The Inertia name `Admin/Reports/Index` matches `Admin/Reports/Index.vue` exactly under these roots, in order:

1. Host `resources/admin/Pages/` — same-name files override package pages.
2. AtlasCMS-Vue `resources/admin/Pages/`.
3. Other declared Vue dependencies, in manifest order.
4. Explicit extra roots passed in `pageRoots`.

The first match wins; imports are lazy. Unknown names reject with `Page not found: <name>`. Undeclared directories and Composer packages are not scanned; append their page root explicitly when needed.

Adding or removing pages refreshes the registry in dev; component edits use HMR. Restart Vite after changing dependencies, environment paths, plugin options or installed files inside `node_modules`. Production changes need a rebuild.

## Writing admin pages

Aliases: `@admin` / `@atlas-cms/admin` → this package's `resources/admin`; `@` → `resources/admin/js`.

- Use Vue `<script setup>`, JavaScript and Inertia `useForm()`; validation comes from `form.errors`.
- Build URLs with `adminUrl()` from `@/utils/adminUrl`; pass paths relative to the configured admin prefix.
- Use `AdminLayout` or `SystemLayout`, shared dialogs and `.btn-*` / `.form-input` CSS classes with dark variants.
- Call `useToast().showToast({ title, message, intent })`; `AdminLayout` renders the only `ToastStack`.
- Texts use `t()` from `@/utils/useTranslation`; keys belong in AtlasCMS `admin.php` ([translations](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/i18n.md)).
- Upload updates use `form.post(url, { forceFormData: true })` with `_method: 'put'` in the form.

Shared props: `auth`, `cmsNavigation`, `flash`, `translations`, `adminLocale`, `availableLanguages`, `adminPrefix`, `atlasVersion`. Items forms additionally receive content `languages`. Child modals keep the originating module, submit `parent_id` and `field_id`, and open newly created records from `flash.created_item_id`. Their forms render outside the parent form and stop submit propagation.

### Shared form and list code

| Path under `resources/admin/js/` | Responsibility |
| --- | --- |
| `lists/` | Search, selection, expanded state, tree drag-and-drop, child creation; toolbar/search/pagination components |
| `dbTable/formModel.js`, `dbTable/recordTransport.js`, `composables/useDbTableRecordForm.js` | Module and related-record payloads, multipart and method spoofing; rendered by `DbTableRecordForm.vue` |
| `composables/useRelationshipOptions.js` | Module-scoped relationship options, debounced search and stale-response protection |
| `dbTable/listFilters.js`, `dbTable/uiConfig.js` | Filter URL values and column configuration |
| `modules/` | Module settings model and data-source state |
| `localeData.js` | Language JSON parsing and editing |

Column settings use `Pages/Admin/System/Modules/components/UiConfigEditor.vue`:

```vue
<UiConfigEditor
    table-name="venues"
    connection=""
    :initial-ui-config="form.ui_config"
    @update:ui-config="form.ui_config = $event"
/>
```

DbTable related forms submit independently in teleported modals. Option endpoints return `{id, label}`; related lists supply `record_key` so selections and editing use the related table’s key.

DbTable cast previews render plain text with preserved line breaks; HTML and links in templates are shown literally.

`connection=""` means the default connection. Optional props: `moduleId`, `excludeColumns`, `withFieldGroups`, `withCasts`. The emitted JSON follows the [DbTable contract](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/db-table.md#dbtable-ui-json-contract).

### Field interfaces

Built-ins are registered in `Pages/Admin/Modules/Default/components/interfaces/index.js`. Interfaces receive `field` and `model`; write `model.default` or `model.translations[lang]`. File interfaces set `model.delete_default` when clearing a stored file.

The host owns the example interface; Shop supplies `Shop/ProductAttributes` through AtlasShop-Vue.

For type `custom`, `interface_path: 'Posts/Analytics'` selects `Custom/Interfaces/Posts/Analytics.vue`. The `virtual:atlas-admin-interfaces` registry uses the same host-first priority as pages. Roots default to `Custom/Interfaces` beside each `Pages` directory; `interfaceRoots` can be passed explicitly.

## Verification

From the host: `node --test tests/Frontend/*.test.mjs` and `npm run build`. Node tests cover helpers, translation literals and package/page discovery; interactive behavior still needs a browser check.
