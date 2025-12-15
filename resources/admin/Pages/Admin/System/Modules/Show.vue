<script setup>
import { ref, watch, computed } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import DataSourceUiBuilder from './components/DataSourceUiBuilder.vue';
import RelationshipModal from './components/RelationshipModal.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Module',
    },
    module: {
        type: Object,
        required: true,
    },
    actions: {
        type: Array,
        default: () => [],
    },
    itemTypes: {
        type: Array,
        default: () => [],
    },
    collections: {
        type: Array,
        default: () => [],
    },
    collectionCreateValue: {
        type: String,
        default: '__create_collection__',
    },
    customFieldTabs: {
        type: Array,
        default: () => [],
    },
});

const { toasts, showToast, dismissToast } = useToast();
const COLLECTION_CREATE_OPTION = props.collectionCreateValue || '__create_collection__';

const defaultCollectionChoice = () => {
    if (props.module.collection?.id) {
        return String(props.module.collection.id);
    }

    if (props.collections.length) {
        return String(props.collections[0].id);
    }

    return COLLECTION_CREATE_OPTION;
};

const buildCustomFieldState = () => {
    const state = {};
    
    props.customFieldTabs.forEach((tab) => {
        (tab.fields || []).forEach((field) => {
            const isFileField = field.type === 'file';
            const isCheckboxField = field.type === 'checkbox';
            
            let defaultValue;
            if (isFileField) {
                defaultValue = null;
            } else if (isCheckboxField) {
                defaultValue = normalizeCheckboxValue(field.values?.default);
            } else if (field.node === 'data_source') {
                // Default to 'items' for data_source field
                defaultValue = field.values?.default ?? 'items';
            } else {
                defaultValue = field.values?.default ?? '';
            }
            
            let translations = {};
            if (field.values?.translations) {
                if (isFileField) {
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = null;
                    });
                } else if (isCheckboxField) {
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = normalizeCheckboxValue(field.values.translations[lang]);
                    });
                } else {
                    translations = { ...field.values.translations };
                }
            }
            
            state[field.id] = {
                default: defaultValue,
                translations,
            };
        });
    });
    
    return state;
};

const normalizeCheckboxValue = (value) => {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value === '1' || value === 'true' || value === 'on';
    }
    return !!value;
};

const initialCustomFields = computed(() => buildCustomFieldState());

// Get fields from the Settings tab (or any visible tab)
const settingsFields = computed(() => {
    if (props.customFieldTabs.length === 0) {
        return [];
    }
    
    // Try to find Settings tab first
    let settingsTab = props.customFieldTabs.find(tab => tab.title === 'Settings');
    
    // If not found, try to find any visible tab
    if (!settingsTab) {
        settingsTab = props.customFieldTabs.find(tab => tab.visible === true);
    }
    
    // If still not found, just use the first tab
    if (!settingsTab && props.customFieldTabs.length > 0) {
        settingsTab = props.customFieldTabs[0];
    }
    
    return settingsTab?.fields || [];
});

// Filter out data_source, data_source_table, data_source_ui, and db_table specific fields as they're shown directly in the form
// Also hide deep_structure and sorting for db_table modules
const filteredSettingsFields = computed(() => {
    let filtered = settingsFields.value.filter(field => 
        field.node !== 'data_source' && 
        field.node !== 'data_source_table' && 
        field.node !== 'data_source_ui' &&
        field.node !== 'db_table_deep_structure' &&
        field.node !== 'db_table_parent_column' &&
        field.node !== 'db_table_relationships' &&
        field.node !== 'db_table_order_by_column' &&
        field.node !== 'db_table_order_by_direction' &&
        field.node !== 'db_table_sorting' &&
        field.node !== 'db_table_sorting_column'
    );
    
    // Hide deep_structure, sorting, and columns_to_show for db_table modules
    if (isDbTableSource.value) {
        filtered = filtered.filter(field => 
            field.node !== 'deep_structure' && 
            field.node !== 'sorting' &&
            field.node !== 'columns_to_show'
        );
    }
    
    return filtered;
});

