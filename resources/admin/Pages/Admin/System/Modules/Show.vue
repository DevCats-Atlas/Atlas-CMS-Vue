<script setup>
import { ref, watch, computed } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { resolveInterfaceComponent } from '@admin/Pages/Admin/Modules/Default/components/interfaces';
import DataSourceUiBuilder from './components/DataSourceUiBuilder.vue';

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

// Filter out data_source, data_source_table, and data_source_ui as they're shown directly in the form
const filteredSettingsFields = computed(() => {
    return settingsFields.value.filter(field => 
        field.node !== 'data_source' && field.node !== 'data_source_table' && field.node !== 'data_source_ui'
    );
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
        moduleForm.custom_fields[dataSourceTableField.id].default = moduleForm.data_source_table || '';
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
                title: 'Module saved',
                message: 'Module settings updated successfully.',
                intent: 'success',
            });
        },
    });
};

const deleteModule = async () => {
    const confirmed = await confirmDialog({
        title: 'Delete module',
        message: 'Delete this module and all actions?',
        confirmLabel: 'Delete',
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
        title: 'Delete action',
        message: `Delete action "${action.title}"?`,
        confirmLabel: 'Delete',
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
                                    <input
                                        v-model="moduleForm.data_source_table"
                                        type="text"
                                        class="form-input"
                                        placeholder="e.g., users, products"
                                    />
                                    <p v-if="moduleForm.errors.data_source_table" class="mt-1 text-sm text-red-600">
                                        {{ moduleForm.errors.data_source_table }}
                                    </p>
                                </div>
                            </div>
                            
                            <!-- UI Builder Section -->
                            <div v-if="moduleForm.data_source_table && moduleForm.data_source_table.trim() !== ''" class="mt-6">
                                <DataSourceUiBuilder
                                    :table-name="moduleForm.data_source_table"
                                    :module-id="props.module.id"
                                    :initial-ui-config="currentUiConfig"
                                    @update:ui-config="(config) => { currentUiConfig = config; moduleForm.data_source_ui = config; }"
                                />
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
    </SystemLayout>
</template>
