<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import { useToast } from '@/composables/useToast.js';
import FieldGroupsBuilder from './FieldGroupsBuilder.vue';

const props = defineProps({
    tableName: {
        type: String,
        required: true,
    },
    moduleId: {
        type: [Number, String],
        required: true,
    },
    initialUiConfig: {
        type: [String, Object],
        default: null,
    },
});

const emit = defineEmits(['update:uiConfig']);

const { showToast } = useToast();

const tableExists = ref(null);
const columns = ref([]);
const uiConfig = ref({});
const fieldGroups = ref([]);
const loading = ref(false);
const errorMessage = ref(null);
const showGroupsBuilder = ref(false);

const interfaceTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'wysiwyg', label: 'WYSIWYG' },
    { value: 'datetime', label: 'Date/Time' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'select', label: 'Select' },
    { value: 'file', label: 'File' },
];

// Initialize UI config from prop
const initializeUiConfig = () => {
    if (!props.initialUiConfig) {
        uiConfig.value = {};
        fieldGroups.value = [];
        return;
    }

    try {
        let config;
        if (typeof props.initialUiConfig === 'string') {
            config = JSON.parse(props.initialUiConfig);
        } else {
            config = { ...props.initialUiConfig };
        }
        
        // Extract field_groups if present
        if (config.field_groups) {
            fieldGroups.value = config.field_groups;
            delete config.field_groups;
            showGroupsBuilder.value = fieldGroups.value.length > 0;
        } else {
            fieldGroups.value = [];
        }
        
        uiConfig.value = config;
    } catch (e) {
        console.error('Failed to parse UI config:', e);
        uiConfig.value = {};
        fieldGroups.value = [];
    }
};

const checkTable = async () => {
    if (!props.tableName || props.tableName.trim() === '') {
        tableExists.value = null;
        columns.value = [];
        errorMessage.value = null;
        return;
    }

    loading.value = true;
    errorMessage.value = null;

    try {
        const response = await router.post(
            `/admin/system/modules/${props.moduleId}/check-table-columns`,
            { table_name: props.tableName.trim() },
            {
                preserveState: true,
                preserveScroll: true,
                only: [],
            }
        );

        // Inertia router.post returns a promise that resolves when the request completes
        // We need to handle the response differently
    } catch (error) {
        if (error.response) {
            const data = error.response.data;
            if (data && data.exists === false) {
                tableExists.value = false;
                errorMessage.value = data.error || 'Table does not exist';
                columns.value = [];
            } else {
                tableExists.value = true;
                columns.value = data?.columns || [];
                initializeUiConfigForColumns();
            }
        } else {
            errorMessage.value = 'Failed to check table';
            tableExists.value = false;
            columns.value = [];
        }
    } finally {
        loading.value = false;
    }
};

// Use fetch instead of Inertia router for JSON API calls
const checkTableWithFetch = async () => {
    if (!props.tableName || props.tableName.trim() === '') {
        tableExists.value = null;
        columns.value = [];
        errorMessage.value = null;
        return;
    }

    loading.value = true;
    errorMessage.value = null;

    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const response = await fetch(`/admin/system/modules/${props.moduleId}/check-table-columns`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ table_name: props.tableName.trim() }),
        });

        const data = await response.json();

        if (!response.ok || !data.exists) {
            tableExists.value = false;
            errorMessage.value = data.error || 'Table does not exist';
            columns.value = [];
        } else {
            tableExists.value = true;
            columns.value = data.columns || [];
            initializeUiConfigForColumns();
        }
    } catch (error) {
        errorMessage.value = 'Failed to check table: ' + (error.message || 'Unknown error');
        tableExists.value = false;
        columns.value = [];
    } finally {
        loading.value = false;
    }
};