// Get data_source value - first try direct field, then custom fields
const dataSourceValue = computed(() => {
    // First check if we have a direct data_source field in the form
    if (moduleForm.data_source !== undefined && moduleForm.data_source !== '') {
        return moduleForm.data_source;
    }
    
    // Fallback to custom fields
    const field = settingsFields.value.find(field => field.node === 'data_source');
    if (field && moduleForm.custom_fields && moduleForm.custom_fields[field.id]) {
        return moduleForm.custom_fields[field.id].default || 'items';
    }
    
    return 'items'; // Default to 'items'
});

const isDbTableSource = computed(() => {
    return dataSourceValue.value === 'db_table';
});

const isCustomSource = computed(() => {
    return dataSourceValue.value === 'custom';
});

// Get data_source_table value from custom fields
const dataSourceTableField = computed(() => {
    return settingsFields.value.find(field => field.node === 'data_source_table');
});

const dataSourceTableValue = computed(() => {
    const field = dataSourceTableField.value;
    if (field && moduleForm.custom_fields && moduleForm.custom_fields[field.id]) {
        return moduleForm.custom_fields[field.id].default || '';
    }
    return '';
});

// Ensure field model exists in form
const ensureFieldModel = (field) => {
    if (!moduleForm.custom_fields) {
        moduleForm.custom_fields = {};
    }
    
        if (!moduleForm.custom_fields[field.id]) {
            const isFileField = field.type === 'file';
            const isCheckboxField = field.type === 'checkbox';
            
            let defaultValue;
            if (isFileField) {
                defaultValue = null;
            } else if (isCheckboxField) {
                defaultValue = normalizeCheckboxValue(field.values?.default);
            } else if (field.node === 'data_source') {
                // Default to 'items' for data_source field
                defaultValue = field.values?.default ?? 'items';
            } else {
                defaultValue = field.values?.default ?? '';
            }
        
        let translations = {};
        if (field.values?.translations) {
            if (isFileField) {
                Object.keys(field.values.translations).forEach((lang) => {
                    translations[lang] = null;
                });
            } else if (isCheckboxField) {
                Object.keys(field.values.translations).forEach((lang) => {
                    translations[lang] = normalizeCheckboxValue(field.values.translations[lang]);
                });
            } else {
                translations = { ...field.values.translations };
            }
        }
        
        moduleForm.custom_fields[field.id] = {
            default: defaultValue,
            translations,
        };
    }
    
    return moduleForm.custom_fields[field.id];
};

// Initialize data_source from custom fields if available
const initialDataSource = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'data_source');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || 'items';
    }
    return 'items';
});

// Initialize data_source_table from custom fields if available
const initialDataSourceTable = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'data_source_table');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || '';
    }
    return '';
});

// Initialize data_source_ui from custom fields if available
const initialDataSourceUi = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'data_source_ui');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || '';
    }
    return '';
});

// Initialize db_table_deep_structure from custom fields if available
const initialDbTableDeepStructure = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_deep_structure');
    if (field && initialCustomFields.value[field.id]) {
        return normalizeCheckboxValue(initialCustomFields.value[field.id].default);
    }
    return false;
});

// Initialize db_table_parent_column from custom fields if available
const initialDbTableParentColumn = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_parent_column');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || 'parent_id';
    }
    return 'parent_id';
});

// Initialize db_table_relationships from custom fields if available
const initialDbTableRelationships = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_relationships');
    if (field && initialCustomFields.value[field.id]) {
        const value = initialCustomFields.value[field.id].default || '';
        if (value) {
            try {
                return JSON.parse(value);
            } catch (e) {
                return { relationships: [] };
            }
        }
    }
    return { relationships: [] };
});

// Initialize db_table_sorting from custom fields if available
const initialDbTableSorting = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_sorting');
    if (field && initialCustomFields.value[field.id]) {
        const value = initialCustomFields.value[field.id].default || '';
        return normalizeCheckboxValue(value);
    }
    return false;
});

// Initialize db_table_sorting_column from custom fields if available
const initialDbTableSortingColumn = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_sorting_column');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || 'order_index';
    }
    return 'order_index';
});

