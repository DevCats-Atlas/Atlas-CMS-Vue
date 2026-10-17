# AtlasCMS-Vue

Admin Inertia pages, layouts, field interfaces and Vite utilities. [AtlasCMS](../AtlasCMS/README.md) supplies controllers and props; the Laravel host builds this package.

## Requirements

The AtlasCMS backend of the same release. The consumer's Vite toolchain builds the pages: declare `vite`, `laravel-vite-plugin`, `@vitejs/plugin-vue`, `tailwindcss` and `@tailwindcss/vite` in the consumer (versions: [host package.json](../../package.json)). `vue`, `@inertiajs/vue3` and CKEditor are this package's own dependencies. There is no package-local build or test script.

## Installation

The manifest is `private`, so there is no registry release. Declare one source in the consumer `package.json` and run `npm install`:

| Source | `dependencies` entry | Use |
| --- | --- | --- |
| Git tag | `"@devcats-atlas/atlas-cms-vue": "git+https://github.com/DevCats-Atlas/Atlas-CMS-Vue.git#v1.3.4"` | Projects on a release; use the tag of the installed Composer packages |
| Local checkout | `"@devcats-atlas/atlas-cms-vue": "file:./packages/AtlasCMS-Vue"` | Package development; this host uses the submodule |
| Archive | `"@devcats-atlas/atlas-cms-vue": "file:./devcats-atlas-atlas-cms-vue-1.3.4.tgz"` from `npm pack` | Offline installs |

A Git tag is not a semver range: change it together with `composer update 'devcats-atlas/*' -W` and rebuild. In this host a missing `file:` source falls back to the Git tag pinned in `scripts/install-packages-fallback.js`; initialize submodules first. Then add the Vite plugins below and run `npm run build`.

## Vite integration

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

Aliases: `@admin` → `resources/admin`; `@` → `resources/admin/js`.

- Use `<script setup>`, JavaScript, Inertia `useForm()` and `form.errors`.
- Build URLs with `adminUrl()` from `@/utils/adminUrl`, passing paths relative to the admin prefix.
- Reuse `AdminLayout` / `SystemLayout`, dialogs and `.btn-*` / `.form-input` classes with dark variants.
- `useToast().showToast({ title, message, intent })` uses the single `ToastStack` in `AdminLayout`.
- Use `t()` from `@/utils/useTranslation`; [translation keys](../AtlasCMS/docs/i18n.md) belong in AtlasCMS.
- Upload updates use multipart POST with `_method: 'put'`. Child forms retain module, `parent_id` and `field_id`; render them outside the parent form and stop submit propagation. `flash.created_item_id` opens a new child.

Shared props under the admin prefix: `auth`, `cmsNavigation` (empty for guests), `flash`, `translations`, `adminLocale`, `availableLanguages`, `adminPrefix`, `atlasVersion`. Pages outside the prefix do not receive them. Items forms additionally receive content `languages`.

| Under `resources/admin/js/` | Responsibility |
| --- | --- |
| `lists/` | Search, selection, expanded state, tree dragging, child creation, pagination |
| `dbTable/formModel.js`, `dbTable/recordTransport.js`, `composables/useDbTableRecordForm.js` | Main/related form state and multipart transport; rendered by `DbTableRecordForm.vue` |
| `composables/useRelationshipOptions.js` | Scoped options, debounced search, stale-response protection |
| `dbTable/listFilters.js`, `dbTable/uiConfig.js` | Filter query values and column settings |
| `modules/`, `localeData.js` | Module settings and language JSON |

Column settings use `UiConfigEditor.vue` (`Pages/Admin/System/Modules/components/`): pass `table-name`, `connection` (empty = default), `initial-ui-config`; store `update:ui-config`. Optional props: `moduleId`, `excludeColumns`, `withFieldGroups`, `withCasts`. JSON follows the [DbTable contract](../AtlasCMS/docs/db-table.md#dbtable-ui-json-contract).

Backend contracts: [DbTable forms, filters and relationships](../AtlasCMS/docs/db-table.md), [button responses](../AtlasCMS/docs/buttons.md), [session errors and access](../AtlasCMS/docs/access.md). Related forms use independent teleported modals; cast previews are plain text. Child lists/galleries save drag order immediately, show a toast and reload saved order on validation failure.

### Field interfaces

Built-ins are registered in `Pages/Admin/Modules/Default/components/interfaces/index.js`. They receive `field` and `model`; write `model.default` or `model.translations[lang]`. Files use `model.delete_default` to clear a stored file.

For `custom`, `interface_path: 'Posts/Analytics'` selects `Custom/Interfaces/Posts/Analytics.vue` from `virtual:atlas-admin-interfaces`, with the same priority as pages. Roots default beside each `Pages` directory; override with `interfaceRoots`. The host's `Custom/Interfaces/Example.vue` is an extension example.

## Verification

[Host verification](../../README.md#testing): `node --test tests/Frontend/*.test.mjs` and `npm run build`. Screen interaction, dragging and dark mode need browser checks.
