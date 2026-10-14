# AtlasCMS-Vue

Independent npm repository: `@devcats-atlas/atlas-cms-vue`. Owns admin Vue pages/layouts, field interfaces, shared UI, CSS, page resolution, and Vite utilities. Backend contracts belong to AtlasCMS.

## Work rules

- Read `README.md` for integration context, then verify behavior in `vite-utils.mjs`, `vite.config.mjs`, and `resources/admin/js/page-resolver.js`.
- Use Vue Composition API with `<script setup>` and JavaScript. Match Inertia props and validation payloads to backend controllers; use `useForm`, `router`, and existing upload method-spoofing patterns.
- Reuse shared layouts, confirmation dialogs, toasts, translation helpers, and CSS component classes. Maintain dark-mode variants.
- Field interfaces live under `resources/admin/Pages/Admin/Modules/Default/components/interfaces/`; inspect their registry before adding a field type. Coordinate metadata and persistence with AtlasCMS.
- Aliases `@atlas-cms/admin` / `@admin` point to this package's admin directory; `@` points to its admin JS directory.
- For page discovery/overrides, read README's Page Resolution contract. Preserve the `atlasPages()` registry priority: host → CMS → other declared Vue dependencies → explicit extra roots, exact names and lazy imports.
- `loadAllPackages()` discovers dependency names and computes environment variables such as `ATLAS_CMS_VUE_PATH`. Preserve environment → `file:` path → `node_modules` resolution.
- Pass the selected package `pageRoots` from `loadAllPackages()` to the consumer plugin; coordinate registry/runtime changes with host Vite configuration and packaging. Test local, npm, external and symlink sources plus dev additions/removals.
- This manifest has no build/test scripts and is marked private. The Laravel consumer performs bundling.

Admin URLs use `adminUrl()` from `@/utils/adminUrl`, backed by the shared Inertia `adminPrefix` prop. Pass paths relative to the admin prefix. Use `adminModuleHandle()` for module extraction; do not hardcode `/admin` in links, form endpoints, or path parsing.

## Verification and Git

In My Atlas CMS, run `npm run build` from the host root. For visible UI changes also verify the affected screen, validation, navigation, and dark mode when a running host is available. In a separate clone, use a consumer configured with these Vite utilities; do not invent a package-local build command.

Inspect this repository's Git status separately. Commit/push only on explicit request.