// Initialize db_table_order_by_column from custom fields if available
const initialDbTableOrderByColumn = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_order_by_column');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || '';
    }
    return '';
});

// Initialize db_table_order_by_direction from custom fields if available
const initialDbTableOrderByDirection = computed(() => {
    const field = settingsFields.value.find(field => field.node === 'db_table_order_by_direction');
    if (field && initialCustomFields.value[field.id]) {
        return initialCustomFields.value[field.id].default || 'asc';
    }
    return 'asc';
});

const moduleForm = useForm({
    title: props.module.title,
    visible: props.module.visible,
    item_type_id: props.module.item_type_id ? String(props.module.item_type_id) : '',
    collection_choice: defaultCollectionChoice(),
    collection_title: '',
    data_source: initialDataSource.value,
    data_source_table: initialDataSourceTable.value,
    data_source_ui: initialDataSourceUi.value,
    custom_fields: { ...initialCustomFields.value },
});

const currentUiConfig = ref(initialDataSourceUi.value || '');

// Local state for data_source_table input (separate from form to prevent auto-save)
const dataSourceTableInput = ref(initialDataSourceTable.value);

// Tree structure and relationships state
const dbTableDeepStructure = ref(initialDbTableDeepStructure.value);
const dbTableParentColumn = ref(initialDbTableParentColumn.value);
const dbTableRelationships = ref(JSON.parse(JSON.stringify(initialDbTableRelationships.value))); // Deep copy
const dbTableSorting = ref(initialDbTableSorting.value);
const dbTableSortingColumn = ref(initialDbTableSortingColumn.value);
const dbTableOrderByColumn = ref(initialDbTableOrderByColumn.value);
const dbTableOrderByDirection = ref(initialDbTableOrderByDirection.value);

// Watch and sync tree structure fields to form
watch([dbTableDeepStructure, dbTableParentColumn], () => {
    const deepStructureField = settingsFields.value.find(field => field.node === 'db_table_deep_structure');
    const parentColumnField = settingsFields.value.find(field => field.node === 'db_table_parent_column');
    
    if (deepStructureField) {
        ensureFieldModel(deepStructureField);
        moduleForm.custom_fields[deepStructureField.id].default = dbTableDeepStructure.value ? '1' : '0';
    }
    
    if (parentColumnField) {
        ensureFieldModel(parentColumnField);
        moduleForm.custom_fields[parentColumnField.id].default = dbTableParentColumn.value;
    }
}, { immediate: true });

// Watch and sync relationships to form
watch(dbTableRelationships, () => {
    const relationshipsField = settingsFields.value.find(field => field.node === 'db_table_relationships');
    if (relationshipsField) {
        ensureFieldModel(relationshipsField);
        moduleForm.custom_fields[relationshipsField.id].default = JSON.stringify(dbTableRelationships.value);
    }
}, { deep: true, immediate: true });

// Watch and sync sorting fields to form
watch([dbTableSorting, dbTableSortingColumn], () => {
    const sortingField = settingsFields.value.find(field => field.node === 'db_table_sorting');
    const sortingColumnField = settingsFields.value.find(field => field.node === 'db_table_sorting_column');
    
    if (sortingField) {
        ensureFieldModel(sortingField);
        moduleForm.custom_fields[sortingField.id].default = dbTableSorting.value ? '1' : '0';
    }
    
    if (sortingColumnField) {
        ensureFieldModel(sortingColumnField);
        moduleForm.custom_fields[sortingColumnField.id].default = dbTableSortingColumn.value;
    }
}, { immediate: true });

// Watch and sync ordering fields to form
watch([dbTableOrderByColumn, dbTableOrderByDirection], () => {
    const orderByColumnField = settingsFields.value.find(field => field.node === 'db_table_order_by_column');
    const orderByDirectionField = settingsFields.value.find(field => field.node === 'db_table_order_by_direction');
    
    if (orderByColumnField) {
        ensureFieldModel(orderByColumnField);
        moduleForm.custom_fields[orderByColumnField.id].default = dbTableOrderByColumn.value;
    }
    
    if (orderByDirectionField) {
        ensureFieldModel(orderByDirectionField);
        moduleForm.custom_fields[orderByDirectionField.id].default = dbTableOrderByDirection.value;
    }
}, { immediate: true });

