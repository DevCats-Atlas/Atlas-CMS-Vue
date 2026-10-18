# AtlasCMS-Vue

Owns admin Vue screens and Vite integration; backend contracts belong to AtlasCMS. Inspect this repository's Git status separately; commit/push only on explicit request.

## Work rules

- Read the guides before changing their area: [Vite integration](docs/vite-integration.md), [pages](docs/pages.md), [components](docs/components.md), [field interfaces](docs/field-interfaces.md). Adding, removing a page or changing its `defineProps()` means updating the [built-in pages](docs/pages.md#built-in-pages) table; host `tests/Frontend/docsExamples.test.mjs` compares them. Use `<script setup>`, JavaScript, Inertia forms and existing CSS classes with dark variants.
- Pair props, field metadata and validation payloads with AtlasCMS. Reuse layouts, dialogs, translations and `useToast()`; `AdminLayout` owns the only `ToastStack`.
- URLs use `adminUrl()` with relative paths; extract module handles with `adminModuleHandle()`. Preserve configurable prefixes.
- Main and related DbTable forms share `js/dbTable/formModel.js`, `recordTransport.js`, `js/composables/useDbTableRecordForm.js` and `DbTableRecordForm.vue`. Fields carry `options` as an array. Test model changes in host `tests/Frontend/dbTableFormModel.test.mjs`.
- Inspect the field-interface registry before adding types. File updates use multipart POST with `_method=put`; child forms retain the originating module and parent/field context.
- For Vite changes inspect `vite-utils.mjs`, `page-registry.mjs` and the host config together. Preserve environment → file dependency → node_modules resolution, host-first registry priority and lazy imports. Pass selected `pageRoots` into `atlasPages()`; cover external/symlink sources and dev additions/removals.

## Verification

From the host: `node --test tests/Frontend/*.test.mjs` and `npm run build`. For visible changes check the screen, validation, navigation and dark mode in a running host. This private package has no standalone build/test scripts.
