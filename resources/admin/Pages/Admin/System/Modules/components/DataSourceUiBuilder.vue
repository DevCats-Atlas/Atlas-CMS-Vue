<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { router } from '@inertiajs/vue3';
import { useToast } from '@/composables/useToast.js';

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
const loading = ref(false);
const errorMessage = ref(null);

const interfaceTypes = [
    { value: 'text', label: 'Text' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'wysiwyg', label: 'WYSIWYG' },
    { value: 'datetime', label: 'Date/Time' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'select', label: 'Select' },
];

// Initialize UI config from prop
const initializeUiConfig = () => {
    if (!props.initialUiConfig) {
        uiConfig.value = {};
        return;
    }

    try {
        if (typeof props.initialUiConfig === 'string') {
            uiConfig.value = JSON.parse(props.initialUiConfig);
        } else {
            uiConfig.value = { ...props.initialUiConfig };
        }
    } catch (e) {
        console.error('Failed to parse UI config:', e);
        uiConfig.value = {};
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
    const newConfig = { ...uiConfig.value };
    
    columns.value.forEach((column) => {
        if (!newConfig[column.name]) {
            newConfig[column.name] = {
                title: column.name,
                interface: 'text',
                options: '', // For select interface
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
    emit('update:uiConfig', JSON.stringify(uiConfig.value));
};

const getColumnConfig = (columnName) => {
    if (!uiConfig.value[columnName]) {
        return {
            title: columnName,
            interface: 'text',
            options: '',
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
            
            <div v-else-if="tableExists && columns.length > 0" class="space-y-3">
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
                            class="pt-1"
                        >
                            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Options</label>
                            <textarea
                                :value="getColumnConfig(column.name).options"
                                @input="updateColumnConfig(column.name, 'options', $event.target.value)"
                                class="form-textarea text-sm py-1.5"
                                rows="2"
                                placeholder="option1, option2, option3"
                            />
                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                Comma-separated options
                            </p>
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

