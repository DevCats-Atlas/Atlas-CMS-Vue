<script setup>
import { computed, ref, watch } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { confirmDialog } from '@admin/js/utils/confirmDialog.js';
import { useTranslation } from '@admin/js/utils/useTranslation';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import MultiSelect from './components/MultiSelect.vue';
import RelationshipFilterSelect from './components/RelationshipFilterSelect.vue';
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
    // relationships prop removed - relationships are managed on Edit page only
    // Keeping prop for backward compatibility but not using it
    relationships: {
        type: Array,
        default: () => [],
    },
    filterConfig: {
        type: Object,
        default: null,
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const createChildUrl = computed(() => `${baseUrl.value}/create-child`);

// Debug: Log hasDeepStructure to ensure it's being passed correctly
// console.log('hasDeepStructure:', props.hasDeepStructure, 'parentColumn:', props.parentColumn);

// Create child form state
const showCreateChildForm = ref({}); // { [parentId]: boolean }
const childForms = ref({}); // { [parentId]: Form }

// Filter state management
const hasFilterConfig = computed(() => {
    return props.filterConfig && props.filterConfig.filters && props.filterConfig.filters.length > 0;
});

// Initialize filter values from query parameters
const filterValues = ref({});
const defaultSearchValue = ref(props.search || '');

// Initialize filter values from URL query params
const initializeFilters = () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Initialize default search
    defaultSearchValue.value = urlParams.get('search') || '';
    
    console.log('Index - Initializing filters from URL:', window.location.search);
    
    // Initialize custom filters
    if (props.filterConfig && props.filterConfig.filters) {
        props.filterConfig.filters.forEach(filter => {
            if (!filter.enabled) return;
            
            const filterId = filter.id;
            const filterKey = `filter[${filterId}]`;
            const value = urlParams.get(filterKey);
            
            // Check for array values (multiple select) - Laravel uses indexed notation: filter[filterId][0], filter[filterId][1]
            // Only check for arrays if the filter is configured as multiple
            const arrayValues = [];
            if (filter.multiple) {
                let index = 0;
                while (true) {
                    const arrayValue = urlParams.get(`${filterKey}[${index}]`);
                    if (arrayValue === null) break;
                    arrayValues.push(arrayValue);
                    index++;
                }
            }
            
            if (arrayValues.length > 0) {
                filterValues.value[filterId] = arrayValues;
                console.log(`Index - Initialized filter ${filterId} as array:`, arrayValues);
            } else if (value !== null) {
                // Handle range values (e.g., filter[field][from]=value1&filter[field][to]=value2)
                const fromValue = urlParams.get(`${filterKey}[from]`);
                const toValue = urlParams.get(`${filterKey}[to]`);
                if (fromValue !== null || toValue !== null) {
                    filterValues.value[filterId] = {
                        from: fromValue || '',
                        to: toValue || '',
                    };
                } else {
                    filterValues.value[filterId] = value;
                }
                console.log(`Index - Initialized filter ${filterId} as single value:`, filterValues.value[filterId]);
            } else {
                // Initialize range values for range operators if not in URL
                if (filter.operator === 'range' && !filterValues.value[filterId]) {
                    filterValues.value[filterId] = { from: '', to: '' };
                }
            }
        });
    }
    
    console.log('Index - Initialized filterValues:', filterValues.value);
};

// Initialize on mount
initializeFilters();

// Watch for filter config changes
watch(() => props.filterConfig, () => {
    initializeFilters();
}, { deep: true });

// Build query parameters from filter values
const buildFilterParams = () => {
    const params = {};
    
    // Add default search if enabled and has value
    if (props.filterConfig?.default_search?.enabled && defaultSearchValue.value && defaultSearchValue.value.trim() !== '') {
        params.search = defaultSearchValue.value.trim();
    }
    
    // Add custom filter values
    Object.keys(filterValues.value).forEach(filterId => {
        const value = filterValues.value[filterId];
        
        // Check if value is not empty
        const isEmpty = value === null || value === undefined || value === '' || 
                       (Array.isArray(value) && value.length === 0) ||
                       (typeof value === 'object' && !Array.isArray(value) && !value.from && !value.to);
        
        if (!isEmpty) {
            // Handle array values (for multiple select)
            if (Array.isArray(value) && value.length > 0) {
                // For arrays, use indexed notation: filter[filterId][0], filter[filterId][1], etc.
                // This is how Laravel expects array parameters
                const filteredArray = value.filter(v => v !== null && v !== undefined && v !== '');
                if (filteredArray.length > 0) {
                    filteredArray.forEach((v, index) => {
                        params[`filter[${filterId}][${index}]`] = String(v);
                    });
                }
            } 
            // Handle range values
            else if (typeof value === 'object' && !Array.isArray(value) && (value.from || value.to)) {
                if (value.from && value.from.toString().trim() !== '') {
                    params[`filter[${filterId}][from]`] = value.from.toString().trim();
                }
                if (value.to && value.to.toString().trim() !== '') {
                    params[`filter[${filterId}][to]`] = value.to.toString().trim();
                }
            }
            // Handle single values
            else if (!Array.isArray(value)) {
                params[`filter[${filterId}]`] = String(value).trim();
            }
        }
    });
    
    return params;
};

