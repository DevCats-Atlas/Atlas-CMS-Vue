# AtlasCMS-Vue

Admin Inertia pages, layouts, field interfaces and Vite utilities. [AtlasCMS](../AtlasCMS/README.md) supplies controllers and props; the Laravel host builds this package.

## Vite integration

The host declares `"@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"`. After initializing submodules, run `npm ci` and `npm run build` from the host. There is no package-local build.

[Host Vite config](../../vite.config.js) imports `loadAllPackages()` and `atlasPages()` from this package's `vite-utils.mjs`:

```js
const { inputs, aliases, pageRoots } = await loadAllPackages(projectRoot);
// inputs → laravel({ input: inputs }); aliases → resolve.alias
// Add atlasPages({ projectRoot, pageRoots }) alongside vue() and tailwindcss().
```

The loader discovers declared `@devcats-atlas/*-vue` and `@devcats/*-vue` dependencies. Paths resolve from `{NAME}_PATH` → `file:` dependency → `node_modules`; each package supplies `vite.config.mjs`. To use another CMS checkout, export `ATLAS_CMS_VUE_PATH` in the Vite process environment; a `.env` entry alone is insufficient. The dependency must remain declared and installed.

Public-site assets use a separate host entry in Laravel's Vite inputs and the site's Blade `@vite` directive.

## Page resolution

`atlasPages()` creates `virtual:atlas-admin-pages`. `Admin/Reports/Index` matches `Admin/Reports/Index.vue` exactly, with lazy imports and first-match priority:

1. Host `resources/admin/Pages/`.
2. This package's `resources/admin/Pages/`.
3. Other declared Vue dependencies, in manifest order.
4. Explicit extra `pageRoots`.

Unknown names reject with `Page not found: <name>`. Undeclared/Composer packages need explicit roots. Dev additions/removals refresh the registry; edits use HMR. Restart Vite for dependency, environment, plugin-option or installed `node_modules` changes. Production needs a rebuild.

## Writing admin pages

Aliases: `@admin` / `@atlas-cms/admin` → `resources/admin`; `@` → `resources/admin/js`.

- Use `<script setup>`, JavaScript, Inertia `useForm()` and `form.errors`.
- Build URLs with `adminUrl()` from `@/utils/adminUrl`, passing paths relative to the admin prefix.
- Reuse `AdminLayout` / `SystemLayout`, dialogs and `.btn-*` / `.form-input` classes with dark variants.
- `useToast().showToast({ title, message, intent })` uses the single `ToastStack` in `AdminLayout`.
- Use `t()` from `@/utils/useTranslation`; [translation keys](../AtlasCMS/docs/i18n.md) belong in AtlasCMS.
- Upload updates use multipart POST with `_method: 'put'`. Child forms retain module, `parent_id` and `field_id`; render them outside the parent form and stop submit propagation. `flash.created_item_id` opens a new child.

Shared props: `auth`, `cmsNavigation`, `flash`, `translations`, `adminLocale`, `availableLanguages`, `adminPrefix`, `atlasVersion`. Items forms additionally receive content `languages`.

| Under `resources/admin/js/` | Responsibility |
| --- | --- |
| `lists/` | Search, selection, expanded state, tree dragging, child creation, pagination |
| `dbTable/formModel.js`, `dbTable/recordTransport.js`, `composables/useDbTableRecordForm.js` | Main/related form state and multipart transport; rendered by `DbTableRecordForm.vue` |
| `composables/useRelationshipOptions.js` | Scoped options, debounced search, stale-response protection |
| `dbTable/listFilters.js`, `dbTable/uiConfig.js` | Filter query values and column settings |
| `modules/`, `localeData.js` | Module settings and language JSON |

Column settings use `UiConfigEditor.vue` (`Pages/Admin/System/Modules/components/`): pass `table-name`, `connection` (empty = default), `initial-ui-config`; store `update:ui-config`. Optional props: `moduleId`, `excludeColumns`, `withFieldGroups`, `withCasts`. JSON follows the [DbTable contract](../AtlasCMS/docs/db-table.md#dbtable-ui-json-contract).

Clearing filters retains empty range objects, so date/numeric inputs remain usable while navigation is pending. Apply and Clear All remain available when global search is disabled. Record buttons require JSON with boolean `success` and an optional string `message`; malformed responses show an error.

Related forms use independent teleported modals. Options contain `{id, label}`; related lists supply `record_key`. Cast previews display plain text, including literal HTML.

Children lists and galleries save drag order immediately. If validation rejects the reorder, they show an error toast and reload the saved order.

### Field interfaces

Built-ins are registered in `Pages/Admin/Modules/Default/components/interfaces/index.js`. They receive `field` and `model`; write `model.default` or `model.translations[lang]`. Files use `model.delete_default` to clear a stored file.

For `custom`, `interface_path: 'Posts/Analytics'` selects `Custom/Interfaces/Posts/Analytics.vue` from `virtual:atlas-admin-interfaces`, with the same priority as pages. Roots default beside each `Pages` directory; override with `interfaceRoots`. The host's `Custom/Interfaces/Example.vue` is an extension example.

## Verification

From the host: `node --test tests/Frontend/*.test.mjs` and `npm run build`. Helpers/contracts are automated; screen interaction, dragging and dark mode need browser verification.