// Relationship management functions
const relationshipModalOpen = ref(false);
const editingRelationshipIndex = ref(null);

const openRelationshipModal = (index = null) => {
    editingRelationshipIndex.value = index;
    relationshipModalOpen.value = true;
};

const closeRelationshipModal = () => {
    relationshipModalOpen.value = false;
    editingRelationshipIndex.value = null;
};

const saveRelationship = (relationshipData) => {
    if (editingRelationshipIndex.value !== null) {
        // Edit existing relationship
        dbTableRelationships.value.relationships[editingRelationshipIndex.value] = relationshipData;
    } else {
        // Add new relationship
        dbTableRelationships.value.relationships.push(relationshipData);
    }
    closeRelationshipModal();
};

const removeRelationship = async (index) => {
    const confirmed = await confirmDialog({
        title: t('admin.modules.remove_relationship'),
        message: t('admin.modules.remove_relationship_confirm'),
        confirmLabel: t('admin.relationships.remove'),
        intent: 'danger',
    });
    
    if (confirmed) {
        dbTableRelationships.value.relationships.splice(index, 1);
    }
};

// Drag and drop for relationships
const draggedRelationshipIndex = ref(null);
const draggedOverRelationshipIndex = ref(null);

const handleRelationshipDragStart = (event, index) => {
    draggedRelationshipIndex.value = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.target.style.opacity = '0.5';
};

const handleRelationshipDragEnd = (event) => {
    event.target.style.opacity = '';
    draggedRelationshipIndex.value = null;
    draggedOverRelationshipIndex.value = null;
};

const handleRelationshipDragOver = (event, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    draggedOverRelationshipIndex.value = index;
};

const handleRelationshipDrop = (event, dropIndex) => {
    event.preventDefault();
    
    if (draggedRelationshipIndex.value === null || draggedRelationshipIndex.value === dropIndex) {
        draggedRelationshipIndex.value = null;
        draggedOverRelationshipIndex.value = null;
        return;
    }
    
    // Reorder relationships
    const relationships = [...dbTableRelationships.value.relationships];
    const [dragged] = relationships.splice(draggedRelationshipIndex.value, 1);
    relationships.splice(dropIndex, 0, dragged);
    dbTableRelationships.value.relationships = relationships;
    
    draggedRelationshipIndex.value = null;
    draggedOverRelationshipIndex.value = null;
};

const getRelationshipDisplayName = (relationship) => {
    if (relationship.name) {
        return relationship.name;
    }
    if (relationship.related_table) {
        return relationship.related_table;
    }
    return 'Unnamed relationship';
};

const getRelationshipTypeLabel = (type) => {
    const labels = {
        hasOne: 'Has One',
        hasMany: 'Has Many',
        belongsTo: 'Belongs To',
        belongsToMany: 'Belongs To Many',
    };
    return labels[type] || type;
};

const actionForm = useForm({
    title: '',
    visible: true,
});

const editingActionId = ref(null);

watch(
    () => moduleForm.collection_choice,
    (value) => {
        if (value !== COLLECTION_CREATE_OPTION) {
            moduleForm.collection_title = '';
        }
    },
);

// Sync dataSourceTableInput when moduleForm.data_source_table changes (e.g., after applying)
watch(
    () => moduleForm.data_source_table,
    (newValue) => {
        if (newValue !== dataSourceTableInput.value) {
            dataSourceTableInput.value = newValue;
        }
    },
);

// Apply data source table name change (just updates local state to trigger table fetch)
const applyDataSourceTable = () => {
    // Simply update moduleForm.data_source_table to match the input
    // The DataSourceUiBuilder component will automatically fetch the table structure
    // because it watches the tableName prop and has :key binding
    moduleForm.data_source_table = dataSourceTableInput.value;
    
    // Update custom_fields in moduleForm to keep it in sync (for when form is saved later)
    const dataSourceTableField = settingsFields.value.find(field => field.node === 'data_source_table');
    if (dataSourceTableField) {
        if (!moduleForm.custom_fields) {
            moduleForm.custom_fields = {};
        }
        if (!moduleForm.custom_fields[dataSourceTableField.id]) {
            moduleForm.custom_fields[dataSourceTableField.id] = {
                default: '',
                translations: {},
            };
        }
        moduleForm.custom_fields[dataSourceTableField.id].default = dataSourceTableInput.value || '';
    }
};

