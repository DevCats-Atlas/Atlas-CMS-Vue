<script setup>
import { computed, ref } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { confirmDialog } from '@admin/js/utils/confirmDialog.js';
import { useTranslation } from '@admin/js/utils/useTranslation';
import axios from 'axios';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Module View',
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
    // relationships prop removed - relationships are managed on Edit page only
    // Keeping prop for backward compatibility but not using it
    relationships: {
        type: Array,
        default: () => [],
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const createChildUrl = computed(() => `${baseUrl.value}/create-child`);

// Debug: Log hasDeepStructure to ensure it's being passed correctly
// console.log('hasDeepStructure:', props.hasDeepStructure, 'parentColumn:', props.parentColumn);

// Create child form state
const showCreateChildForm = ref({}); // { [parentId]: boolean }
const childForms = ref({}); // { [parentId]: Form }

// Search form
const searchForm = useForm({
    search: props.search || '',
});

const performSearch = () => {
    router.get(baseUrl.value, 
        { search: searchForm.search },
        {
            preserveState: true,
            preserveScroll: true,
            only: ['items', 'search', 'pagination'],
        }
    );
};

const clearSearch = () => {
    searchForm.search = '';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['items', 'search', 'pagination'],
    });
};

const formatValue = (value, column) => {
    if (value === null || value === undefined) {
        return '-';
    }
    
    if (column.interface === 'checkbox') {
        return value ? 'Yes' : 'No';
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
    
    // Try to find a meaningful label for the record
    let recordLabel = `Record #${recordId}`;
    const titleFields = ['title', 'name', 'label', 'email'];
    for (const field of titleFields) {
        if (item[field]) {
            recordLabel = item[field];
            break;
        }
    }
    
    const confirmed = await confirmDialog({
        title: t('admin.db_table.delete_confirm'),
        message: `${t('admin.common.delete')} "${recordLabel}"?`,
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

// Tree structure support
const expandedItems = ref(new Set());

const isExpanded = (itemId) => {
    return expandedItems.value.has(String(itemId));
};

// Drag and drop for tree reordering
const draggedItem = ref(null);
const draggedOverIndex = ref(null);

const handleDragStart = (event, item) => {
    if (!props.hasDeepStructure) {
        event.preventDefault();
        return;
    }
    draggedItem.value = item;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.target.style.opacity = '0.5';
};

const handleDragEnd = (event) => {
    event.target.style.opacity = '';
    draggedItem.value = null;
    draggedOverIndex.value = null;
};

const handleDragOver = (event, item, index) => {
    if ((!props.hasDeepStructure && !props.hasOrderIndex) || !draggedItem.value) {
        return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    draggedOverIndex.value = index;
};

const handleDrop = async (event, dropItem, dropIndex) => {
    if ((!props.hasDeepStructure && !props.hasOrderIndex) || !draggedItem.value) {
        return;
    }
    event.preventDefault();
    
    const draggedId = draggedItem.value[props.primaryKeyColumn];
    const dropId = dropItem[props.primaryKeyColumn];
    
    if (draggedId === dropId) {
        draggedItem.value = null;
        draggedOverIndex.value = null;
        return;
    }
    
    // Determine new parent_id and order_index
    let newParentId = null;
    let newOrderIndex = dropIndex;
    
    if (props.hasDeepStructure) {
        // If tree structure is enabled, handle parent relationships
        const draggedParentId = draggedItem.value[props.parentColumn] ?? null;
        const dropParentId = dropItem[props.parentColumn] ?? null;
        
        newParentId = dropParentId;
        
        // If dragging to a different parent level, make it a child of the drop target
        if (draggedParentId !== dropParentId && dropItem._depth !== undefined) {
            newParentId = dropId;
        }
    }
    // If only order_index is enabled (no tree structure), just reorder within the same level
    
    try {
        await axios.post(`/admin/${props.moduleHandle}/reorder`, {
            record_id: draggedId,
            new_parent_id: newParentId,
            new_order_index: newOrderIndex,
        });
        
        // Reload to get updated tree structure
        router.reload({ preserveScroll: true });
    } catch (error) {
        console.error('Error reordering:', error);
        alert(error.response?.data?.error || t('admin.errors.error_reordering'));
    } finally {
        draggedItem.value = null;
        draggedOverIndex.value = null;
    }
};

// Relationship counts removed - too many queries on index page
// Relationships are managed on the Edit page instead

// Relationship filter removed - relationships are managed on Edit page
// Filtering by relationships would require loading all counts, causing too many queries

const toggleExpand = (itemId) => {
    const id = String(itemId);
    if (expandedItems.value.has(id)) {
        expandedItems.value.delete(id);
    } else {
        expandedItems.value.add(id);
    }
};

// Flatten tree structure for display
const flattenItems = (items, depth = 0) => {
    const result = [];
    
    items.forEach(item => {
        const itemId = item[props.primaryKeyColumn];
        const flattenedItem = {
            ...item,
            _depth: depth,
            _isChild: depth > 0,
        };
        result.push(flattenedItem);
        
        if (props.hasDeepStructure && item.children && item.children.length > 0) {
            if (isExpanded(itemId)) {
                // Recursively add children if parent is expanded
                const children = flattenItems(item.children, depth + 1);
                result.push(...children);
            }
        }
    });
    
    return result;
};

const displayItems = computed(() => {
    if (props.hasDeepStructure) {
        return flattenItems(props.items);
    }
    return props.items;
});

// Use displayItems directly (no filtering needed)
const finalDisplayItems = computed(() => displayItems.value);

// Create child functions
const openCreateChildForm = (parentId) => {
    const id = String(parentId);
    if (!childForms.value[id]) {
        childForms.value[id] = useForm({
            parent_id: parentId,
            title: '',
        });
    }
    showCreateChildForm.value[id] = true;
};

const closeCreateChildForm = (parentId) => {
    const id = String(parentId);
    showCreateChildForm.value[id] = false;
    if (childForms.value[id]) {
        childForms.value[id].reset();
    }
};

const submitCreateChild = (parentId) => {
    const id = String(parentId);
    const form = childForms.value[id];
    if (!form || !form.title.trim()) {
        return;
    }

    // Expand parent item before creating child so it will be visible after reload
    expandedItems.value.add(id);

    form.post(createChildUrl.value, {
        preserveScroll: true,
        onSuccess: () => {
            closeCreateChildForm(parentId);
            // Reload and re-expand the parent
            router.reload({ 
                preserveScroll: true,
                onSuccess: () => {
                    // Re-expand parent after reload
                    expandedItems.value.add(id);
                },
            });
        },
        forceFormData: true,
    });
};
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Table: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary" @click="router.visit(baseUrl + '/create')">
                            {{ t('admin.common.create') }}
                        </button>
                    </div>

                    <!-- Search Form -->
                    <div class="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
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
                                    Search across all columns in the table
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
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ column.title }}
                                    </th>
                                    <th
                                        v-if="hasDeepStructure"
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('admin.db_table.children') }}
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {{ t('admin.common.actions') }}
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                <template v-for="(item, index) in finalDisplayItems" :key="item[props.primaryKeyColumn]">
                                <tr
                                    :draggable="hasDeepStructure || hasOrderIndex"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    :class="{
                                        'cursor-move': hasDeepStructure || hasOrderIndex,
                                        'opacity-50': draggedItem && draggedItem[props.primaryKeyColumn] === item[props.primaryKeyColumn],
                                        'bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem && draggedItem[props.primaryKeyColumn] !== item[props.primaryKeyColumn],
                                    }"
                                    @dragstart="(hasDeepStructure || hasOrderIndex) && handleDragStart($event, item)"
                                    @dragend="(hasDeepStructure || hasOrderIndex) && handleDragEnd($event)"
                                    @dragover.prevent="(hasDeepStructure || hasOrderIndex) && handleDragOver($event, item, index)"
                                    @drop="(hasDeepStructure || hasOrderIndex) && handleDrop($event, item, index)"
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
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                                        v-if="hasDeepStructure && showCreateChildForm[String(item[props.primaryKeyColumn])]"
                                        class="bg-blue-50 dark:bg-blue-900/20"
                                    >
                                        <td :colspan="columns.length + (hasDeepStructure ? 1 : 0) + 1" class="px-6 py-4">
                                            <form class="flex items-center gap-2" @submit.prevent="submitCreateChild(item[props.primaryKeyColumn])">
                                                <input
                                                    v-model="childForms[String(item[props.primaryKeyColumn])].title"
                                                    type="text"
                                                    class="form-input flex-1"
                                                    placeholder="Child record title"
                                                    required
                                                    autofocus
                                                />
                                                <button type="submit" class="btn btn-primary btn-sm" :disabled="childForms[String(item[props.primaryKeyColumn])]?.processing">
                                                    {{ childForms[String(item[props.primaryKeyColumn])]?.processing ? t('admin.common.loading') : t('admin.db_table.create_child') }}
                                                </button>
                                                <button type="button" class="btn btn-outline btn-sm" @click="closeCreateChildForm(item[props.primaryKeyColumn])">
                                                    {{ t('admin.common.cancel') }}
                                                </button>
                                            </form>
                                            <p v-if="childForms[String(item[props.primaryKeyColumn])]?.errors?.title" class="mt-1 text-sm text-red-600">
                                                {{ childForms[String(item[props.primaryKeyColumn])].errors.title }}
                                            </p>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>

                        <!-- Pagination -->
                        <div v-if="pagination && pagination.last_page > 1" class="mt-4 flex items-center justify-between">
                            <div class="text-sm text-gray-700 dark:text-gray-300">
                                Showing {{ pagination.from }} to {{ pagination.to }} of {{ pagination.total }} results
                            </div>
                            <div class="flex gap-2">
                                <Link
                                    v-for="link in pagination.links"
                                    :key="link.label"
                                    :href="link.url || '#'"
                                    class="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
                                    :class="{
                                        'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700': link.url && !link.active,
                                        'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600': link.active,
                                        'text-gray-300 cursor-not-allowed dark:text-gray-600': !link.url
                                    }"
                                    v-html="link.label"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

