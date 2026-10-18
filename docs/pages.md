# Pages

An admin page is a Vue component that a controller renders by its Inertia name: `inertia('Admin/Reports/Index', $props)` opens `Admin/Reports/Index.vue`. AtlasCMS and other packages render the [built-in pages](#built-in-pages); host and package controllers render their own.

## Page resolution

`atlasPages()` ([Vite integration](vite-integration.md)) creates `virtual:atlas-admin-pages`. A name matches a `.vue` path exactly, with lazy imports and first-match priority:

1. Host `resources/admin/Pages/`.
2. This package's `resources/admin/Pages/`.
3. Other declared Vue packages, in manifest order.
4. Explicit extra `pageRoots`.

Unknown names reject with `Page not found: <name>`. Undeclared and Composer-only packages need explicit roots. In development new and removed files refresh the registry; restart Vite for dependency, environment, plugin-option or installed `node_modules` changes. Production needs a rebuild.

## Writing a page

Aliases: `@admin` → `resources/admin`, `@` → `resources/admin/js`.

- Use `<script setup>`, JavaScript, Inertia `useForm()` and `form.errors`.
- Wrap the page in `AdminLayout` (or `SystemLayout` for System screens) from `@admin/Layouts/`. The layout renders the sidebar, header, the only `ToastStack` and the only `ConfirmDialog`.
- Build URLs with `adminUrl()` from `@/utils/adminUrl`, passing paths relative to the admin prefix; read the current module handle with `adminModuleHandle()` from the same file. Never hardcode `/admin`.
- Reuse `.btn-*`, `.form-input`, `.form-label` and `.form-input-error` with their dark variants, and the [shared components](components.md).
- Use `t()` from `@/utils/useTranslation`; [translation keys](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/i18n.md) belong in AtlasCMS or the host.
- Upload updates use multipart POST with `_method: 'put'`. Child forms retain module, `parent_id` and `field_id`; render them outside the parent form and stop submit propagation. `flash.created_item_id` opens a new child.
- Pages read flash messages themselves: `usePage().props.flash.success` / `.error`, shown with `useToast()`.

The [admin screen recipe](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/docs/recipes/admin-screen.md) builds a page with a form, its controller and its module end to end.

### Shared props

`HandleInertiaRequests` adds these props to every page under the admin prefix:

| Prop | Contents |
| --- | --- |
| `auth` | `user`: `id`, `name`, `email`, `is_superadmin` of the signed-in admin |
| `cmsNavigation` | Sidebar groups and links the user may open; empty for guests |
| `flash` | `success`, `error`, `created_item_id` from the session |
| `translations` | Admin strings of the interface language, read through `t()` |
| `adminLocale`, `availableLanguages` | The interface language and the languages a user may pick |
| `adminPrefix` | URL prefix, used by `adminUrl()` |
| `atlasVersion` | Installed release |

Pages outside the prefix do not receive them. Items forms also receive the content `languages` (`id`, `title`, `slug`, `code`, `is_default`), which multilingual fields read with `usePage()`.

## Built-in pages

Each row is a page of this package, the code that renders it and the props it declares. [Docs tests](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/tests/Frontend/docsExamples.test.mjs) keep this table equal to the pages' `defineProps()`.

| Page | Rendered by | Props |
| --- | --- | --- |
| `Auth/Login` | `AuthenticatedSessionController` | `title`, `recaptcha` |
| `Admin/Dashboard` | `DashboardController` | `title` |
| `Admin/AccessDenied` | `AdminAccess` middleware, status 403 | `title`, `module` |
| `Admin/ModuleNotConfigured` | `ModuleNotConfigured` exception, status 404 | `title`, `module`, `reason`, `message`, `canConfigure` |
| `Admin/Modules/Default/Index` | `ModuleBaseController::index()`, `items` modules | `title`, `moduleHandle`, `module`, `action`, `menuItem`, `crud`, `availableActions`, `itemType`, `fields`, `items`, `hasSortingEnabled`, `hasDeepStructureEnabled`, `pagination`, `search`, `hasWideLayout`, `columnsToShow` |
| `Admin/Modules/Default/Edit` | `ModuleBaseController::edit()`, `items` modules | `title`, `moduleHandle`, `module`, `itemType`, `fields`, `customFieldTabs`, `systemFields`, `item`, `updateUrl`, `indexUrl`, `breadcrumbs`, `customButtons`, `dataSource` |
| `Admin/Modules/DbTable/Index` | `ModuleBaseController::index()`, `db_table` modules | `title`, `moduleHandle`, `module`, `tableName`, `columns`, `items`, `pagination`, `search`, `uiConfig`, `primaryKeyColumn`, `hasDeepStructure`, `parentColumn`, `hasOrderIndex`, `hasSortingEnabled`, `sortingColumn`, `hasWideLayout`, `relationships`, `filterConfig` |
| `Admin/Modules/DbTable/Create` | `ModuleBaseController::create()`, `db_table` modules | `title`, `moduleHandle`, `module`, `tableName`, `fields`, `uiConfig`, `hasDeepStructure`, `parentColumn`, `availableParents`, `parentId` |
| `Admin/Modules/DbTable/Edit` | `ModuleBaseController::edit()`, `db_table` modules | `title`, `moduleHandle`, `module`, `tableName`, `recordId`, `primaryKeyColumn`, `fields`, `uiConfig`, `record`, `hasDeepStructure`, `parentColumn`, `availableParents`, `relationships`, `customButtons`, `dataSource` |
| `Admin/Users/Index` | `UsersController` | `title`, `moduleHandle`, `module`, `action`, `menuItem`, `crud`, `availableActions`, `itemType`, `fields`, `items`, `hasSortingEnabled`, `hasDeepStructureEnabled`, `search`, `pagination` |
| `Admin/Users/Edit` | `UsersController` | `title`, `moduleHandle`, `module`, `itemType`, `fields`, `customFieldTabs`, `systemFields`, `item`, `user`, `updateUrl`, `indexUrl` |
| `Admin/System/Overview` | `OverviewController` | `title`, `stats`, `environment` |
| `Admin/System/ItemTypes/Index` | `ItemTypesController` | `title`, `itemTypes` |
| `Admin/System/ItemTypes/Create` | `ItemTypesController` | `fieldOptions` |
| `Admin/System/ItemTypes/Edit` | `ItemTypesController` | `itemType`, `fieldOptions`, `tabs`, `interfaceOptions`, `itemTypeChoices` |
| `Admin/System/Modules/Index` | `ModulesController` | `title`, `modules`, `itemTypes`, `itemTypeFieldOptions`, `menuGroups`, `collections`, `collectionCreateValue`, `dbConnections` |
| `Admin/System/Modules/Show` | `ModulesController` | `title`, `module`, `actions`, `itemTypes`, `collections`, `collectionCreateValue`, `customFieldTabs`, `dbConnections` |
| `Admin/System/CmsMenu/Index` | `CmsMenuController` | `title`, `groups`, `modules`, `roles` |
| `Admin/System/AccessRoles/Index` | `AccessRolesController` | `title`, `roles`, `modules` |
| `Index` | Nothing ([backlog](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/docs/backlog.md)) | — |

Controllers are in AtlasCMS `src/Http/Controllers/Admin/`. Shop pages (`Admin/Orders/*`, `Admin/Baskets/Index`) live in [AtlasShop-Vue](https://github.com/DevCats-Atlas/Atlas-Shop-Vue/blob/main/README.md).

The main props of the Items module pages:

| Prop | Shape |
| --- | --- |
| `module` | `{ id, title }`; the title is the module handle |
| `itemType` | `{ id, label, hasSlugField, slugIsMultilingual }` |
| `fields` | Base columns the type edits (`basic_fields`), each `{ key, label, type, required }` |
| `customFieldTabs` | `[{ id, title, fields }]`; each field as in the [interface contract](field-interfaces.md#the-contract) |
| `systemFields` | The `_system` tab's localized `title` and `content` fields, same shape |
| `item` | `{ id, title, values }`: base column values, `slug` and `slug_translations` when the type has slugs |
| `customButtons` | Enabled [record buttons](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/buttons.md) |

## Overriding a built-in page

A host file with the same name, such as `resources/admin/Pages/Admin/Modules/Default/Edit.vue`, replaces the package page for **every** module that renders it. The copy is a fork: it receives the props above but none of the package's later fixes. Compare it with the package file on every update.

Prefer, in this order:

1. A [custom field interface](field-interfaces.md) for one field of a form.
2. A [record button](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/buttons.md) for an action on one record.
3. A page for one module: a host controller for that module renders its own page name ([request dispatch](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/modules.md#request-dispatch)). `ModuleBaseController` builds the Items page props with its protected `moduleCrudIndexProps($handle)` and `moduleCrudEditProps($handle, $itemId)`, so the new page can start from the same data.
4. A host override of the built-in page, when every module should change.
