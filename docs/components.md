# Components and helpers

Pages import shared components through the `@` and `@admin` aliases ([writing a page](pages.md#writing-a-page)).

## Shared components

`AdminLayout` (and `SystemLayout`, which wraps it) mounts the only `ConfirmDialog` and `ToastStack`; pages call them through helpers.

| Import | Contract |
| --- | --- |
| `AdminLayout` from `@admin/Layouts/AdminLayout.vue` | Sidebar, header and the page in the default slot; mounts the dialog and toast stack |
| `SystemLayout` from `@admin/Layouts/SystemLayout.vue` | `AdminLayout` with the **System** navigation, for superadmin screens |
| `ModalDialog` from `@/components/ModalDialog.vue` | Props `open` (Boolean), `title`, `size` (`sm`, `md` (default), `lg`, `xl`, `full`); emits `close` from the backdrop or the close button; the default slot is the body. Render it outside the parent form |
| `confirmDialog(options)` from `@/utils/confirmDialog.js` | Returns a Promise of `true` (confirmed) or `false`. Options `title`, `message`, `confirmLabel`, `cancelLabel` (omitted texts get translated defaults) and `intent` (`primary` or `danger`). Escape and the backdrop cancel; a new call cancels the open dialog |
| `useToast()` from `@/composables/useToast.js` | `showToast({ title, message, intent, duration })` returns an ID; `intent` is `default`, `success`, `danger`, `warning` or `info`; `duration` is in ms (4000), `0` keeps the toast until `dismissToast(id)` |
| `Toggle` from `@/components/Toggle.vue` | `v-model` accepts a boolean, `'1'` / `'true'` / `'on'` or `1`, and emits a boolean; props `disabled`, `size` (`sm`, `md`, `lg`) |
| `WysiwigEditor` from `@/components/WysiwigEditor.vue` | CKEditor bound to an HTML string with `v-model`; the file name is spelled `Wysiwig` |
| `adminUrl(path)`, `adminModuleHandle()` from `@/utils/adminUrl` | An admin URL under the configured prefix; the module handle of the current URL |
| `useTranslation()` from `@/utils/useTranslation` | `t(key, params)`; parameters accept `:name` and `{name}` |

```js
import { router } from '@inertiajs/vue3';
import { adminUrl } from '@/utils/adminUrl';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useToast } from '@/composables/useToast.js';
import { useTranslation } from '@/utils/useTranslation';

const { t } = useTranslation();
const { showToast } = useToast();

async function deleteRecord(url) {
    if (await confirmDialog({ intent: 'danger', title: t('admin.lists.delete_selected', { count: 1 }) })) {
        router.delete(adminUrl(url), { onSuccess: () => showToast({ intent: 'success', title: t('admin.common.success') }) });
    }
}
```

## List and DbTable modules

The module pages are built from these modules under `resources/admin/js/`. They are internal to this package: reuse them in its own pages, and treat them as unstable in host pages.

| Module | Responsibility |
| --- | --- |
| `lists/` | Search, selection, expanded state, tree dragging, child creation, pagination (`ListSearch`, `ListToolbar`, `ListPagination`) |
| `dbTable/formModel.js`, `dbTable/recordTransport.js`, `composables/useDbTableRecordForm.js` | Main and related form state and multipart transport; rendered by `DbTableRecordForm.vue` |
| `composables/useRelationshipOptions.js` | Scoped options, debounced search, stale-response protection |
| `dbTable/listFilters.js`, `dbTable/uiConfig.js` | Filter query values and column settings |
| `modules/`, `localeData.js` | Module settings and language JSON |

Backend contracts: [DbTable forms, filters and relationships](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/db-table.md), [button responses](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/buttons.md), [session errors and access](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/access.md). Related forms use independent teleported modals; cast previews are plain text. Child lists and galleries save drag order immediately, show a toast and reload the saved order on validation failure.

## Column settings editor

`UiConfigEditor.vue` (`Pages/Admin/System/Modules/components/`) edits a DbTable module's per-column settings. Pass `table-name`, `connection` (empty = default) and `initial-ui-config`; store the `update:ui-config` event. Optional props: `moduleId`, `excludeColumns`, `withFieldGroups`, `withCasts`. The JSON follows the [DbTable contract](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/db-table.md#dbtable-ui-json-contract).