const initializeUiConfigForColumns = () => {
    // Get list of current column names
    const currentColumnNames = columns.value.map(col => col.name);
    
    // Filter UI config to only include columns that actually exist
    const filteredConfig = {};
    Object.keys(uiConfig.value).forEach(columnName => {
        if (currentColumnNames.includes(columnName)) {
            filteredConfig[columnName] = uiConfig.value[columnName];
        }
    });
    
    const newConfig = { ...filteredConfig };
    
    columns.value.forEach((column) => {
        if (!newConfig[column.name]) {
            newConfig[column.name] = {
                title: column.name,
                interface: 'text',
                options: '', // For select interface
                select_type: 'static', // static or dynamic
                select_input_type: 'comma', // comma, newline, or value_label
                editable: true, // Default to editable
                show_in_list: true, // Default to show in list
            };
        } else {
            // Ensure editable field exists for existing configs
            if (newConfig[column.name].editable === undefined) {
                newConfig[column.name].editable = true;
            }
            // Ensure show_in_list field exists for existing configs (default to true)
            if (newConfig[column.name].show_in_list === undefined) {
                newConfig[column.name].show_in_list = true;
            }
            // Ensure select_type exists (default to static for backward compatibility)
            if (newConfig[column.name].select_type === undefined) {
                newConfig[column.name].select_type = 'static';
            }
            // Ensure select_input_type exists (default to comma for backward compatibility)
            if (newConfig[column.name].select_input_type === undefined) {
                newConfig[column.name].select_input_type = 'comma';
            }
        }
    });
    
    uiConfig.value = newConfig;
    emitUiConfig();
};

const updateColumnConfig = (columnName, field, value) => {
    if (!uiConfig.value[columnName]) {
        uiConfig.value[columnName] = {
            title: columnName,
            interface: 'text',
            options: '',
            editable: true,
            show_in_list: true,
        };
    }
    
    uiConfig.value[columnName][field] = value;
    emitUiConfig();
};

const emitUiConfig = () => {
    // Combine column config with field groups
    const fullConfig = { ...uiConfig.value };
    if (fieldGroups.value && fieldGroups.value.length > 0) {
        fullConfig.field_groups = fieldGroups.value;
    }
    emit('update:uiConfig', JSON.stringify(fullConfig));
};

// Handle field groups update
const onGroupsUpdate = (groups) => {
    fieldGroups.value = groups;
    emitUiConfig();
};

const getColumnConfig = (columnName) => {
    if (!uiConfig.value[columnName]) {
        return {
            title: columnName,
            interface: 'text',
            options: '',
            select_type: 'static',
            select_input_type: 'comma',
            editable: true,
            show_in_list: true,
        };
    }
    // Ensure editable field exists
    if (uiConfig.value[columnName].editable === undefined) {
        uiConfig.value[columnName].editable = true;
    }
    // Ensure show_in_list field exists (default to true)
    if (uiConfig.value[columnName].show_in_list === undefined) {
        uiConfig.value[columnName].show_in_list = true;
    }
    // Ensure select_type exists (default to static for backward compatibility)
    if (uiConfig.value[columnName].select_type === undefined) {
        uiConfig.value[columnName].select_type = 'static';
    }
    // Ensure select_input_type exists (default to comma for backward compatibility)
    if (uiConfig.value[columnName].select_input_type === undefined) {
        uiConfig.value[columnName].select_input_type = 'comma';
    }
    return uiConfig.value[columnName];
};

// Watch for table name changes
watch(() => props.tableName, (newTableName) => {
    if (newTableName && newTableName.trim() !== '') {
        checkTableWithFetch();
    } else {
        tableExists.value = null;
        columns.value = [];
        errorMessage.value = null;
        uiConfig.value = {};
        emitUiConfig();
    }
}, { immediate: false });

// Get options placeholder based on input type
const getOptionsPlaceholder = (columnName) => {
    const inputType = getColumnConfig(columnName).select_input_type || 'comma';
    switch (inputType) {
        case 'comma':
            return 'option1, option2, option3';
        case 'newline':
            return 'option1\noption2\noption3';
        case 'value_label':
            return 'value1=Label 1\nvalue2=Label 2\nvalue3=Label 3';
        default:
            return 'option1, option2, option3';
    }
};

