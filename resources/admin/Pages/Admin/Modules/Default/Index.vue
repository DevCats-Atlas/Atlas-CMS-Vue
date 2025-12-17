<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

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
    action: {
        type: Object,
        required: true,
    },
    menuItem: {
        type: Object,
        default: null,
    },
    crud: {
        type: Object,
        required: true,
    },
    availableActions: {
        type: Array,
        default: () => [],
    },
    itemType: {
        type: Object,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    items: {
        type: Array,
        default: () => [],
    },
    hasSortingEnabled: {
        type: Boolean,
        default: false,
    },
    hasDeepStructureEnabled: {
        type: Boolean,
        default: false,
    },
    pagination: {
        type: Object,
        default: null,
    },
    search: {
        type: String,
        default: '',
    },
    hasWideLayout: {
        type: Boolean,
        default: false,
    },
    columnsToShow: {
        type: Array,
        default: () => [],
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const createUrl = computed(() => `${baseUrl.value}/create`);
const deleteUrl = computed(() => `${baseUrl.value}/delete`);
const createChildUrl = computed(() => `${baseUrl.value}/create-child`);

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

const containerClasses = computed(() => {
    const classes = ['mx-auto', 'space-y-6'];
    if (props.hasWideLayout) {
        classes.push('max-w-full', 'px-4', 'sm:px-6', 'lg:px-10');
    } else {
        classes.push('max-w-6xl', 'px-4', 'sm:px-6', 'lg:px-8');
    }
    return classes;
});

const createModalOpen = ref(false);
const selectedItems = ref(new Set());
const isDeleting = ref(false);
const selectAllCheckbox = ref(null);

// Deep structure state
// Load expanded items from sessionStorage on mount
const loadExpandedItems = () => {
    try {
        const stored = sessionStorage.getItem(`expandedItems_${props.moduleHandle}`);
        if (stored) {
            return new Set(JSON.parse(stored));
        }
    } catch (e) {
        // Ignore errors
    }
    return new Set();
};

const saveExpandedItems = () => {
    try {
        sessionStorage.setItem(`expandedItems_${props.moduleHandle}`, JSON.stringify(Array.from(expandedItems.value)));
    } catch (e) {
        // Ignore errors
    }
};

const expandedItems = ref(loadExpandedItems());
const showCreateChildForm = ref({}); // { [parentId]: boolean }
const childForms = ref({}); // { [parentId]: useForm }

// Drag and drop state
const draggedItem = ref(null);
const draggedOverIndex = ref(null);
const localItems = ref([...props.items]);

// Sync localItems when props.items changes (but not during drag operation)
watch(() => props.items, (newItems) => {
    if (!draggedItem.value) {
        localItems.value = [...newItems];
    }
}, { deep: true });

// Check if field exists and should be displayed
const hasField = (key) => {
    return props.fields.some(field => field.key === key);
};

const buildFieldState = () => {
    const state = {
        title: '', // Title is always required
    };

    // Only include visible if it's in basic fields
    if (hasField('visible')) {
        state.visible = true; // Default to true for visible
    }

    return state;
};

const createForm = useForm({
    ...buildFieldState(),
});

// No transform needed for simplified form

const openCreateModal = () => {
    createModalOpen.value = true;
    resetCreateForm();
};

const closeCreateModal = () => {
    createModalOpen.value = false;
};

const resetCreateForm = () => {
    createForm.defaults(buildFieldState());
    createForm.reset();
};

const submitCreate = () => {
    createForm.post(createUrl.value, {
        preserveScroll: true,
        onSuccess: (responsePage) => {
            // The backend redirects to edit page, so we just close the modal
            // The page will automatically redirect to edit page
            closeCreateModal();
        },
        forceFormData: true,
    });
};

const deleteItem = async (item) => {
    const confirmed = await confirmDialog({
        title: 'Delete item',
        message: `Delete "${item.title}"?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(deleteUrl.value, {
        data: { item_id: item.id },
        preserveScroll: true,
    });
};


// Multi-select functionality
const toggleSelectAll = (event) => {
    if (event.target.checked) {
        selectedItems.value = new Set(props.items.map(item => item.id));
    } else {
        selectedItems.value.clear();
    }
};

const toggleSelectItem = (itemId) => {
    if (selectedItems.value.has(itemId)) {
        selectedItems.value.delete(itemId);
    } else {
        selectedItems.value.add(itemId);
    }
};

const isAllSelected = computed(() => {
    return props.items.length > 0 && selectedItems.value.size === props.items.length;
});

const isIndeterminate = computed(() => {
    return selectedItems.value.size > 0 && selectedItems.value.size < props.items.length;
});

const deleteSelectedItems = async () => {
    if (selectedItems.value.size === 0) {
        return;
    }

    const selectedCount = selectedItems.value.size;
    const confirmed = await confirmDialog({
        title: 'Delete selected items',
        message: `Delete ${selectedCount} item(s)?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    isDeleting.value = true;
    
    // Delete items one by one using fetch API for better control
    const itemIds = Array.from(selectedItems.value);
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    for (const itemId of itemIds) {
        try {
            const response = await fetch(deleteUrl.value, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ item_id: itemId }),
            });

            if (response.ok) {
                selectedItems.value.delete(itemId);
            }
        } catch (error) {
            console.error(`Failed to delete item ${itemId}:`, error);
        }
    }

    isDeleting.value = false;
    
    // Refresh the page to update the items list
    router.reload({ preserveScroll: true });
};

// Handle indeterminate state for select all checkbox
watch([isIndeterminate, isAllSelected], () => {
    nextTick(() => {
        if (selectAllCheckbox.value) {
            selectAllCheckbox.value.indeterminate = isIndeterminate.value;
        }
    });
});

// Clear selections for items that no longer exist
watch(() => props.items, (newItems) => {
    const itemIds = new Set(newItems.map(item => item.id));
    const toRemove = [];
    selectedItems.value.forEach((id) => {
        if (!itemIds.has(id)) {
            toRemove.push(id);
        }
    });
    toRemove.forEach((id) => selectedItems.value.delete(id));
}, { deep: true });

// Drag and drop handlers
const handleDragStart = (event, item) => {
    draggedItem.value = item;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    // Opacity is handled via class binding, no need to set style directly
};

const handleDragEnd = (event) => {
    // Clear drag state - opacity is handled via class binding
    draggedItem.value = null;
    draggedOverIndex.value = null;
};

const handleDragOver = (event, item, displayIndex) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    draggedOverIndex.value = displayIndex;
};

