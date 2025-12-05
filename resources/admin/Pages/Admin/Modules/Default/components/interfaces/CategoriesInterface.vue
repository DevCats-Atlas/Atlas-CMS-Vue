<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { usePage } from '@inertiajs/vue3';
import { useToast } from '@/composables/useToast.js';

const props = defineProps({
    field: {
        type: Object,
        required: true,
    },
    model: {
        type: Object,
        default: () => ({}),
    },
});

const page = usePage();
const { showToast } = useToast();
const categories = ref([]);
const loading = ref(false);
const isMounted = ref(false);
const toggling = ref({}); // Track which category is being toggled
const searchQuery = ref(''); // Search query for filtering unselected items
const searchInputRef = ref(null); // Reference to search input element

// Drag and drop state
const draggedCategory = ref(null);
const draggedOverIndex = ref(null);

const rootId = computed(() => props.field.config?.root_id);
const relationship = computed(() => props.field.config?.relationship);
const includeDescendants = computed(() => props.field.config?.with_children === true);
const filterItemTypeId = computed(() => props.field.config?.filter_item_type_id);

// Filter categories: show all selected + filtered unselected based on search
const filteredCategories = computed(() => {
    const selected = categories.value.filter(c => c.selected);
    const unselected = categories.value.filter(c => !c.selected);
    
    // If search query is empty, show all unselected
    if (!searchQuery.value.trim()) {
        return [...selected, ...unselected];
    }
    
    // Filter unselected by title (case-insensitive)
    const query = searchQuery.value.trim().toLowerCase();
    const filteredUnselected = unselected.filter(category => {
        const title = (category.title || '').toLowerCase();
        return title.includes(query);
    });
    
    return [...selected, ...filteredUnselected];
});

// Get current item ID - try from page props first (for users module), then fall back to URL query parameter
const currentItemId = computed(() => {
    // First, try to get item ID from page props (works for users module)
    const pageProps = page.props;
    if (pageProps?.item?.id) {
        return parseInt(pageProps.item.id, 10);
    }
    
    // Fall back to URL query parameter (for regular modules)
    const url = new URL(window.location.href);
    const itemParam = url.searchParams.get('item');
    return itemParam ? parseInt(itemParam, 10) : null;
});

// Get module handle from URL path (e.g., /admin/content/edit -> content)
const moduleHandle = computed(() => {
    const path = page.url;
    const match = path.match(/\/admin\/([^/]+)/);
    return match ? match[1] : '';
});

const baseUrl = computed(() => {
    if (!moduleHandle.value) {
        return '';
    }
    return `/admin/${moduleHandle.value}`;
});

const fetchCategories = async () => {
    if (!isMounted.value || !currentItemId.value || !props.field.id || !rootId.value || !relationship.value) {
        return;
    }

    loading.value = true;
    try {
        const response = await fetch(
            `${baseUrl.value}/categories?item_id=${currentItemId.value}&field_id=${props.field.id}`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            }
        );

        if (!response.ok || !isMounted.value) {
            throw new Error('Failed to fetch categories');
        }

        const data = await response.json();
        if (isMounted.value) {
            categories.value = data.categories || [];
        }
    } catch (error) {
        if (isMounted.value) {
            console.error('Error fetching categories:', error);
            categories.value = [];
        }
    } finally {
        if (isMounted.value) {
            loading.value = false;
        }
    }
};

onMounted(() => {
    isMounted.value = true;
    fetchCategories();
});

onBeforeUnmount(() => {
    isMounted.value = false;
});

// Watch for changes in item ID or field ID to refetch
watch(
    () => [currentItemId.value, props.field.id],
    () => {
        if (isMounted.value) {
            fetchCategories();
        }
    },
    { immediate: false }
);

