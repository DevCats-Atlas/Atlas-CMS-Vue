# AtlasCMS-Vue

Independent npm repository: `@devcats-atlas/atlas-cms-vue`. Owns admin Vue pages/layouts, field interfaces, shared UI, CSS, page resolution, and Vite utilities. Backend contracts belong to AtlasCMS.

## Work rules

- Read `README.md` for integration context, then verify behavior in `vite-utils.mjs`, `vite.config.mjs`, and `resources/admin/js/page-resolver.js`.
- Use Vue Composition API with `<script setup>` and JavaScript. Match Inertia props and validation payloads to backend controllers; use `useForm`, `router`, and existing upload method-spoofing patterns.
- Reuse shared layouts, confirmation dialogs, toasts, translation helpers, and CSS component classes. Maintain dark-mode variants.
- DbTable record forms (Create/Edit pages and related-record forms) share `js/dbTable/formModel.js`, `js/composables/useDbTableRecordForm.js` and `DbTable/components/DbTableRecordForm.vue`. Field shapes come from AtlasCMS `DbTableFormBuilder`; `options` is always an array. Cover `formModel.js` changes in host `tests/Frontend/dbTableFormModel.test.mjs`.
- Field interfaces live under `resources/admin/Pages/Admin/Modules/Default/components/interfaces/`; inspect their registry before adding a field type. Coordinate metadata and persistence with AtlasCMS.
- Aliases `@atlas-cms/admin` / `@admin` point to this package's admin directory; `@` points to its admin JS directory.
- For page discovery/overrides, read README's Page Resolution contract. Preserve the `atlasPages()` registry priority: host → CMS → other declared Vue dependencies → explicit extra roots, exact names and lazy imports.
- `loadAllPackages()` discovers dependency names and computes environment variables such as `ATLAS_CMS_VUE_PATH`. Preserve environment → `file:` path → `node_modules` resolution.
- Pass the selected package `pageRoots` from `loadAllPackages()` to the consumer plugin; coordinate registry/runtime changes with host Vite configuration and packaging. Test local, npm, external and symlink sources plus dev additions/removals.
- This manifest has no build/test scripts and is marked private. The Laravel consumer performs bundling.

Admin URLs use `adminUrl()` from `@/utils/adminUrl`, backed by the shared Inertia `adminPrefix` prop. Pass paths relative to the admin prefix. Use `adminModuleHandle()` for module extraction; do not hardcode `/admin` in links, form endpoints, or path parsing.

## Verification and Git

In Atlas CMS, run `npm run build` from the host root. For visible UI changes also verify the affected screen, validation, navigation, and dark mode when a running host is available. In a separate clone, use a consumer configured with these Vite utilities; do not invent a package-local build command.

Inspect this repository's Git status separately. Commit/push only on explicit request.

## Reference

Installation, Vite integration, page resolution and aliases: [README.md](README.md). Stack: Vue 3 `<script setup>`, Inertia, Tailwind CSS 4, CKEditor 5 (loaded on demand), Vite through the host.

### Layout of `resources/admin/`

| Path | Contents |
| --- | --- |
| `js/app.js`, `js/page-resolver.js` | Inertia entry; pages come from the `virtual:atlas-admin-pages` registry |
| `js/components/`, `js/composables/`, `js/utils/` | ConfirmDialog, ToastStack, WysiwigEditor; `useToast`, `useDbTableRecordForm`; `adminUrl`, `adminPath`, `confirmDialog`, `useTranslation` |
| `js/dbTable/formModel.js` | Pure DbTable form helpers (Node-tested) |
| `Layouts/` | `AdminLayout` (sidebar from `cmsNavigation`, dark mode toggle), `SystemLayout` |
| `Pages/Admin/Modules/Default/` | Items modules: tree list, drag & drop, bulk delete, tabbed edit form, field interfaces |
| `Pages/Admin/Modules/DbTable/` | Table modules: filters, tree, sorting, relationship manager, `DbTableRecordForm` |
| `Pages/Admin/System/`, `Pages/Admin/Users/`, `Pages/Auth/` | System screens, users, login |
| `Custom/Interfaces/` | Package custom field interfaces (`{ "type": "custom", "interface_path": "Posts/Analytics" }`); the `virtual:atlas-admin-interfaces` registry (`page-registry.mjs`) puts host interfaces first |
| `css/app.css` | Component classes (`.btn-*`, `.form-input`, tables, modals) with `dark:` variants |

### Field interfaces

`Pages/Admin/Modules/Default/components/interfaces/index.js` maps types: `text`, `textarea`, `wysiwyg`, `file`, `date`/`datetime`/`datetime-local`, `select`, `checkbox`, `children`, `categories`, `product_attributes`, `custom`. An interface receives `field` and `model` props and writes `model.default` (or `model.translations[lang]`); file interfaces set `model.delete_default` when a stored file is cleared.

### Inertia patterns

- Forms: `useForm()`; uploads on update post with `forceFormData: true` and `_method: 'put'`.
- Lists: `router.get(url, query, { preserveState: true, preserveScroll: true, only: [...] })`.
- Shared props: `auth`, `cmsNavigation`, `flash`, `translations`, `adminLocale`, `availableLanguages`, `adminPrefix`; Items forms also get content `languages`.
- Validation is server-driven through `form.errors`.