const handleDrop = (event, dropItem, dropIndex) => {
    event.preventDefault();
    
    if (!draggedItem.value || draggedItem.value.id === dropItem.id) {
        draggedItem.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Don't allow dropping a parent into its own child
    const isDroppingIntoDescendant = (parentId, childId) => {
        const findItem = (items, targetId) => {
            for (const item of items) {
                if (item.id === targetId) return item;
                if (item.children) {
                    const found = findItem(item.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        };
        
        const draggedItemObj = findItem(localItems.value, draggedItem.value.id);
        if (!draggedItemObj) return false;
        
        const checkDescendants = (item, targetId) => {
            if (item.children) {
                for (const child of item.children) {
                    if (child.id === targetId) return true;
                    if (checkDescendants(child, targetId)) return true;
                }
            }
            return false;
        };
        
        return checkDescendants(draggedItemObj, dropItem.id);
    };

    if (isDroppingIntoDescendant(draggedItem.value.id, dropItem.id)) {
        draggedItem.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Find the dragged item in the tree and remove it
    const removeItemFromTree = (items, itemId) => {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === itemId) {
                return items.splice(i, 1)[0];
            }
            if (items[i].children) {
                const removed = removeItemFromTree(items[i].children, itemId);
                if (removed) return removed;
            }
        }
        return null;
    };

    // Find an item in the tree by ID
    const findItemInTree = (items, itemId) => {
        for (const item of items) {
            if (item.id === itemId) {
                return item;
            }
            if (item.children && item.children.length > 0) {
                const found = findItemInTree(item.children, itemId);
                if (found) return found;
            }
        }
        return null;
    };

    // Clone the tree structure
    const items = JSON.parse(JSON.stringify(localItems.value));
    
    // Remove dragged item
    const dragged = removeItemFromTree(items, draggedItem.value.id);
    if (!dragged) {
        draggedItem.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Find the drop target item in the tree
    const dropTarget = findItemInTree(items, dropItem.id);
    if (!dropTarget) {
        draggedItem.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Determine the target parent_id:
    // - If dragged and drop target have the same parent_id (are siblings), insert as sibling (reorder)
    // - Otherwise, make the dragged item a child of the drop target (move between parents)
    const draggedOriginalParent = dragged.parent_id;
    const dropTargetParent = dropTarget.parent_id;
    const areSiblings = draggedOriginalParent === dropTargetParent;
    
    let targetParentId;
    let insertAsChild = false;
    
    if (areSiblings) {
        // Same parent - insert as sibling before the drop target (reorder within same parent)
        targetParentId = dropTargetParent;
        insertAsChild = false;
    } else {
        // Different parents - make dragged item a child of drop target (move between parents)
        targetParentId = dropTarget.id;
        insertAsChild = true;
    }
    
    // Update the dragged item's parent_id
    dragged.parent_id = targetParentId;
    
    if (insertAsChild) {
        // Add as child of the drop target
        if (!dropTarget.children) {
            dropTarget.children = [];
        }
        dropTarget.children.push(dragged);
        
        // Ensure the drop target is expanded so we can see the new child
        if (props.hasDeepStructureEnabled) {
            expandedItems.value.add(dropTarget.id);
            saveExpandedItems();
        }
    } else {
        // Insert as sibling before the drop target
        // Determine which list to insert into based on the target parent
        let targetList = null;
        if (targetParentId) {
            // Find the parent item in the tree
            const findParent = (itemsList, parentId) => {
                for (const item of itemsList) {
                    if (item.id === parentId) return item;
                    if (item.children && item.children.length > 0) {
                        const found = findParent(item.children, parentId);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const parent = findParent(items, targetParentId);
            if (parent) {
                if (!parent.children) parent.children = [];
                targetList = parent.children;
            }
        } else {
            // Top level items
            targetList = items;
        }
        
        // Insert before the drop target in the appropriate list
        if (targetList) {
            const targetIndex = targetList.findIndex(item => item.id === dropTarget.id);
            if (targetIndex !== -1) {
                targetList.splice(targetIndex, 0, dragged);
            } else {
                // If drop target not found in the expected list, append to the end
                targetList.push(dragged);
            }
        } else {
            // Fallback: append to top level
            items.push(dragged);
        }
    }

    localItems.value = items;

    // Build order array with parent_id information
    // Use the actual parent_id from items (which is the collection ID for top-level items)
    const buildOrderArray = (items, parentId = null) => {
        const order = [];
        items.forEach((item, index) => {
            // Use item's actual parent_id if available, otherwise use the passed parentId
            const itemParentId = item.parent_id || parentId;
            order.push({
                id: item.id,
                order_index: index + 1,
                parent_id: itemParentId,
            });
            if (item.children && item.children.length > 0) {
                order.push(...buildOrderArray(item.children, item.id));
            }
        });
        return order;
    };

    // Get collection ID from first top-level item's parent_id, or use null
    const collectionId = items.length > 0 && items[0].parent_id ? items[0].parent_id : null;
    const order = buildOrderArray(items, collectionId);

    router.post(
        `${baseUrl.value}/reorder`,
        { order: order },
        {
            preserveScroll: true,
            onSuccess: () => {
                // Refresh items list to ensure consistency
                router.reload({ preserveScroll: true });
            },
            onError: () => {
                // Revert on error
                localItems.value = JSON.parse(JSON.stringify(props.items));
            },
        }
    );

    draggedItem.value = null;
    draggedOverIndex.value = null;
};

// Deep structure functions
const toggleExpanded = (itemId) => {
    if (expandedItems.value.has(itemId)) {
        expandedItems.value.delete(itemId);
    } else {
        expandedItems.value.add(itemId);
    }
    saveExpandedItems();
};

const isExpanded = (itemId) => {
    return expandedItems.value.has(itemId);
};

const openCreateChildForm = (parentId) => {
    if (!childForms.value[parentId]) {
        childForms.value[parentId] = useForm({
            parent_id: parentId,
            title: '',
        });
    }
    showCreateChildForm.value[parentId] = true;
};

const closeCreateChildForm = (parentId) => {
    showCreateChildForm.value[parentId] = false;
    if (childForms.value[parentId]) {
        childForms.value[parentId].reset();
    }
};

const submitCreateChild = (parentId) => {
    const form = childForms.value[parentId];
    if (!form || !form.title.trim()) {
        return;
    }

    // Expand parent item before creating child so it will be visible after reload
    expandedItems.value.add(parentId);
    saveExpandedItems();

    form.post(createChildUrl.value, {
        preserveScroll: true,
        onSuccess: () => {
            closeCreateChildForm(parentId);
            // Reload and re-expand the parent
            router.reload({ 
                preserveScroll: true,
                onSuccess: () => {
                    // Re-expand parent after reload
                    expandedItems.value.add(parentId);
                    saveExpandedItems();
                },
            });
        },
        forceFormData: true,
    });
};

// Helper to recursively flatten items with children for display
const flattenItems = (items, depth = 0, parentId = null) => {
    const result = [];
    
    items.forEach(item => {
        const flattenedItem = {
            ...item,
            _depth: depth,
            _parentId: parentId,
            _isChild: depth > 0,
        };
        result.push(flattenedItem);
        
        if (props.hasDeepStructureEnabled && item.children && item.children.length > 0) {
            if (isExpanded(item.id)) {
                // Recursively add children if parent is expanded
                const children = flattenItems(item.children, depth + 1, item.id);
                result.push(...children);
            }
        }
    });
    
    return result;
};

const displayItems = computed(() => {
    return flattenItems(localItems.value);
});

// Helper to find parent index in localItems
const getParentIndex = (itemId) => {
    return localItems.value.findIndex(p => p.id === itemId);
};

onMounted(() => {
    nextTick(() => {
        if (selectAllCheckbox.value) {
            selectAllCheckbox.value.indeterminate = isIndeterminate.value;
        }
    });
});
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div :class="containerClasses">
                <section class="section">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Module</p>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
                                {{ module.title }}
                                <span class="text-gray-400 text-base font-normal">/ {{ action.title }}</span>
                            </h1>
                            
                        </div>
                        <div class="text-right space-y-1">
                            <p class="text-xs font-semibold text-gray-500 uppercase">Item type</p>
                            <p class="text-sm text-gray-900 dark:text-white">{{ itemType.label }}</p>                            
                        </div>
                    </div>
                </section>

                <!-- Search Form -->
                <section class="section">
                    <h2 class="section-heading">Search Entries</h2>
                    <form @submit.prevent="performSearch" class="space-y-4">
                        <div>
                            <label class="form-label">Search</label>
                            <div class="flex items-center gap-2">
                                <div class="flex-1">
                                    <input
                                        v-model="searchForm.search"
                                        type="text"
                                        class="form-input"
                                        placeholder="Search by ID, title, content, or custom fields"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <button type="submit" class="btn btn-primary" :disabled="searchForm.processing">
                                        {{ searchForm.processing ? 'Searching...' : 'Search' }}
                                    </button>
                                    <button
                                        v-if="search"
                                        type="button"
                                        class="btn btn-outline"
                                        @click="clearSearch"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Search across ID, title, content, and custom field values
                            </p>
                        </div>
                    </form>
                </section>

                <section class="section">
                    <div class="flex items-center justify-between">
                        <h2 class="section-heading">Entries</h2>
                        <div class="flex items-center gap-3">
                            <button
                                v-if="selectedItems.size > 0"
                                type="button"
                                class="btn btn-outline-danger"
                                :disabled="isDeleting"
                                @click="deleteSelectedItems"
                            >
                                {{ isDeleting ? 'Deleting...' : `Delete ${selectedItems.size} selected` }}
                            </button>
                            <button type="button" class="btn btn-outline" @click="openCreateModal">
                                New entry
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th v-if="hasSortingEnabled" class="px-4 py-2 text-center w-12"></th>
                                    <th class="px-4 py-2 text-center w-12">
                                        <input
                                            ref="selectAllCheckbox"
                                            type="checkbox"
                                            class="form-checkbox"
                                            :checked="isAllSelected"
                                            @change="toggleSelectAll"
                                        />
                                    </th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-0">ID</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-0">Visible</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Title</th>
                                    <th
                                        v-for="column in columnsToShow"
                                        :key="column.node"
                                        class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300"
                                    >
                                        {{ column.title }}
                                    </th>
                                    <th v-if="hasDeepStructureEnabled" class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-20">Children</th>
                                    <th class="w-fit px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">Actions</th>
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
                                            'bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem?.id !== item.id && draggedOverIndex !== null,
                                            'bg-gray-50 dark:bg-gray-900/60': item._isChild,
                                        }"
                                        @dragstart="hasSortingEnabled && handleDragStart($event, item)"
                                        @dragend="hasSortingEnabled && handleDragEnd"
                                        @dragover.prevent="hasSortingEnabled && handleDragOver($event, item, index)"
                                        @drop="hasSortingEnabled && handleDrop($event, item, index)"
                                    >
                                    <td v-if="hasSortingEnabled" class="px-4 py-2 text-center">
                                        <div class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-move pointer-events-none select-none">
                                            <svg
                                                class="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M4 8h16M4 16h16"
                                                />
                                            </svg>
                                        </div>
                                    </td>
                                    <td class="px-4 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            class="form-checkbox"
                                            draggable="false"
                                            :checked="selectedItems.has(item.id)"
                                            @change.stop="toggleSelectItem(item.id)"
                                            @click.stop
                                        />
                                    </td>
                                    <td class="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        <span v-if="item._isChild" :style="{ paddingLeft: `${item._depth * 1.5}rem` }" class="inline-block">
                                            <span class="text-gray-400">├─</span>
                                        </span>
                                        #{{ item.id }}
                                    </td>
                                    <td class="px-4 py-2 whitespace-nowrap">
                                        <span
                                            class="px-2 py-0.5 rounded-full text-xs font-semibold"
                                            :class="item.visible
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                        >
                                            {{ item.visible ? 'Visible' : 'Hidden' }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-2">
                                        <Link
                                            :href="`${baseUrl}/edit?item=${item.id}`"
                                            class="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                                            preserve-scroll
                                        >
                                            {{ item.title || 'Untitled' }}
                                        </Link>
                                    </td>
                                    <td
                                        v-for="column in columnsToShow"
                                        :key="column.node"
                                        class="px-4 py-2"
                                    >
                                        {{ item.custom_field_values?.[column.node] ?? '-' }}
                                    </td>
                                    <td v-if="hasDeepStructureEnabled" class="px-4 py-2">
                                        <div class="flex items-center gap-2">
                                            <button
                                                v-if="item.children && item.children.length > 0"
                                                type="button"
                                                class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                draggable="false"
                                                @click.stop="toggleExpanded(item.id)"
                                                :title="isExpanded(item.id) ? 'Collapse' : 'Expand'"
                                            >
                                                <svg
                                                    class="w-4 h-4 transition-transform"
                                                    :class="{ 'rotate-90': isExpanded(item.id) }"
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
                                            <span v-if="item.children && item.children.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
                                                {{ item.children.length }}
                                            </span>
                                        </div>
                                    </td>
                                    <td class="w-fit px-2 py-2 whitespace-nowrap" style="width: 1%;">
                                        <div class="btn-group" role="group">
                                            <button
                                                v-if="hasDeepStructureEnabled"
                                                type="button"
                                                class="btn-group-item-edit"
                                                draggable="false"
                                                @click.stop="openCreateChildForm(item.id)"
                                                title="Add child"
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
                                                :href="`${baseUrl}/edit?item=${item.id}`"
                                                class="btn-group-item-edit"
                                                preserve-scroll
                                                @click.stop
                                                title="Edit"
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
                                                draggable="false"
                                                @click.stop="deleteItem(item)"
                                                title="Delete"
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
                                    v-if="hasDeepStructureEnabled && showCreateChildForm[item.id]"
                                    class="bg-blue-50 dark:bg-blue-900/20"
                                >
                                    <!-- Drag handle column (if sorting enabled) -->
                                    <td v-if="hasSortingEnabled" class="px-4 py-2"></td>
                                    <!-- Checkbox column -->
                                    <td class="px-4 py-2"></td>
                                    <!-- ID column -->
                                    <td class="px-4 py-2"></td>
                                    <!-- Visible column -->
                                    <td class="px-4 py-2"></td>
                                    <!-- Title column with form -->
                                    <td :colspan="1 + columnsToShow.length + (hasDeepStructureEnabled ? 1 : 0) + 1" class="px-4 py-2">
                                        <form class="flex items-center gap-2" @submit.prevent="submitCreateChild(item.id)">
                                            <input
                                                v-model="childForms[item.id].title"
                                                type="text"
                                                class="form-input flex-1"
                                                placeholder="Child item title"
                                                required
                                                autofocus
                                            />
                                            <button type="submit" class="btn btn-primary btn-sm" :disabled="childForms[item.id]?.processing">
                                                {{ childForms[item.id]?.processing ? 'Creating...' : 'Create' }}
                                            </button>
                                            <button type="button" class="btn-text btn-sm" @click="closeCreateChildForm(item.id)">
                                                Cancel
                                            </button>
                                        </form>
                                        <p v-if="childForms[item.id]?.errors?.title" class="mt-1 text-sm text-red-600">
                                            {{ childForms[item.id].errors.title }}
                                        </p>
                                    </td>
                                </tr>
                                </template>
                                <tr v-if="localItems.length === 0">
                                    <td :colspan="(hasSortingEnabled ? 1 : 0) + 1 + 1 + 1 + 1 + columnsToShow.length + (hasDeepStructureEnabled ? 1 : 0) + 1" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        {{ search ? 'No entries found matching your search.' : 'No entries yet.' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div v-if="pagination" class="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                        <div class="flex flex-1 justify-between sm:hidden">
                            <Link
                                v-if="pagination.current_page > 1"
                                :href="`${baseUrl}?page=${pagination.current_page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`"
                                class="btn-text"
                            >
                                Previous
                            </Link>
                            <span v-else class="text-gray-400">Previous</span>
                            
                            <Link
                                v-if="pagination.current_page < pagination.last_page"
                                :href="`${baseUrl}?page=${pagination.current_page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`"
                                class="btn-text"
                            >
                                Next
                            </Link>
                            <span v-else class="text-gray-400">Next</span>
                        </div>
                        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p class="text-sm text-gray-700 dark:text-gray-300">
                                    Showing
                                    <span class="font-medium">{{ pagination.from }}</span>
                                    to
                                    <span class="font-medium">{{ pagination.to }}</span>
                                    of
                                    <span class="font-medium">{{ pagination.total }}</span>
                                    results
                                </p>
                            </div>
                            <div>
                                <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
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
                                </nav>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        <ModalDialog :open="createModalOpen" title="Create entry" @close="closeCreateModal">
            <form class="space-y-4" @submit.prevent="submitCreate">
                <!-- Title field (always required) -->
                <div class="space-y-1">
                    <label class="form-label">Title</label>
                    <input
                        v-model="createForm.title"
                        type="text"
                        class="form-input"
                        required
                        placeholder="Enter title"
                    />
                    <p v-if="createForm.errors.title" class="text-sm text-red-600">
                        {{ createForm.errors.title }}
                    </p>
                </div>

                <!-- Visible field (only if visible is in basic fields) -->
                <div v-if="hasField('visible')" class="space-y-1">
                    <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                        <input v-model="createForm.visible" type="checkbox" class="form-checkbox" />
                        <span class="ml-2">Visible</span>
                    </label>
                    <p v-if="createForm.errors.visible" class="text-sm text-red-600">
                        {{ createForm.errors.visible }}
                    </p>
                </div>

                <div class="flex items-center justify-end gap-3">
                    <button type="button" class="btn-text" @click="closeCreateModal">Cancel</button>
                    <button type="submit" class="btn btn-primary" :disabled="createForm.processing">
                        {{ createForm.processing ? 'Creating…' : 'Create' }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </AdminLayout>
</template>