// Apply filters
const applyFilters = () => {
    const params = buildFilterParams();
    console.log('Index - Applying filters with params:', params);
    console.log('Index - Current filterValues:', filterValues.value);
    
    // Build URL with query string for debugging
    const queryString = Object.keys(params).map(key => {
        const value = params[key];
        if (Array.isArray(value)) {
            return value.map((v, i) => `${encodeURIComponent(key)}[${i}]=${encodeURIComponent(v)}`).join('&');
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }).join('&');
    console.log('Index - Query string:', queryString);
    
    // Use router.get with query parameters - Inertia will add them to URL
    router.get(baseUrl.value, params, {
        preserveState: false,
        preserveScroll: true,
        only: ['items', 'search', 'pagination', 'filterConfig'],
        onSuccess: () => {
            console.log('Index - Navigation successful, URL:', window.location.href);
        },
    });
};

// Clear specific filter
const clearFilter = (filterId) => {
    delete filterValues.value[filterId];
    applyFilters();
};

// Clear all filters
const clearAllFilters = () => {
    filterValues.value = {};
    defaultSearchValue.value = '';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['items', 'search', 'pagination', 'filterConfig'],
    });
};

// Legacy search form (for backward compatibility when no filter config)
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

// Get active filters count
const activeFiltersCount = computed(() => {
    let count = 0;
    if (defaultSearchValue.value) count++;
    Object.keys(filterValues.value).forEach(key => {
        const value = filterValues.value[key];
        if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value) && value.length > 0) {
                count++;
            } else if (typeof value === 'object' && (value.from || value.to)) {
                count++;
            } else if (typeof value !== 'object') {
                count++;
            }
        }
    });
    return count;
});

// Initialize range values properly
watch(() => props.filterConfig, (newConfig) => {
    if (newConfig && newConfig.filters) {
        newConfig.filters.forEach(filter => {
            if (filter.type === 'field' && filter.operator === 'range' && !filterValues.value[filter.id]) {
                filterValues.value[filter.id] = { from: '', to: '' };
            }
        });
    }
}, { deep: true, immediate: true });

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

// Get select options for a field
const getSelectOptions = (fieldName) => {
    const fieldConfig = props.uiConfig[fieldName];
    if (!fieldConfig) return [];
    
    // If options is already an array (from backend), use it directly
    const optionsData = fieldConfig.options || fieldConfig.config?.options;
    if (Array.isArray(optionsData)) {
        return optionsData.map(opt => {
            if (typeof opt === 'string') {
                return { key: opt, label: opt };
            }
            return {
                key: opt.key || opt.value || String(opt),
                label: opt.label || opt.name || opt.key || opt.value || String(opt),
            };
        });
    }
    
    // Parse options from string
    const optionsString = optionsData || '';
    if (!optionsString || typeof optionsString !== 'string') return [];
    
    // Auto-detect format if it looks like value_label format (contains = and newlines)
    const hasEquals = optionsString.includes('=');
    const hasNewlines = optionsString.includes('\n');
    const looksLikeValueLabel = hasEquals && hasNewlines;
    
    // Handle different option formats
    if (fieldConfig.select_type === 'static') {
        let inputType = fieldConfig.select_input_type || 'comma';
        
        // Auto-detect: if string has = and newlines, treat as value_label
        if (looksLikeValueLabel && inputType === 'comma') {
            inputType = 'value_label';
        }
        
        if (inputType === 'comma') {
            return optionsString.split(',').map(opt => {
                const trimmed = opt.trim();
                return { key: trimmed, label: trimmed };
            }).filter(opt => opt.key);
        } else if (inputType === 'newline') {
            return optionsString.split('\n').map(opt => {
                const trimmed = opt.trim();
                return { key: trimmed, label: trimmed };
            }).filter(opt => opt.key);
        } else if (inputType === 'value_label') {
            // Handle both = and : separators
            return optionsString.split('\n').map(opt => {
                const trimmed = opt.trim();
                if (!trimmed) return null;
                
                // Try = first (most common), then :
                if (trimmed.includes('=')) {
                    const parts = trimmed.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const label = parts.slice(1).join('=').trim(); // Join in case label contains '='
                        return { key, label: label || key };
                    }
                } else if (trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const label = parts.slice(1).join(':').trim(); // Join in case label contains ':'
                        return { key, label: label || key };
                    }
                }
                
                // If no separator found, use the whole line as both key and label
                return { key: trimmed, label: trimmed };
            }).filter(opt => opt !== null && opt.key);
        }
    }
    
    return [];
};