const submitModule = () => {
    // Only use forceFormData if we have file uploads
    const hasFileFields = filteredSettingsFields.value.some(field => field.type === 'file');
    
    // Sync data_source, data_source_table, and data_source_ui to custom_fields before submitting
    const dataSourceField = settingsFields.value.find(field => field.node === 'data_source');
    const dataSourceTableField = settingsFields.value.find(field => field.node === 'data_source_table');
    const dataSourceUiField = settingsFields.value.find(field => field.node === 'data_source_ui');
    
    if (!moduleForm.custom_fields) {
        moduleForm.custom_fields = {};
    }
    
    if (dataSourceField) {
        if (!moduleForm.custom_fields[dataSourceField.id]) {
            moduleForm.custom_fields[dataSourceField.id] = {
                default: '',
                translations: {},
            };
        }
        moduleForm.custom_fields[dataSourceField.id].default = moduleForm.data_source;
    }
    
    if (dataSourceTableField) {
        if (!moduleForm.custom_fields[dataSourceTableField.id]) {
            moduleForm.custom_fields[dataSourceTableField.id] = {
                default: '',
                translations: {},
            };
        }
        // Use the applied value from dataSourceTableInput
        moduleForm.custom_fields[dataSourceTableField.id].default = dataSourceTableInput.value || '';
        moduleForm.data_source_table = dataSourceTableInput.value;
    }
    
    if (dataSourceUiField) {
        if (!moduleForm.custom_fields[dataSourceUiField.id]) {
            moduleForm.custom_fields[dataSourceUiField.id] = {
                default: '',
                translations: {},
            };
        }
        moduleForm.custom_fields[dataSourceUiField.id].default = currentUiConfig.value || moduleForm.data_source_ui || '';
    }
    
    moduleForm.put(`/admin/system/modules/${props.module.id}`, {
        preserveScroll: true,
        forceFormData: hasFileFields, // Only enable if we have file uploads
        onSuccess: () => {
            showToast({
                title: t('admin.modules.module_saved'),
                message: t('admin.modules.module_settings_updated'),
                intent: 'success',
            });
        },
    });
};