// Get options hint based on input type
const getOptionsHint = (columnName) => {
    const inputType = getColumnConfig(columnName).select_input_type || 'comma';
    switch (inputType) {
        case 'comma':
            return 'Enter options separated by commas (e.g., option1, option2, option3)';
        case 'newline':
            return 'Enter one option per line';
        case 'value_label':
            return 'Enter one option per line in format: value=Label (e.g., red=Red Color)';
        default:
            return 'Enter options separated by commas';
    }
};

// Watch for initial UI config changes
watch(() => props.initialUiConfig, () => {
    initializeUiConfig();
}, { immediate: true });

onMounted(() => {
    initializeUiConfig();
    if (props.tableName && props.tableName.trim() !== '') {
        checkTableWithFetch();
    }
});
</script>

<template>
    <div class="space-y-3">
        <div v-if="props.tableName && props.tableName.trim() !== ''">
            <div v-if="loading" class="text-xs text-gray-600 dark:text-gray-400">
                Checking table...
            </div>
            
            <div v-else-if="errorMessage" class="rounded border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-2.5">
                <p class="text-xs font-medium text-red-800 dark:text-red-200">
                    {{ errorMessage }}
                </p>
            </div>
            
            <div v-else-if="tableExists && columns.length > 0" class="space-y-6">
                <!-- Field Groups Section -->
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            Field Grouping
                        </div>
                        <button
                            type="button"
                            @click="showGroupsBuilder = !showGroupsBuilder"
                            class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            {{ showGroupsBuilder ? 'Hide' : 'Configure Groups' }}
                        </button>
                    </div>
                    
                    <div v-if="showGroupsBuilder" class="rounded border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                        <FieldGroupsBuilder
                            :columns="columns"
                            :initial-groups="fieldGroups"
                            :ui-config="uiConfig"
                            @update:groups="onGroupsUpdate"
                        />
                    </div>
                    
                    <div v-else-if="fieldGroups.length > 0" class="text-xs text-gray-500 dark:text-gray-400">
                        {{ fieldGroups.length }} group{{ fieldGroups.length !== 1 ? 's' : '' }} configured.
                        <button type="button" @click="showGroupsBuilder = true" class="text-blue-600 hover:underline ml-1">Edit</button>
                    </div>
                </div>
                
                <!-- Column Configuration Section -->
                <div class="space-y-3">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Column Configuration
                </div>
                
                <div class="space-y-3">
                    <div
                        v-for="column in columns"
                        :key="column.name"
                        class="rounded border border-gray-200 dark:border-gray-700 p-3 space-y-3"
                    >
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 text-sm">
                                <span class="font-medium text-gray-900 dark:text-white">
                                    {{ column.name }}
                                </span>
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                    ({{ column.type }})
                                </span>
                            </div>
                            <div class="flex items-center gap-4">
                                <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        :checked="getColumnConfig(column.name).show_in_list !== false"
                                        @change="updateColumnConfig(column.name, 'show_in_list', $event.target.checked)"
                                        class="form-checkbox h-3.5 w-3.5"
                                    />
                                    <span>Show in this list</span>
                                </label>
                                <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                    <input
                                        type="checkbox"
                                        :checked="getColumnConfig(column.name).editable"
                                        @change="updateColumnConfig(column.name, 'editable', $event.target.checked)"
                                        class="form-checkbox h-3.5 w-3.5"
                                    />
                                    <span>Editable</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="grid gap-3 md:grid-cols-2">
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Title</label>
                                <input
                                    :value="getColumnConfig(column.name).title"
                                    @input="updateColumnConfig(column.name, 'title', $event.target.value)"
                                    type="text"
                                    class="form-input text-sm py-1.5"
                                    placeholder="Display title"
                                />
                            </div>
                            
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Interface</label>
                                <select
                                    :value="getColumnConfig(column.name).interface"
                                    @change="updateColumnConfig(column.name, 'interface', $event.target.value)"
                                    class="form-select text-sm py-1.5"
                                >
                                    <option
                                        v-for="interfaceType in interfaceTypes"
                                        :key="interfaceType.value"
                                        :value="interfaceType.value"
                                    >
                                        {{ interfaceType.label }}
                                    </option>
                                </select>
                            </div>
                        </div>
                        
                        <div
                            v-if="getColumnConfig(column.name).interface === 'select'"
                            class="pt-1 space-y-3"
                        >
                            <!-- Select Type: Static or Dynamic -->
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Select Type</label>
                                <select
                                    :value="getColumnConfig(column.name).select_type || 'static'"
                                    @change="updateColumnConfig(column.name, 'select_type', $event.target.value)"
                                    class="form-select text-sm py-1.5"
                                >
                                    <option value="static">Static</option>
                                    <option value="dynamic">Dynamic</option>
                                </select>
                                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Choose static (manual list) or dynamic (from database)
                                </p>
                            </div>
                            
                            <!-- Static Options Input -->
                            <div v-if="(getColumnConfig(column.name).select_type || 'static') === 'static'">
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Input Type</label>
                                <select
                                    :value="getColumnConfig(column.name).select_input_type || 'comma'"
                                    @change="updateColumnConfig(column.name, 'select_input_type', $event.target.value)"
                                    class="form-select text-sm py-1.5"
                                >
                                    <option value="comma">Comma-separated</option>
                                    <option value="newline">Line break separated</option>
                                    <option value="value_label">Value=Label (line break)</option>
                                </select>
                            </div>
                            
                            <!-- Options Input Field -->
                            <div v-if="(getColumnConfig(column.name).select_type || 'static') === 'static'">
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Options</label>
                                <textarea
                                    :value="getColumnConfig(column.name).options"
                                    @input="updateColumnConfig(column.name, 'options', $event.target.value)"
                                    class="form-textarea text-sm py-1.5"
                                    :rows="getColumnConfig(column.name).select_input_type === 'comma' ? 2 : 4"
                                    :placeholder="getOptionsPlaceholder(column.name)"
                                />
                                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    {{ getOptionsHint(column.name) }}
                                </p>
                            </div>
                            
                            <!-- Dynamic Options (SQL Query) -->
                            <div v-if="(getColumnConfig(column.name).select_type || 'static') === 'dynamic'">
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">SQL Query</label>
                                <textarea
                                    :value="getColumnConfig(column.name).options"
                                    @input="updateColumnConfig(column.name, 'options', $event.target.value)"
                                    class="form-textarea text-sm py-1.5 font-mono"
                                    rows="3"
                                    placeholder="SELECT code, title FROM articles_languages"
                                />
                                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Enter SQL query. First column = value, second column = label. If only one column, it will be used for both.
                                </p>
                            </div>
                        </div>
                        
                        <!-- File Interface Options -->
                        <div
                            v-if="(uiConfig[column.name]?.interface || getColumnConfig(column.name).interface) === 'file'"
                            class="pt-1 space-y-3"
                        >
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Root Folder (Optional)</label>
                                <input
                                    :value="uiConfig[column.name]?.file_root_folder || getColumnConfig(column.name).file_root_folder || ''"
                                    @input="updateColumnConfig(column.name, 'file_root_folder', $event.target.value)"
                                    type="text"
                                    class="form-input text-sm py-1.5"
                                    placeholder="Leave empty to use table name"
                                />
                                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    Custom root folder name for file uploads. If empty, the table name will be used.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            
            <div v-else-if="tableExists === null" class="text-xs text-gray-600 dark:text-gray-400">
                Enter a table name above to check and configure columns.
            </div>
        </div>
        
        <div v-else class="text-xs text-gray-500 dark:text-gray-400">
            Enter a table name above to configure the UI.
        </div>
    </div>
</template>