const toggleCategory = async (category) => {
    if (!currentItemId.value || !props.field.id) {
        return;
    }

    const newSelected = !category.selected;
    const categoryId = category.id;

    // Track toggling state
    toggling.value[categoryId] = true;

    // Store original state for potential revert
    const originalCategory = { ...category };
    const originalCategories = [...categories.value];

    // Optimistically update UI locally
    const categoryIndex = categories.value.findIndex((c) => c.id === categoryId);
    if (categoryIndex !== -1) {
        if (newSelected) {
            // If selecting, calculate max order_index from currently selected items (before adding this one)
            const selectedCategories = categories.value.filter(c => c.selected);
            const maxOrder = selectedCategories.reduce((max, c) => {
                return Math.max(max, c.order_index || 0);
            }, 0);
            
            // Update the category
            categories.value[categoryIndex].selected = true;
            categories.value[categoryIndex].order_index = maxOrder + 1;
        } else {
            // If unselecting, remove order_index
            categories.value[categoryIndex].selected = false;
            categories.value[categoryIndex].order_index = null;
        }
        
        // Reorder: selected first (sorted by order_index), then unselected
        const selected = categories.value.filter(c => c.selected);
        const unselected = categories.value.filter(c => !c.selected);
        
        selected.sort((a, b) => {
            const orderA = a.order_index ?? 999999;
            const orderB = b.order_index ?? 999999;
            if (orderA === orderB) {
                return a.id - b.id;
            }
            return orderA - orderB;
        });
        
        categories.value = [...selected, ...unselected];
        
        // Clear search query when category is selected (since selected items are always shown)
        if (newSelected) {
            searchQuery.value = '';
        }
    }

    try {
        const response = await fetch(`${baseUrl.value}/categories/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                item_id: currentItemId.value,
                category_id: categoryId,
                field_id: props.field.id,
                selected: newSelected,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to toggle category' }));
            const errorMessage = errorData.error || 'Failed to toggle category';
            
            // Show error toast
            showToast({
                title: 'Error',
                message: errorMessage,
                intent: 'danger',
            });
            
            throw new Error(errorMessage);
        }

        // Success - UI already updated optimistically, no need to refetch
        // Show success toast
        const category = categories.value.find(c => c.id === categoryId);
        const categoryName = category?.title || `Category #${categoryId}`;
        showToast({
            title: 'Success',
            message: newSelected 
                ? `${categoryName} has been assigned successfully.`
                : `${categoryName} has been unassigned successfully.`,
            intent: 'success',
        });
    } catch (error) {
        console.error('Error toggling category:', error);
        // Revert optimistic update on error
        categories.value = originalCategories;
    } finally {
        toggling.value[categoryId] = false;
    }
};

// Drag and drop handlers for sorting selected categories
const handleDragStart = (event, category) => {
    // Only allow dragging selected categories
    if (!category.selected) {
        event.preventDefault();
        return;
    }
    
    draggedCategory.value = category;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.target.style.opacity = '0.5';
};

const handleDragEnd = (event) => {
    event.target.style.opacity = '';
    draggedCategory.value = null;
    draggedOverIndex.value = null;
};

const handleDragOver = (event, category, index) => {
    event.preventDefault();
    
    // Only allow dropping on selected categories
    if (!category?.selected) {
        return;
    }
    
    event.dataTransfer.dropEffect = 'move';
    draggedOverIndex.value = index;
};

const handleDrop = (event, dropCategory) => {
    event.preventDefault();
    
    if (!draggedCategory.value || !draggedCategory.value.selected) {
        draggedCategory.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Only allow reordering within selected categories
    const selectedCategories = categories.value.filter(c => c.selected);
    const draggedIndex = selectedCategories.findIndex(c => c.id === draggedCategory.value.id);
    
    if (draggedIndex === -1) {
        draggedCategory.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Get the drop index within selected categories
    if (!dropCategory?.selected) {
        draggedCategory.value = null;
        draggedOverIndex.value = null;
        return;
    }

    const dropIndexInSelected = selectedCategories.findIndex(c => c.id === dropCategory.id);
    
    if (dropIndexInSelected === -1 || draggedIndex === dropIndexInSelected) {
        draggedCategory.value = null;
        draggedOverIndex.value = null;
        return;
    }

    // Reorder selected categories locally
    const reorderedSelected = [...selectedCategories];
    const [dragged] = reorderedSelected.splice(draggedIndex, 1);
    reorderedSelected.splice(dropIndexInSelected, 0, dragged);

    // Update order_index for reordered items
    const order = reorderedSelected.map((cat, index) => ({
        id: cat.id,
        order_index: index + 1,
    }));

    // Update categories array: reordered selected first, then unselected
    const unselectedCategories = categories.value.filter(c => !c.selected);
    categories.value = [...reorderedSelected, ...unselectedCategories];

    // Send reorder request to backend
    fetch(`${baseUrl.value}/categories/reorder`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            item_id: currentItemId.value,
            field_id: props.field.id,
            order: order,
        }),
    })
        .then(async (response) => {
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to reorder categories' }));
                const errorMessage = errorData.error || 'Failed to reorder categories';
                
                // Show error toast
                showToast({
                    title: 'Error',
                    message: errorMessage,
                    intent: 'danger',
                });
                
                // Revert on error by refetching
                fetchCategories();
            }
        })
        .catch((error) => {
            console.error('Error reordering categories:', error);
            
            // Show error toast
            showToast({
                title: 'Error',
                message: 'Failed to reorder categories',
                intent: 'danger',
            });
            
            // Revert on error by refetching
            fetchCategories();
        });

    draggedCategory.value = null;
    draggedOverIndex.value = null;
};
</script>

