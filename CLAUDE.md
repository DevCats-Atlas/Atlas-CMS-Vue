# CLAUDE.md — AtlasCMS-Vue Package

Admin panel Vue frontend for Atlas CMS: pages, layouts, field interfaces, composables, and Vite build utilities.

## Tech Stack

Vue 3 Composition API, Inertia.js, Tailwind CSS 4, CKEditor 5, Vite

## Architecture

### Page Resolver (`page-resolver.js`)

Dynamically loads Vue pages for Inertia with a priority-based auto-discovery system:

1. **Main CMS pages** (`../Pages/**/*.vue`) — project-level overrides
2. **Local dev packages** (`../../../../*-Vue/resources/admin/Pages/**/*.vue`) — sibling packages in `packages/`
3. **npm packages** — hardcoded globs for stable packages
4. **Vendor packages** (`../../../../../vendor/*/*/resources/admin/Pages/**/*.vue`)

First match wins. This lets the main app override any package page by placing a file at the same path.

### Vite Utils (`vite-utils.mjs`)

`loadAllPackages()` auto-discovers `@devcats/*-vue` and `@devcats-atlas/*-vue` packages from `package.json`, loads each package's `vite.config.mjs`, and aggregates all inputs (CSS/JS entry points) and aliases.

**Package resolution order:** environment variable → `file:` path from package.json → `node_modules`

### Module Page Types

**Default** (`Pages/Admin/Modules/Default/`) — for items-based modules (polymorphic `items` table):
- Tree view with expand/collapse, drag & drop reordering, multi-select bulk delete
- Edit form with tab system: default fields + dynamic custom field tabs
- Multilingual field support per language

**DbTable** (`Pages/Admin/Modules/DbTable/`) — for direct database table modules:
- Filter system (search, field-specific, relationship filters)
- Tree structure support, drag & drop reordering
- Relationship manager (N:M with inline create/edit)
- Field groups, read-only fields, wide layout option

### Interface System

Built-in field interfaces in `Pages/Admin/Modules/Default/components/interfaces/`:

| Interface | Type keys |
|-----------|-----------|
| `TextInterface` | `text` |
| `TextareaInterface` | `textarea` |
| `WysiwygInterface` | `wysiwyg` |
| `FileInterface` | `file` |
| `DateInterface` | `date`, `datetime`, `datetime-local` |
| `SelectInterface` | `select` |
| `CheckboxInterface` | `checkbox` |
| `ChildrenInterface` | `children` |
| `CategoriesInterface` | `categories` |
| `ProductAttributesInterface` | `product_attributes` |

**Custom interfaces** are auto-discovered from `Custom/Interfaces/` via glob. Use type `custom` with `interface_path` in field config:
```json
{ "type": "custom", "interface_path": "Posts/Analytics" }
```
This resolves to `Custom/Interfaces/Posts/Analytics.vue`.

### Layout System

**`AdminLayout.vue`** — main admin layout with collapsible sidebar, navigation groups (from `cmsNavigation` shared prop), theme toggle (dark mode via `.dark` class + localStorage), and mobile overlay.

**`SystemLayout.vue`** — wraps AdminLayout with system-specific navigation (Overview, CMS Menu, Modules, Access Roles, Item Types).

## Directory Layout

```
resources/admin/
├── css/app.css                          # Tailwind component classes (.btn, .form-input, etc.)
├── js/
│   ├── app.js                           # Inertia app entry point
│   ├── bootstrap.js                     # Axios setup
│   ├── page-resolver.js                 # Dynamic page auto-discovery
│   ├── components/                      # Global components (ConfirmDialog, ModalDialog, ToastStack, Toggle, WysiwigEditor)
│   ├── composables/useToast.js          # Toast notification system
│   └── utils/
│       ├── confirmDialog.js             # Promise-based confirm dialogs
│       └── useTranslation.js            # i18n via Inertia shared props
├── Layouts/
│   ├── AdminLayout.vue                  # Main admin layout
│   └── SystemLayout.vue                 # System section layout
├── Pages/
│   ├── Admin/
│   │   ├── Dashboard.vue
│   │   ├── AccessDenied.vue
│   │   ├── Modules/
│   │   │   ├── Default/                 # Items-based module pages
│   │   │   ├── DbTable/                 # Database table module pages
│   │   │   └── components/CustomButtons.vue
│   │   ├── System/                      # System admin pages
│   │   └── Users/
│   └── Auth/Login.vue
└── Custom/Interfaces/                   # Custom field interface components
```