const deleteModule = async () => {
    const confirmed = await confirmDialog({
        title: t('admin.modules.delete_module'),
        message: t('admin.modules.delete_module_confirm'),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/modules/${props.module.id}`);
};

const startEditAction = (action) => {
    editingActionId.value = action.id;
    actionForm.title = action.title;
    actionForm.visible = action.visible;
};

const cancelActionEdit = () => {
    editingActionId.value = null;
    actionForm.reset();
    actionForm.visible = true;
};

const submitAction = () => {
    if (editingActionId.value) {
        actionForm.put(`/admin/system/modules/actions/${editingActionId.value}`, {
            preserveScroll: true,
            onSuccess: () => cancelActionEdit(),
        });
    } else {
        actionForm.post(`/admin/system/modules/${props.module.id}/actions`, {
            preserveScroll: true,
            onSuccess: () => {
                actionForm.reset();
                actionForm.visible = true;
            },
        });
    }
};

const deleteAction = async (action) => {
    const confirmed = await confirmDialog({
        title: t('admin.modules.delete_action'),
        message: t('admin.modules.delete_action_confirm', { title: action.title }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/modules/actions/${action.id}`, { preserveScroll: true });
};

const toggleAction = (action) => {
    router.patch(`/admin/system/modules/actions/${action.id}/toggle-visible`, {}, { preserveScroll: true });
};

const reorderAction = (action, direction) => {
    router.patch(`/admin/system/modules/actions/${action.id}/reorder`, { direction }, { preserveScroll: true });
};
</script>

<template>
    <SystemLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-5xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ module.title }}</h1>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Manage module details and actions.</p>
                        </div>
                        <Link href="/admin/system/modules" class="btn-text">
                            Back to list
                        </Link>
                    </div>

                    <form @submit.prevent="submitModule">
                        <div class="grid gap-4 md:grid-cols-3">
                            <div>
                                <label class="form-label">Title</label>
                                <input
                                    v-model="moduleForm.title"
                                    type="text"
                                    class="form-input"
                                    required
                                />
                                <p v-if="moduleForm.errors.title" class="mt-1 text-sm text-red-600">{{ moduleForm.errors.title }}</p>
                            </div>
                            <div>
                                <label class="form-label">Data source</label>
                                <select
                                    v-model="moduleForm.data_source"
                                    class="form-select"
                                    required
                                >
                                    <option value="items">Items</option>
                                    <option value="db_table">Database Table</option>
                                    <option value="custom">Custom</option>
                                </select>
                                <p v-if="moduleForm.errors.data_source" class="mt-1 text-sm text-red-600">
                                    {{ moduleForm.errors.data_source }}
                                </p>
                            </div>
                            <div v-if="!isDbTableSource && !isCustomSource">
                                <label class="form-label">Item type</label>
                                <select
                                    v-model="moduleForm.item_type_id"
                                    class="form-select"
                                    :required="!isDbTableSource && !isCustomSource"
                                >
                                    <option value="" disabled>Select type</option>
                                    <option v-for="type in itemTypes" :key="type.id" :value="String(type.id)">
                                        {{ type.label }}
                                    </option>
                                </select>
                                <p v-if="moduleForm.errors.item_type_id" class="mt-1 text-sm text-red-600">{{ moduleForm.errors.item_type_id }}</p>
                            </div>
                        </div>
                        <!-- Database Table Configuration Section -->
                        <div v-if="isDbTableSource" class="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Database Table Configuration</h3>
                            <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label class="form-label">Data source table</label>
                                    <div class="flex gap-2">
                                        <input
                                            v-model="dataSourceTableInput"
                                            type="text"
                                            class="form-input flex-1"
                                            placeholder="e.g., users, products"
                                        />
                                        <button
                                            type="button"
                                            @click="applyDataSourceTable"
                                            :disabled="dataSourceTableInput === moduleForm.data_source_table"
                                            class="btn btn-primary whitespace-nowrap flex items-center justify-center"
                                            :class="{ 'opacity-50 cursor-not-allowed': dataSourceTableInput === moduleForm.data_source_table }"
                                            title="Apply table name"
                                        >
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
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                    <p v-if="moduleForm.errors.data_source_table" class="mt-1 text-sm text-red-600">
                                        {{ moduleForm.errors.data_source_table }}
                                    </p>
                                </div>
                            </div>

                            <!-- Sorting Configuration -->
                            <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Sorting</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="flex items-center gap-2">
                                            <input
                                                v-model="dbTableSorting"
                                                type="checkbox"
                                                class="form-checkbox"
                                            />
                                            <span class="text-sm text-gray-900 dark:text-white">Enable sorting</span>
                                        </label>
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Enable drag-and-drop reordering of records in the list
                                        </p>
                                    </div>
                                    <div v-if="dbTableSorting">
                                        <label class="form-label">Sorting column</label>
                                        <input
                                            v-model="dbTableSortingColumn"
                                            type="text"
                                            class="form-input"
                                            placeholder="order_index"
                                        />
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Column name to store sort order (default: order_index)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Ordering Configuration -->
                            <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Default Ordering</h4>
                                <div class="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label class="form-label">Order by column</label>
                                        <input
                                            v-model="dbTableOrderByColumn"
                                            type="text"
                                            class="form-input"
                                            placeholder="e.g., id, created_at, name"
                                        />
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Column name to sort by (leave empty for default ordering)
                                        </p>
                                    </div>
                                    <div>
                                        <label class="form-label">Order direction</label>
                                        <select
                                            v-model="dbTableOrderByDirection"
                                            class="form-select"
                                        >
                                            <option value="asc">Ascending</option>
                                            <option value="desc">Descending</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Field Configuration Section -->
                            <div v-if="moduleForm.data_source_table && moduleForm.data_source_table.trim() !== ''" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Field Configuration</h4>
                                <DataSourceUiBuilder
                                    :table-name="moduleForm.data_source_table"
                                    :module-id="props.module.id"
                                    :initial-ui-config="currentUiConfig"
                                    :key="moduleForm.data_source_table"
                                    @update:ui-config="(config) => { currentUiConfig = config; moduleForm.data_source_ui = config; }"
                                />
                            </div>
                            
                            <!-- Tree Structure Configuration -->
                            <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tree Structure</h4>
                                <div class="space-y-4">
                                    <div>
                                        <label class="flex items-center gap-2">
                                            <input
                                                v-model="dbTableDeepStructure"
                                                type="checkbox"
                                                class="form-checkbox"
                                            />
                                            <span class="text-sm text-gray-900 dark:text-white">Enable tree structure</span>
                                        </label>
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Enable hierarchical organization of records with parent-child relationships
                                        </p>
                                    </div>
                                    <div v-if="dbTableDeepStructure">
                                        <label class="form-label">Parent column name</label>
                                        <input
                                            v-model="dbTableParentColumn"
                                            type="text"
                                            class="form-input"
                                            placeholder="parent_id"
                                        />
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            The column name that stores the parent record ID (default: parent_id)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Relationships Configuration -->
                            <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <div class="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Relationships</h4>
                                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            Define Laravel Eloquent-style relationships between this table and other tables
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        @click="openRelationshipModal()"
                                        class="btn btn-sm btn-primary"
                                    >
                                        Add Relationship
                                    </button>
                                </div>
                                
                                <div v-if="dbTableRelationships.relationships.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    No relationships defined. Click "Add Relationship" to get started.
                                </div>
                                
                                <div v-else class="space-y-2">
                                    <div
                                        v-for="(relationship, index) in dbTableRelationships.relationships"
                                        :key="index"
                                        :draggable="true"
                                        @dragstart="handleRelationshipDragStart($event, index)"
                                        @dragend="handleRelationshipDragEnd($event)"
                                        @dragover="handleRelationshipDragOver($event, index)"
                                        @drop="handleRelationshipDrop($event, index)"
                                        class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move transition-colors"
                                        :class="{
                                            'opacity-50': draggedRelationshipIndex === index,
                                            'border-blue-500 bg-blue-50 dark:bg-blue-900/20': draggedOverRelationshipIndex === index
                                        }"
                                    >
                                        <!-- Drag handle -->
                                        <div class="flex-shrink-0 text-gray-400 dark:text-gray-500">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                            </svg>
                                        </div>
                                        
                                        <!-- Relationship info -->
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center gap-2">
                                                <span class="text-sm font-medium text-gray-900 dark:text-white">
                                                    {{ getRelationshipDisplayName(relationship) }}
                                                </span>
                                                <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                                    {{ getRelationshipTypeLabel(relationship.type) }}
                                                </span>
                                            </div>
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                {{ relationship.related_table || 'No table specified' }}
                                            </p>
                                        </div>
                                        
                                        <!-- Actions -->
                                        <div class="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                @click="openRelationshipModal(index)"
                                                class="btn btn-sm btn-outline"
                                                title="Edit relationship"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                @click="removeRelationship(index)"
                                                class="btn btn-sm btn-danger"
                                                title="Remove relationship"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="isCustomSource" class="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Custom data source modules use their own controller implementation. 
                                Create a custom controller extending <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">ModuleBaseController</code> 
                                to implement custom logic for this module.
                            </p>
                        </div>
                        <div v-if="!isDbTableSource && !isCustomSource" class="pt-2">
                            <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label class="form-label">Collection</label>
                                    <select
                                        v-model="moduleForm.collection_choice"
                                        class="form-select"
                                        :required="!isDbTableSource"
                                    >
                                        <option value="" disabled>Select collection</option>
                                        <option v-for="collection in props.collections" :key="collection.id" :value="String(collection.id)">
                                            {{ collection.title }} (#{{ collection.id }})
                                        </option>
                                        <option :value="COLLECTION_CREATE_OPTION">Create new collection…</option>
                                    </select>
                                    <p v-if="moduleForm.errors.collection_choice" class="mt-1 text-sm text-red-600">
                                        {{ moduleForm.errors.collection_choice }}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div v-if="!isDbTableSource && moduleForm.collection_choice === COLLECTION_CREATE_OPTION" class="pt-2">
                            <label class="form-label">New collection title</label>
                            <input
                                v-model="moduleForm.collection_title"
                                type="text"
                                class="form-input"
                                required
                            />
                            <p v-if="moduleForm.errors.collection_title" class="mt-1 text-sm text-red-600">
                                {{ moduleForm.errors.collection_title }}
                            </p>
                        </div>
                        <div class="pt-4">
                            <div class="flex items-center gap-4">
                                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    v-model="moduleForm.visible"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                    <span class="ml-2">Visible</span>
                                </label>
                            </div>
                        </div>
                        
                        
                        <!-- Settings Custom Fields (exclude data_source and data_source_table as they're shown directly) -->
                        <div v-if="filteredSettingsFields.length > 0" class="pt-6 border-t border-gray-200 dark:border-gray-700">
                            <label class="form-label mb-3">Settings</label>
                            <div class="space-y-3">
                                <div
                                    v-for="field in filteredSettingsFields"
                                    :key="field.id"
                                >
                                    <component
                                        :is="resolveInterfaceComponent(field.type)"
                                        :field="field"
                                        :model="ensureFieldModel(field)"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div class="pt-4">
                            <div class="flex gap-4">
                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    :disabled="moduleForm.processing"
                                >
                                    {{ moduleForm.processing ? 'Saving…' : 'Save module' }}
                                </button>
                                <button type="button" class="btn-text-danger" @click="deleteModule">
                                    Delete module
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Actions</h2>
                        <button
                            type="button"
                            class="btn-text"
                            @click="cancelActionEdit"
                            v-if="editingActionId"
                        >
                            Cancel edit
                        </button>
                    </div>

                    <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitAction">
                        <div>
                            <label class="form-label">Title</label>
                            <input
                                v-model="actionForm.title"
                                type="text"
                                class="form-input"
                                required
                            />
                            <p v-if="actionForm.errors.title" class="mt-1 text-sm text-red-600">{{ actionForm.errors.title }}</p>
                        </div>
                        <div class="flex items-center gap-4">
                            <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    v-model="actionForm.visible"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2">Visible</span>
                            </label>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="actionForm.processing"
                            >
                                {{ actionForm.processing ? 'Saving…' : (editingActionId ? 'Save action' : 'Create action') }}
                            </button>
                        </div>
                    </form>

                    <div class="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div
                            v-for="action in actions"
                            :key="action.id"
                            class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm"
                        >
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">{{ action.title }}</p>
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <span
                                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                    :class="action.visible
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                >
                                    {{ action.visible ? 'Visible' : 'Hidden' }}
                                </span>
                                <button class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" @click="reorderAction(action, 'up')">↑</button>
                                <button class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" @click="reorderAction(action, 'down')">↓</button>
                                <button class="btn btn-outline" @click="toggleAction(action)">
                                    {{ action.visible ? 'Hide' : 'Show' }}
                                </button>
                                <button class="btn btn-outline" @click="startEditAction(action)">
                                    Edit
                                </button>
                                <button class="btn btn-outline-danger" @click="deleteAction(action)">
                                    Delete
                                </button>
                            </div>
                        </div>
                        <p v-if="actions.length === 0" class="text-sm text-gray-500 dark:text-gray-400 px-4 py-3">No actions yet.</p>
                    </div>
                </div>
            </div>
        </div>
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
        
        <!-- Relationship Modal -->
        <RelationshipModal
            :open="relationshipModalOpen"
            :relationship="editingRelationshipIndex !== null ? dbTableRelationships.relationships[editingRelationshipIndex] : null"
            :module-id="props.module.id"
            @close="closeRelationshipModal"
            @save="saveRelationship"
        />
    </SystemLayout>
</template>