// Get display text for select field
const getSelectDisplayText = (filterId, fieldName) => {
    const value = filterValues.value[filterId];
    if (!value || value === '') return '';
    
    const options = getSelectOptions(fieldName);
    if (Array.isArray(value)) {
        // Multiple select - show comma-separated labels
        return value.map(v => {
            const option = options.find(opt => String(opt.key) === String(v));
            return option ? option.label : v;
        }).filter(Boolean).join(', ');
    } else {
        // Single select - show label
        const option = options.find(opt => String(opt.key) === String(value));
        return option ? option.label : String(value);
    }
};

// Format filter value for display
const formatFilterValue = (value, filter) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }
    
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    
    if (typeof value === 'object' && (value.from || value.to)) {
        const parts = [];
        if (value.from) parts.push(`From: ${value.from}`);
        if (value.to) parts.push(`To: ${value.to}`);
        return parts.join(', ');
    }
    
    // Format based on filter type
    if (filter && filter.type === 'field' && filter.field && props.uiConfig[filter.field]?.interface === 'checkbox') {
        return value === '1' || value === 1 || value === true ? 'Yes' : 'No';
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

// Tree structure support
const expandedItems = ref(new Set());

const isExpanded = (itemId) => {
    return expandedItems.value.has(String(itemId));
};

// Drag and drop for tree reordering
const draggedItem = ref(null);
const draggedOverIndex = ref(null);

// Check if reordering is enabled (sorting, tree structure, or legacy order_index)
const canReorder = computed(() => {
    return props.hasSortingEnabled || props.hasDeepStructure || props.hasOrderIndex;
});

const handleDragStart = (event, item) => {
    if (!canReorder.value) {
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
    if (!canReorder.value || !draggedItem.value) {
        return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    draggedOverIndex.value = index;
};

const handleDrop = async (event, dropItem, dropIndex) => {
    if (!canReorder.value || !draggedItem.value) {
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
            <div :class="['mx-auto sm:px-6 lg:px-8 space-y-6', hasWideLayout ? '' : 'max-w-7xl']">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="heading-1">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Table: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary" @click="router.visit(baseUrl + '/create')">
                            {{ t('admin.common.create') }}
                        </button>
                    </div>

                    <!-- Filter Form -->
                    <div v-if="hasFilterConfig" class="mb-6 pb-4 border-divider">
                        <form @submit.prevent="applyFilters">
                            <!-- Compact Grid Layout -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                <!-- Default Search -->
                                <div v-if="props.filterConfig?.default_search?.enabled" class="md:col-span-2 lg:col-span-3 xl:col-span-4">
                                    <div class="flex items-center gap-2">
                                        <div class="flex-1">
                                            <input
                                                v-model="defaultSearchValue"
                                                type="text"
                                                class="form-input"
                                                :placeholder="props.filterConfig.default_search.placeholder || t('admin.common.search')"
                                            />
                                        </div>
                                        <button type="submit" class="btn btn-primary whitespace-nowrap">
                                            {{ t('admin.common.search') }}
                                        </button>
                                        <button
                                            v-if="activeFiltersCount > 0"
                                            type="button"
                                            class="btn btn-outline whitespace-nowrap"
                                            @click="clearAllFilters"
                                        >
                                            {{ t('admin.common.clear_all') }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Custom Filters -->
                                <div
                                    v-for="filter in (props.filterConfig?.filters || [])"
                                    :key="filter.id"
                                    v-show="filter && filter.enabled"
                                    class="flex items-start gap-2"
                                >
                                    <div class="flex-1 min-w-0">
                                        <label class="form-label text-xs mb-1">{{ filter.label }}</label>
                                        
                                        <!-- Search Filter -->
                                        <input
                                            v-if="filter.type === 'search'"
                                            v-model="filterValues[filter.id]"
                                            type="text"
                                            class="form-input text-sm"
                                            :placeholder="filter.placeholder || filter.label"
                                        />
                                        
                                        <!-- Field Filter: Select (Single) -->
                                        <div v-else-if="filter.type === 'field' && uiConfig[filter.field]?.interface === 'select' && !filter.multiple" class="relative">
                                            <select
                                                v-model="filterValues[filter.id]"
                                                class="form-select text-sm"
                                            >
                                                <option value="">{{ filter.placeholder || 'Select...' }}</option>
                                                <option
                                                    v-for="option in getSelectOptions(filter.field)"
                                                    :key="option.key"
                                                    :value="option.key"
                                                >
                                                    {{ option.label }}
                                                </option>
                                            </select>
                                        </div>
                                        
                                        <!-- Field Filter: Select (Multiple) -->
                                        <MultiSelect
                                            v-else-if="filter.type === 'field' && uiConfig[filter.field]?.interface === 'select' && filter.multiple"
                                            :options="getSelectOptions(filter.field)"
                                            :model-value="Array.isArray(filterValues[filter.id]) ? filterValues[filter.id] : (filterValues[filter.id] ? [filterValues[filter.id]] : [])"
                                            :placeholder="filter.placeholder || filter.label"
                                            @update:model-value="(val) => { filterValues[filter.id] = val; }"
                                        />
                                        
                                        <!-- Field Filter: Date/DateTime -->
                                        <div v-else-if="filter.type === 'field' && (uiConfig[filter.field]?.interface === 'date' || uiConfig[filter.field]?.interface === 'datetime')" class="flex gap-1">
                                            <input
                                                v-if="filter.operator === 'range'"
                                                v-model="filterValues[filter.id].from"
                                                :type="uiConfig[filter.field]?.interface === 'datetime' ? 'datetime-local' : 'date'"
                                                class="form-input text-sm flex-1"
                                                placeholder="From"
                                            />
                                            <input
                                                v-if="filter.operator === 'range'"
                                                v-model="filterValues[filter.id].to"
                                                :type="uiConfig[filter.field]?.interface === 'datetime' ? 'datetime-local' : 'date'"
                                                class="form-input text-sm flex-1"
                                                placeholder="To"
                                            />
                                            <input
                                                v-else
                                                v-model="filterValues[filter.id]"
                                                :type="uiConfig[filter.field]?.interface === 'datetime' ? 'datetime-local' : 'date'"
                                                class="form-input text-sm"
                                            />
                                        </div>
                                        
                                        <!-- Field Filter: Checkbox -->
                                        <select
                                            v-else-if="filter.type === 'field' && uiConfig[filter.field]?.interface === 'checkbox'"
                                            v-model="filterValues[filter.id]"
                                            class="form-select text-sm"
                                        >
                                            <option value="">Any</option>
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                        </select>
                                        
                                        <!-- Field Filter: Number/Text Range -->
                                        <div v-else-if="filter.type === 'field' && filter.operator === 'range'" class="flex gap-1">
                                            <input
                                                v-model="filterValues[filter.id].from"
                                                type="number"
                                                class="form-input text-sm flex-1"
                                                placeholder="Min"
                                            />
                                            <input
                                                v-model="filterValues[filter.id].to"
                                                type="number"
                                                class="form-input text-sm flex-1"
                                                placeholder="Max"
                                            />
                                        </div>
                                        
                                        <!-- Field Filter: Number/Text -->
                                        <input
                                            v-else-if="filter.type === 'field'"
                                            v-model="filterValues[filter.id]"
                                            type="text"
                                            class="form-input text-sm"
                                            :placeholder="filter.placeholder || filter.label"
                                        />
                                        
                                        <!-- Relationship Filter -->
                                        <RelationshipFilterSelect
                                            v-else-if="filter.type === 'relationship'"
                                            :filter="filter"
                                            :relationships="relationships"
                                            :module-handle="moduleHandle"
                                            v-model="filterValues[filter.id]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- Active Filters Display -->
                            <div v-if="activeFiltersCount > 0" class="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span class="text-sm text-gray-600 dark:text-gray-400">{{ t('admin.common.active_filters') }}:</span>
                                <span
                                    v-if="defaultSearchValue"
                                    class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm"
                                >
                                    {{ props.filterConfig?.default_search?.label || t('admin.common.search') }}: {{ defaultSearchValue }}
                                    <button
                                        type="button"
                                        @click="defaultSearchValue = ''; applyFilters()"
                                        class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                    >
                                        ×
                                    </button>
                                </span>
                                <template v-if="props.filterConfig && props.filterConfig.filters">
                                    <span
                                        v-for="filter in props.filterConfig.filters"
                                        :key="filter.id"
                                        v-if="filter && filter.enabled && filterValues[filter.id]"
                                        class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-sm"
                                    >
                                        {{ filter.label }}: {{ formatFilterValue(filterValues[filter.id], filter) }}
                                        <button
                                            type="button"
                                            @click="clearFilter(filter.id)"
                                            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                                        >
                                            ×
                                        </button>
                                    </span>
                                </template>
                            </div>
                        </form>
                    </div>

                    <!-- Legacy Search Form (backward compatibility) -->
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
                                <template v-for="(item, index) in finalDisplayItems" :key="item[props.primaryKeyColumn]">
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
                                    @dragover.prevent="canReorder && handleDragOver($event, item, index)"
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
                                    class="pagination-link"
                                    :class="{
                                        'pagination-link-inactive': link.url && !link.active,
                                        'pagination-link-active': link.active,
                                        'pagination-link-disabled': !link.url
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