## Key Files

| File | Role |
|------|------|
| `app.js` | Creates Inertia app, registers page resolver, mounts Vue |
| `page-resolver.js` | Auto-discovers Vue pages from main app + all packages |
| `vite-utils.mjs` | Package auto-discovery, alias/input aggregation for Vite |
| `vite.config.mjs` | Package resource and alias definitions |
| `AdminLayout.vue` | Main layout — sidebar, navigation, theme toggle |
| `interfaces/index.js` | Interface component registry + custom interface resolver |
| `app.css` | Tailwind component layer — buttons, forms, tables, modals, pagination |

## Inertia Patterns

```javascript
// Form handling
import { useForm } from '@inertiajs/vue3';
const form = useForm({ title: '', visible: true });
form.post('/admin/posts', { preserveScroll: true });

// File uploads — use forceFormData + _method transform
form.transform((data) => ({ ...data, _method: 'put' }));
form.post('/admin/edit', { forceFormData: true });

// Navigation with partial reloads
import { router } from '@inertiajs/vue3';
router.get('/admin/posts', { search: 'query' }, {
    preserveState: true, preserveScroll: true, only: ['items', 'pagination']
});

// Shared props
import { usePage } from '@inertiajs/vue3';
const page = usePage();
// Available: page.props.auth, page.props.cmsNavigation, page.props.flash,
//            page.props.translations, page.props.languages
```

## Conventions

- `<script setup>` in all Vue components — no Options API
- No TypeScript — plain JavaScript with JSDoc where helpful
- Page naming: `Admin/[Module]/[Action].vue` (e.g., `Admin/Modules/Default/Edit.vue`)
- Form validation via Inertia's `form.errors` object (server-driven, not client-side)
- CSS component classes defined in `app.css` (`@layer components`) — use `.btn-primary`, `.form-input`, etc. instead of inline Tailwind for repeated patterns
- Dark mode: class-based (`.dark` on `<html>`), use Tailwind's `dark:` variant
- Aliases: `@atlas-cms/admin` → package admin root, `@` → package `js/` directory

## Common Patterns

**Adding a new page:**
1. Create `.vue` file in `Pages/Admin/` following the naming convention
2. Use `<script setup>` with `defineProps()` for Inertia page props
3. Wrap content in `<AdminLayout>` or `<SystemLayout>`
4. Backend controller renders via `Inertia::render('Admin/YourPage', $props)`
5. Page resolver auto-discovers it — no registration needed

**Adding a custom field interface:**
1. Create `.vue` component in `Custom/Interfaces/` (e.g., `Custom/Interfaces/MyWidget.vue`)
2. Accept `field` and `model` props — bind to `model.default` (or `model.translations[lang]` for multilingual)
3. Set field config: `{ "type": "custom", "interface_path": "MyWidget" }`

**Adding a composable:**
1. Create in `js/composables/` with `use` prefix (e.g., `useMyFeature.js`)
2. Export a function returning reactive state and methods
3. Import via `@/composables/useMyFeature`

**Using toasts:**
```javascript
import { useToast } from '@/composables/useToast';
const { showToast } = useToast();
showToast({ title: 'Saved', message: 'Item updated', intent: 'success' });
```

**Using confirm dialogs:**
```javascript
import { confirmDialog } from '@/utils/confirmDialog';
const confirmed = await confirmDialog({ title: 'Delete?', message: 'This cannot be undone', intent: 'danger' });
```
