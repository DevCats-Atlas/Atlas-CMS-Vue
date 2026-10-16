<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed, ref, watch } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';
import { useToast } from '@/composables/useToast.js';
import { dropPlacement, flatten, moveNode, orderEntries, parentIds } from '@/lists/tree.js';
import { useCreateChild } from '@/lists/useCreateChild.js';
import { useExpandedState } from '@/lists/useExpandedState.js';
import { useListSearch } from '@/lists/useListSearch.js';
import { useSelection } from '@/lists/useSelection.js';
import { useTreeDragDrop } from '@/lists/useTreeDragDrop.js';
import ListPagination from '@/lists/ListPagination.vue';
import ListSearch from '@/lists/ListSearch.vue';
import ListToolbar from '@/lists/ListToolbar.vue';

const props = defineProps({
    title: { type: String, default: 'Module View' },
    moduleHandle: { type: String, required: true },
    module: { type: Object, required: true },
    action: { type: Object, required: true },
    menuItem: { type: Object, default: null },
    crud: { type: Object, required: true },
    availableActions: { type: Array, default: () => [] },
    itemType: { type: Object, required: true },
    fields: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    hasSortingEnabled: { type: Boolean, default: false },
    hasDeepStructureEnabled: { type: Boolean, default: false },
    pagination: { type: Object, default: null },
    search: { type: String, default: '' },
    hasWideLayout: { type: Boolean, default: false },
    columnsToShow: { type: Array, default: () => [] },
});

const { t } = useTranslation();
const { showToast } = useToast();

const baseUrl = computed(() => adminUrl(`${props.moduleHandle}`));
const deleteUrl = computed(() => `${baseUrl.value}/delete`);

const containerClasses = computed(() => ['mx-auto', 'space-y-6', 'px-4', 'sm:px-6', ...(props.hasWideLayout
    ? ['max-w-full', 'lg:px-10']
    : ['max-w-6xl', 'lg:px-8'])]);

const listSearch = useListSearch(() => baseUrl.value, props.search);

// Tree: expansion is kept per module within the browser tab; search results open every branch on the path to a match
const { isExpanded, expand, toggle: toggleExpanded, showOnly } = useExpandedState(`expandedItems_${props.moduleHandle}`);
const followSearch = () => showOnly(props.search ? parentIds(props.items) : null);
followSearch();
watch(() => props.search, followSearch);

const localItems = ref([...props.items]);
const displayItems = computed(() => flatten(localItems.value, { isExpanded, tree: props.hasDeepStructureEnabled }));

const selection = useSelection(() => displayItems.value, {
    allIds: () => flatten(props.items).map((item) => item.id),
    deleteUrl: () => deleteUrl.value,
    confirm: (count) => ({
        title: t('admin.items.delete_selected_items'),
        message: t('admin.items.delete_selected_confirm', { count }),
        confirmLabel: t('admin.common.delete'),
    }),
});

// Create modal: title, plus visibility when the type has it among its basic fields
const hasField = (key) => props.fields.some((field) => field.key === key);
const createModalOpen = ref(false);
const createForm = useForm({ title: '', ...(hasField('visible') ? { visible: true } : {}) });

const openCreateModal = () => {
    createForm.reset();
    createModalOpen.value = true;
};

const submitCreate = () => {
    // The backend redirects to the new entry's edit page
    createForm.post(`${baseUrl.value}/create`, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
            createModalOpen.value = false;
        },
    });
};

