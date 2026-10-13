# AtlasCMS-Vue

Independent npm repository: `@devcats-atlas/atlas-cms-vue`. Owns admin Vue pages/layouts, field interfaces, shared UI, CSS, page resolution, and Vite utilities. Backend contracts belong to AtlasCMS.

## Work rules

- Read `README.md` for integration context, then verify behavior in `vite-utils.mjs`, `vite.config.mjs`, and `resources/admin/js/page-resolver.js`.
- Use Vue Composition API with `<script setup>` and JavaScript. Match Inertia props and validation payloads to backend controllers; use `useForm`, `router`, and existing upload method-spoofing patterns.
- Reuse shared layouts, confirmation dialogs, toasts, translation helpers, and CSS component classes. Maintain dark-mode variants.
- Field interfaces live under `resources/admin/Pages/Admin/Modules/Default/components/interfaces/`; inspect their registry before adding a field type. Coordinate metadata and persistence with AtlasCMS.
- Aliases `@atlas-cms/admin` / `@admin` point to this package's admin directory; `@` points to its admin JS directory.
- The page resolver's first glob is `../Pages/**/*.vue` relative to its JS file. It is not a host `resources/admin/Pages` override glob. Verify all static patterns and lookup order when changing discovery.
- `loadAllPackages()` discovers dependency names and computes environment variables such as `ATLAS_CMS_VUE_PATH`. Preserve environment → `file:` path → `node_modules` resolution.
- Static npm page globs enumerate known packages; a newly discovered Vite package does not automatically gain an npm page glob.
- This manifest has no build/test scripts and is marked private. The Laravel consumer performs bundling.

## Verification and Git

In My Atlas CMS, run `npm run build` from the host root. For visible UI changes also verify the affected screen, validation, navigation, and dark mode when a running host is available. In a separate clone, use a consumer configured with these Vite utilities; do not invent a package-local build command.

Inspect this repository's Git status separately. Commit/push only on explicit request.
