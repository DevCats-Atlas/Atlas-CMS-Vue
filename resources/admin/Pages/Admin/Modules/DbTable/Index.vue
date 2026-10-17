<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed } from 'vue';
import { Head, Link, router } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { confirmDialog } from '@admin/js/utils/confirmDialog.js';
import { useTranslation } from '@admin/js/utils/useTranslation';
import DbTableFilters from './components/DbTableFilters.vue';
import axios from 'axios';
import { dropPlacement, flatten } from '@admin/js/lists/tree.js';
import { useCreateChild } from '@admin/js/lists/useCreateChild.js';
import { useExpandedState } from '@admin/js/lists/useExpandedState.js';
import { useListSearch } from '@admin/js/lists/useListSearch.js';
import { useTreeDragDrop } from '@admin/js/lists/useTreeDragDrop.js';
import ListPagination from '@admin/js/lists/ListPagination.vue';
import { useToast } from '@admin/js/composables/useToast.js';

const { t } = useTranslation();
const { showToast } = useToast();

const props = defineProps({
    title: {
        type: String,
        default: '',
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    module: {
        type: Object,
        required: true,
    },
    tableName: {
        type: String,
        required: true,
    },
    columns: {
        type: Array,
        default: () => [],
    },
    items: {
        type: Array,
        default: () => [],
    },
    pagination: {
        type: Object,
        default: null,
    },
    search: {
        type: String,
        default: '',
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    primaryKeyColumn: {
        type: String,
        default: 'id',
    },
    hasDeepStructure: {
        type: Boolean,
        default: false,
    },
    parentColumn: {
        type: String,
        default: 'parent_id',
    },
    hasOrderIndex: {
        type: Boolean,
        default: false,
    },
    hasSortingEnabled: {
        type: Boolean,
        default: false,
    },
    sortingColumn: {
        type: String,
        default: 'order_index',
    },
    hasWideLayout: {
        type: Boolean,
        default: false,
    },
    // Relationship definitions for DbTableFilters; records are managed on the Edit page
    relationships: {
        type: Array,
        default: () => [],
    },
    filterConfig: {
        type: Object,
        default: null,
    },
});

const baseUrl = computed(() => adminUrl(`${props.moduleHandle}`));

// Filter form (module filter config) or, without it, the plain search box
const hasFilterConfig = computed(() => Boolean(props.filterConfig?.filters?.length));
const { form: searchForm, perform: performSearch, clear: clearSearch } = useListSearch(() => baseUrl.value, props.search);

const formatValue = (value, column) => {
    if (value === null || value === undefined) {
        return '-';
    }
    
    if (column.interface === 'checkbox') {
        return value ? t('admin.common.yes') : t('admin.common.no');
    }
    
    if (column.interface === 'datetime') {
        // Try to parse as date
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
    }
    
    return String(value);
};

const confirmDelete = async (item) => {
    // Use the primary key column passed from backend
    const recordId = item[props.primaryKeyColumn];
    
    const confirmed = await confirmDialog({
        title: t('admin.db_table.delete_confirm'),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    
    if (!confirmed) {
        return;
    }
    
    router.delete(`${baseUrl.value}/delete`, {
        data: {
            item_id: recordId,
        },
        preserveScroll: true,
        onSuccess: () => {
            router.reload({ preserveScroll: true });
        },
    });
};

// Tree: expanded branches, drag-and-drop moves, quick child creation
const { isExpanded, expand, toggle: toggleExpand } = useExpandedState();
const idOf = (item) => item[props.primaryKeyColumn];

// Reordering needs manual sorting, a tree or an order_index column
const canReorder = computed(() => props.hasSortingEnabled || props.hasDeepStructure || props.hasOrderIndex);

// Positions are 0-based among the siblings; root rows on later pages start after the earlier pages
const rootOffset = computed(() => Math.max((props.pagination?.from ?? 1) - 1, 0));

const { draggedItem, draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useTreeDragDrop({
    canDrag: () => canReorder.value,
    onDrop: async (dragged, target) => {
        const placement = props.hasDeepStructure
            ? dropPlacement(props.items, idOf(dragged), idOf(target), { idOf, parentOf: (item) => item[props.parentColumn] ?? null })
            : dropPlacement(props.items.map((item) => ({ ...item, children: [] })), idOf(dragged), idOf(target), { idOf, parentOf: () => null });
        if (!placement) {
            return;
        }
        const isRoot = placement.parentId === null || placement.parentId === undefined;

        try {
            await axios.post(adminUrl(`${props.moduleHandle}/reorder`), {
                record_id: idOf(dragged),
                new_parent_id: props.hasDeepStructure ? placement.parentId : null,
                new_order_index: placement.index + (isRoot ? rootOffset.value : 0),
            });
            if (placement.asChild) {
                expand(placement.parentId);
            }
            router.reload({ preserveScroll: true });
        } catch (error) {
            showToast({ title: t('admin.errors.error_reordering'), message: error.response?.data?.error || '', intent: 'danger' });
        }
    },
});

const displayItems = computed(() => flatten(props.items, { idOf, isExpanded, tree: props.hasDeepStructure }));

const {
    open: openCreateChildForm,
    close: closeCreateChildForm,
    submit: submitCreateChild,
    isOpen: isCreateChildOpen,
    formFor: childFormFor,
} = useCreateChild(() => `${baseUrl.value}/create-child`, { onCreated: (parentId) => expand(parentId) });
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div :class="['mx-auto sm:px-6 lg:px-8 space-y-6', hasWideLayout ? '' : 'max-w-7xl']">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="heading-1">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {{ t('admin.db_table.table') }} <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary" @click="router.visit(baseUrl + '/create')">
                            {{ t('admin.common.create') }}
                        </button>
                    </div>

                    <DbTableFilters
                        v-if="hasFilterConfig"
                        :filter-config="filterConfig"
                        :ui-config="uiConfig"
                        :relationships="relationships"
                        :module-handle="moduleHandle"
                        :url="baseUrl"
                    />

                    <!-- Plain search (modules without filter config) -->
                    <div v-else class="mb-6 pb-6 border-divider">
                        <form @submit.prevent="performSearch" class="space-y-4">
                            <div>
                                <label class="form-label">{{ t('admin.common.search') }}</label>
                                <div class="flex items-center gap-2">
                                    <div class="flex-1">
                                        <input
                                            v-model="searchForm.search"
                                            type="text"
                                            class="form-input"
                                            :placeholder="t('admin.common.search')"
                                        />
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button type="submit" class="btn btn-primary" :disabled="searchForm.processing">
                                            {{ searchForm.processing ? t('admin.common.loading') : t('admin.common.search') }}
                                        </button>
                                        <button
                                            v-if="search"
                                            type="button"
                                            class="btn btn-outline"
                                            @click="clearSearch"
                                        >
                                            {{ t('admin.common.clear') }}
                                        </button>
                                    </div>
                                </div>
                                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {{ t('admin.db_table.search_all_hint') }}
                                </p>
                            </div>
                        </form>
                    </div>

                    <div v-if="displayItems.length === 0" class="text-center py-12">
                        <p class="text-gray-500 dark:text-gray-400">
                            {{ search ? t('admin.common.no_results') : t('admin.db_table.no_records') }}
                        </p>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th
                                        v-for="column in columns"
                                        :key="column.name"
                                        class="table-header-sm-padded"
                                    >
                                        {{ column.title }}
                                    </th>
                                    <th
                                        v-if="hasDeepStructure"
                                        class="table-header-sm-padded"
                                    >
                                        {{ t('admin.db_table.children') }}
                                    </th>
                                    <th class="table-header-sm-actions" style="width: 1%;">
                                        {{ t('admin.common.actions') }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                <template v-for="(item, index) in displayItems" :key="item[props.primaryKeyColumn]">
                                <tr
                                    :draggable="canReorder"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    :class="{
                                        'cursor-move': canReorder,
                                        'opacity-50': draggedItem && draggedItem[props.primaryKeyColumn] === item[props.primaryKeyColumn],
                                        'bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem && draggedItem[props.primaryKeyColumn] !== item[props.primaryKeyColumn],
                                    }"
                                    @dragstart="canReorder && handleDragStart($event, item)"
                                    @dragend="canReorder && handleDragEnd($event)"
                                    @dragover.prevent="canReorder && handleDragOver($event, index)"
                                    @drop="canReorder && handleDrop($event, item, index)"
                                >
                                        <td
                                            v-for="(column, colIndex) in columns"
                                            :key="column.name"
                                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                            :style="hasDeepStructure && item._isChild ? { paddingLeft: `${24 + (item._depth * 24)}px` } : {}"
                                        >
                                            {{ formatValue(item[column.name], column) }}
                                        </td>
                                        <td
                                            v-if="hasDeepStructure"
                                            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                                        >
                                            <div class="flex items-center gap-2">
                                                <button
                                                    v-if="item.has_children"
                                                    type="button"
                                                    class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                    draggable="false"
                                                    @click.stop="toggleExpand(item[props.primaryKeyColumn])"
                                                    :title="isExpanded(item[props.primaryKeyColumn]) ? t('admin.common.collapse') : t('admin.common.expand')"
                                                >
                                                    <svg
                                                        class="w-4 h-4 transition-transform"
                                                        :class="{ 'rotate-90': isExpanded(item[props.primaryKeyColumn]) }"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M9 5l7 7-7 7"
                                                        />
                                                    </svg>
                                                </button>
                                                <span v-if="item.has_children" class="text-xs text-gray-500 dark:text-gray-400">
                                                    {{ item.children?.length || 0 }}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="px-2 py-2 whitespace-nowrap text-sm font-medium" style="width: 1%;">
                                            <div class="btn-group" role="group">
                                                <button
                                                    v-if="hasDeepStructure"
                                                    type="button"
                                                    class="btn-group-item-edit"
                                                    draggable="false"
                                                    @click.stop="openCreateChildForm(item[props.primaryKeyColumn])"
                                                    :title="t('admin.db_table.create_child')"
                                                >
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M12 4v16m8-8H4"
                                                        />
                                                    </svg>
                                                </button>
                                                <Link
                                                    :href="`${baseUrl}/edit?id=${item[props.primaryKeyColumn]}`"
                                                    class="btn-group-item-edit"
                                                    preserve-scroll
                                                    @click.stop
                                                    :title="t('admin.common.edit')"
                                                >
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                </Link>
                                                <button
                                                    type="button"
                                                    class="btn-group-item-delete"
                                                    @click.stop="confirmDelete(item)"
                                                    :title="t('admin.common.delete')"
                                                >
                                                    <svg
                                                        class="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            stroke-linecap="round"
                                                            stroke-linejoin="round"
                                                            stroke-width="2"
                                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    <!-- Create child form row -->
                                    <tr
                                        v-if="hasDeepStructure && isCreateChildOpen(item[props.primaryKeyColumn])"
                                        class="bg-blue-50 dark:bg-blue-900/20"
                                    >
                                        <td :colspan="columns.length + (hasDeepStructure ? 1 : 0) + 1" class="px-6 py-4">
                                            <form class="flex items-center gap-2" @submit.prevent="submitCreateChild(item[props.primaryKeyColumn])">
                                                <input
                                                    v-model="childFormFor(item[props.primaryKeyColumn]).title"
                                                    type="text"
                                                    class="form-input flex-1"
                                                    :placeholder="t('admin.db_table.child_title')"
                                                    required
                                                    autofocus
                                                />
                                                <button type="submit" class="btn btn-primary btn-sm" :disabled="childFormFor(item[props.primaryKeyColumn])?.processing">
                                                    {{ childFormFor(item[props.primaryKeyColumn])?.processing ? t('admin.common.loading') : t('admin.db_table.create_child') }}
                                                </button>
                                                <button type="button" class="btn btn-outline btn-sm" @click="closeCreateChildForm(item[props.primaryKeyColumn])">
                                                    {{ t('admin.common.cancel') }}
                                                </button>
                                            </form>
                                            <p v-if="childFormFor(item[props.primaryKeyColumn])?.errors?.title" class="mt-1 text-sm text-red-600">
                                                {{ childFormFor(item[props.primaryKeyColumn]).errors.title }}
                                            </p>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>

                        <ListPagination :pagination="pagination" />
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