const deleteItem = async (item) => {
    const confirmed = await confirmDialog({
        title: t('admin.items.delete_item'),
        message: t('admin.items.delete_item_confirm', { title: item.title }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    if (confirmed) {
        router.delete(deleteUrl.value, { data: { item_id: item.id }, preserveScroll: true });
    }
};

// Drag and drop: onto a sibling = move before it, onto another row = become its last child.
// The whole page order is sent; roots are numbered after the rows of earlier pages.
const rootOffset = computed(() => Math.max((props.pagination?.from ?? 1) - 1, 0));
const { draggedItem, draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useTreeDragDrop({
    canDrag: () => props.hasSortingEnabled,
    onDrop: (dragged, target) => {
        const placement = dropPlacement(localItems.value, dragged.id, target.id);
        if (!placement) {
            return;
        }
        localItems.value = moveNode(localItems.value, dragged.id, placement);
        if (placement.asChild && props.hasDeepStructureEnabled) {
            expand(target.id);
        }

        const roots = new Set(localItems.value.map((item) => item.id));
        const order = orderEntries(localItems.value).map((entry) => (roots.has(entry.id)
            ? { ...entry, order_index: entry.order_index + rootOffset.value }
            : entry));

        router.post(`${baseUrl.value}/reorder`, { order }, {
            preserveScroll: true,
            onSuccess: () => router.reload({ preserveScroll: true }),
            onError: () => {
                localItems.value = JSON.parse(JSON.stringify(props.items));
                showToast({ title: t('admin.lists.reorder_failed'), intent: 'danger' });
            },
        });
    },
});

watch(() => props.items, (items) => {
    if (!draggedItem.value) {
        localItems.value = [...items];
    }
}, { deep: true });

const {
    open: openCreateChildForm,
    close: closeCreateChildForm,
    submit: submitCreateChild,
    isOpen: isCreateChildOpen,
    formFor: childFormFor,
} = useCreateChild(() => `${baseUrl.value}/create-child`, { onCreated: (parentId) => expand(parentId) });

const columnCount = computed(() => (props.hasSortingEnabled ? 1 : 0) + 5 + props.columnsToShow.length + (props.hasDeepStructureEnabled ? 1 : 0));
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div :class="containerClasses">
                <section class="section">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('admin.items.module') }}</p>
                            <h1 class="heading-1">
                                {{ module.title }}
                                <span class="text-gray-400 text-base font-normal">/ {{ action.title }}</span>
                            </h1>
                        </div>
                        <div class="text-right space-y-1">
                            <p class="text-xs font-semibold text-gray-500 uppercase">{{ t('admin.items.item_type') }}</p>
                            <p class="text-sm text-gray-900 dark:text-white">{{ itemType.label }}</p>
                        </div>
                    </div>
                </section>

                <ListSearch
                    :search="listSearch"
                    :active="Boolean(search)"
                    :heading="t('admin.items.search_heading')"
                    :placeholder="t('admin.items.search_placeholder')"
                    :hint="t('admin.items.search_hint')"
                />

                <section class="section">
                    <ListToolbar
                        :heading="t('admin.items.entries')"
                        :selected-count="selection.count.value"
                        :deleting="selection.isDeleting.value"
                        @delete-selected="selection.deleteSelected"
                    >
                        <button type="button" class="btn btn-outline" @click="openCreateModal">
                            {{ t('admin.items.new_entry') }}
                        </button>
                    </ListToolbar>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th v-if="hasSortingEnabled" class="table-cell text-center w-12"></th>
                                    <th class="table-cell text-center w-12">
                                        <input
                                            type="checkbox"
                                            class="form-checkbox"
                                            :aria-label="t('admin.lists.select_all')"
                                            :checked="selection.isAllSelected.value"
                                            :indeterminate="selection.isIndeterminate.value"
                                            @change="selection.toggleAll($event.target.checked)"
                                        />
                                    </th>
                                    <th class="table-header w-0">ID</th>
                                    <th class="table-header w-0">{{ t('admin.items.visible') }}</th>
                                    <th class="table-header">{{ t('admin.common.title_label') }}</th>
                                    <th v-for="column in columnsToShow" :key="column.node" class="table-header">
                                        {{ column.title }}
                                    </th>
                                    <th v-if="hasDeepStructureEnabled" class="table-header w-20">{{ t('admin.items.children') }}</th>
                                    <th class="w-fit px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{{ t('admin.common.actions') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <template v-for="(item, index) in displayItems" :key="`${item.id}-${index}`">
                                    <tr
                                        :draggable="hasSortingEnabled"
                                        class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                                        :class="{
                                            'cursor-move': hasSortingEnabled,
                                            'opacity-50': draggedItem?.id === item.id,
                                            'bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem?.id !== item.id,
                                            'bg-gray-50 dark:bg-gray-900/60': item._isChild,
                                        }"
                                        @dragstart="handleDragStart($event, item)"
                                        @dragend="handleDragEnd"
                                        @dragover="handleDragOver($event, index)"
                                        @drop="handleDrop($event, item, index)"
                                    >
                                        <td v-if="hasSortingEnabled" class="table-cell text-center" :title="t('admin.lists.reorder')">
                                            <div class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-move pointer-events-none select-none">
                                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                                </svg>
                                            </div>
                                        </td>
                                        <td class="table-cell text-center">
                                            <input
                                                type="checkbox"
                                                class="form-checkbox"
                                                draggable="false"
                                                :aria-label="t('admin.lists.select_row')"
                                                :checked="selection.isSelected(item.id)"
                                                @change.stop="selection.toggle(item.id)"
                                                @click.stop
                                            />
                                        </td>
                                        <td class="table-cell table-id">
                                            <span v-if="item._isChild" :style="{ paddingLeft: `${item._depth * 1.5}rem` }" class="inline-block">
                                                <span class="text-gray-400">├─</span>
                                            </span>
                                            #{{ item.id }}
                                        </td>
                                        <td class="table-cell whitespace-nowrap">
                                            <span
                                                class="px-2 py-0.5 rounded-full text-xs font-semibold"
                                                :class="item.visible
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                            >
                                                {{ item.visible ? t('admin.items.visible') : t('admin.items.hidden') }}
                                            </span>
                                        </td>
                                        <td class="table-cell">
                                            <Link
                                                :href="`${baseUrl}/edit?item=${item.id}`"
                                                class="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                                                preserve-scroll
                                            >
                                                {{ item.title || t('admin.items.untitled') }}
                                            </Link>
                                        </td>
                                        <td v-for="column in columnsToShow" :key="column.node" class="table-cell">
                                            {{ item.custom_field_values?.[column.node] ?? '-' }}
                                        </td>
                                        <td v-if="hasDeepStructureEnabled" class="table-cell">
                                            <div v-if="item.children?.length" class="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                    draggable="false"
                                                    :title="isExpanded(item.id) ? t('admin.common.collapse') : t('admin.common.expand')"
                                                    @click.stop="toggleExpanded(item.id)"
                                                >
                                                    <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-90': isExpanded(item.id) }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                                <span class="text-xs text-gray-500 dark:text-gray-400">{{ item.children.length }}</span>
                                            </div>
                                        </td>
                                        <td class="w-fit px-2 py-2 whitespace-nowrap" style="width: 1%;">
                                            <div class="btn-group" role="group">
                                                <button
                                                    v-if="hasDeepStructureEnabled"
                                                    type="button"
                                                    class="btn-group-item-edit"
                                                    draggable="false"
                                                    :title="t('admin.items.add_child')"
                                                    @click.stop="openCreateChildForm(item.id)"
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>
                                                <Link
                                                    :href="`${baseUrl}/edit?item=${item.id}`"
                                                    class="btn-group-item-edit"
                                                    preserve-scroll
                                                    :title="t('admin.common.edit')"
                                                    @click.stop
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </Link>
                                                <button
                                                    type="button"
                                                    class="btn-group-item-delete"
                                                    draggable="false"
                                                    :title="t('admin.common.delete')"
                                                    @click.stop="deleteItem(item)"
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <!-- Inline form for a new child, under its parent row -->
                                    <tr v-if="hasDeepStructureEnabled && isCreateChildOpen(item.id)" class="bg-blue-50 dark:bg-blue-900/20">
                                        <td :colspan="hasSortingEnabled ? 4 : 3" class="table-cell"></td>
                                        <td :colspan="columnCount - (hasSortingEnabled ? 4 : 3)" class="table-cell">
                                            <form class="flex items-center gap-2" @submit.prevent="submitCreateChild(item.id)">
                                                <input
                                                    v-model="childFormFor(item.id).title"
                                                    type="text"
                                                    class="form-input flex-1"
                                                    :placeholder="t('admin.items.child_title')"
                                                    required
                                                    autofocus
                                                />
                                                <button type="submit" class="btn btn-primary btn-sm" :disabled="childFormFor(item.id).processing">
                                                    {{ childFormFor(item.id).processing ? t('admin.items.creating') : t('admin.common.create') }}
                                                </button>
                                                <button type="button" class="btn-text btn-sm" @click="closeCreateChildForm(item.id)">
                                                    {{ t('admin.common.cancel') }}
                                                </button>
                                            </form>
                                            <p v-if="childFormFor(item.id).errors.title" class="mt-1 text-sm text-red-600">
                                                {{ childFormFor(item.id).errors.title }}
                                            </p>
                                        </td>
                                    </tr>
                                </template>
                                <tr v-if="localItems.length === 0">
                                    <td :colspan="columnCount" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        {{ search ? t('admin.items.no_entries_found') : t('admin.items.no_entries_yet') }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <ListPagination :pagination="pagination" />
                </section>
            </div>
        </div>

        <ModalDialog :open="createModalOpen" :title="t('admin.items.create_entry')" @close="createModalOpen = false">
            <form class="space-y-4" @submit.prevent="submitCreate">
                <div class="space-y-1">
                    <label class="form-label">{{ t('admin.common.title_label') }}</label>
                    <input v-model="createForm.title" type="text" class="form-input" required :placeholder="t('admin.items.enter_title')" />
                    <p v-if="createForm.errors.title" class="text-sm text-red-600">{{ createForm.errors.title }}</p>
                </div>

                <div v-if="hasField('visible')" class="space-y-1">
                    <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                        <input v-model="createForm.visible" type="checkbox" class="form-checkbox" />
                        <span class="ml-2">{{ t('admin.items.visible') }}</span>
                    </label>
                    <p v-if="createForm.errors.visible" class="text-sm text-red-600">{{ createForm.errors.visible }}</p>
                </div>

                <div class="actions-footer">
                    <button type="button" class="btn-text" @click="createModalOpen = false">{{ t('admin.common.cancel') }}</button>
                    <button type="submit" class="btn btn-primary" :disabled="createForm.processing">
                        {{ createForm.processing ? t('admin.items.creating') : t('admin.common.create') }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </AdminLayout>
</template>