<template>
    <div class="space-y-4">
        <div>
            <label v-if="!(field.config?.hide_title === true)" class="form-label block mb-1">
                {{ field.title }}
            </label>
            <p v-if="rootId" class="text-xs text-gray-500 dark:text-gray-400">
                Root ID: <span class="font-mono">{{ rootId }}</span>
                <span v-if="relationship"> · Relationship: <span class="font-mono">{{ relationship }}</span></span>
                <span v-if="filterItemTypeId"> · Filter: Item Type ID <span class="font-mono">{{ filterItemTypeId }}</span></span>
            </p>
            <p v-else class="text-xs text-red-500 dark:text-red-400">
                No root_id configured
            </p>
            <p v-if="includeDescendants && rootId" class="text-xs text-gray-500 dark:text-gray-400">
                Showing all descendants of the selected root item.
            </p>
        </div>

        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Loading categories...
        </div>

        <div v-else-if="!rootId || !relationship" class="text-sm text-red-500 dark:text-red-400 py-4">
            Please configure root_id and relationship in the field settings.
        </div>

        <div v-else-if="!currentItemId" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            Item must be saved before managing categories.
        </div>

        <div v-else-if="categories.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            No categories available.
        </div>

        <div v-else class="space-y-2">
            <!-- Search box for unselected items -->
            <div class="mb-4">
                <input
                    ref="searchInputRef"
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search categories..."
                    class="form-input w-full"
                    @keydown.esc="searchQuery = ''; $nextTick(() => searchInputRef?.focus())"
                />
            </div>

            <div
                v-for="(category, index) in filteredCategories"
                :key="category.id"
                :draggable="category.selected"
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                :class="{
                    'cursor-move': category.selected,
                    'opacity-50': draggedCategory?.id === category.id,
                    'ring-2 ring-blue-500': draggedOverIndex === index && draggedCategory?.id !== category.id && category.selected,
                }"
                @dragstart="handleDragStart($event, category)"
                @dragend="handleDragEnd"
                @dragover.prevent="handleDragOver($event, category, index)"
                @drop="handleDrop($event, category)"
            >
                <!-- Toggle checkbox -->
                <label class="flex items-center cursor-pointer" @mousedown.stop @click.stop>
                    <input
                        type="checkbox"
                        :checked="category.selected"
                        :disabled="toggling[category.id]"
                        class="form-checkbox h-5 w-5 text-primary-600 dark:text-primary-500 rounded border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:focus:ring-primary-400 focus:ring-2"
                        @change.stop="toggleCategory(category)"
                    />
                </label>

                <!-- Category info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <div class="flex-1 min-w-0">
                            <!-- Show breadcrumbs inline with title for second level and deeper -->
                            <p v-if="includeDescendants && category.breadcrumbs && category.breadcrumbs.length > 0" class="text-sm font-medium text-gray-900 dark:text-white truncate">
                                <span class="text-gray-500 dark:text-gray-400">
                                    <template v-for="(crumb, idx) in category.breadcrumbs" :key="crumb.id">
                                        <span>{{ crumb.title }}</span>
                                        <span class="mx-1 text-gray-400 dark:text-gray-500">›</span>
                                    </template>
                                </span>
                                <span class="text-gray-900 dark:text-white font-medium">{{ category.title }}</span>
                            </p>
                            <!-- Just title for first level items -->
                            <p v-else class="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {{ category.title }}
                            </p>
                        </div>
                        <span
                            v-if="!category.visible"
                            class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 flex-shrink-0"
                        >
                            Hidden
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        #{{ category.id }}
                    </p>
                </div>

                <!-- Loading indicator -->
                <div v-if="toggling[category.id]" class="flex-shrink-0">
                    <svg
                        class="animate-spin h-5 w-5 text-gray-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        ></circle>
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>
