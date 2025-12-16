<script setup>
import { ref, watch, computed } from 'vue';
import FieldConfigurationBuilder from './FieldConfigurationBuilder.vue';

const props = defineProps({
    open: {
        type: Boolean,
        default: false,
    },
    relationship: {
        type: Object,
        default: null,
    },
    moduleId: {
        type: [Number, String],
        default: null,
    },
});

const emit = defineEmits(['close', 'save']);

const formData = ref({
    related_table: '',
    type: 'hasMany',
    local_key: 'id',
    foreign_key: '',
    name: '',
    owner_key: 'id',
    pivot_table: '',
    related_key: '',
    ui_config: '',
    handler_class: '',
});

const relatedTableUiConfig = ref('');

// Local state for related_table input (separate from form to prevent auto-fetch)
const relatedTableInput = ref('');

// Initialize form when relationship changes or modal opens
watch([() => props.open, () => props.relationship], () => {
    if (props.open) {
        if (props.relationship) {
            // Edit mode - populate with existing data
            formData.value = {
                related_table: props.relationship.related_table || '',
                type: props.relationship.type || 'hasMany',
                local_key: props.relationship.local_key || 'id',
                foreign_key: props.relationship.foreign_key || '',
                name: props.relationship.name || '',
                owner_key: props.relationship.owner_key || 'id',
                pivot_table: props.relationship.pivot_table || '',
                related_key: props.relationship.related_key || '',
                ui_config: props.relationship.ui_config || '',
                handler_class: props.relationship.handler_class || '',
            };
            relatedTableUiConfig.value = props.relationship.ui_config || '';
            relatedTableInput.value = props.relationship.related_table || '';
        } else {
            // Create mode - reset to defaults
            formData.value = {
                related_table: '',
                type: 'hasMany',
                local_key: 'id',
                foreign_key: '',
                name: '',
                owner_key: 'id',
                pivot_table: '',
                related_key: '',
                ui_config: '',
                handler_class: '',
            };
            relatedTableUiConfig.value = '';
            relatedTableInput.value = '';
        }
    }
}, { immediate: true });

// Sync relatedTableInput when formData.related_table changes (e.g., after applying)
watch(
    () => formData.value.related_table,
    (newValue) => {
        if (newValue !== relatedTableInput.value) {
            relatedTableInput.value = newValue;
        }
    },
);

// Apply related table name change (just updates local state to trigger table fetch)
const applyRelatedTable = () => {
    // Simply update formData.related_table to match the input
    // The FieldConfigurationBuilder component will automatically fetch the table structure
    // because it watches the tableName prop and has :key binding
    formData.value.related_table = relatedTableInput.value;
};

// Watch for UI config changes from FieldConfigurationBuilder
watch(relatedTableUiConfig, (newConfig) => {
    formData.value.ui_config = newConfig;
});

const isEditMode = computed(() => !!props.relationship);

const submit = () => {
    // Sync related_table input to formData before submitting
    formData.value.related_table = relatedTableInput.value;
    emit('save', { ...formData.value });
    emit('close');
};

const close = () => {
    emit('close');
};
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
        @click.self="close"
    >
        <div class="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ isEditMode ? 'Edit Relationship' : 'Create Relationship' }}
                </h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    @click="close"
                >
                    ✕
                </button>
            </div>
            <div class="px-6 py-4 overflow-y-auto flex-1">
                <form @submit.prevent="submit" class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-2">
                        <!-- 1. Name (First) -->
                        <div>
                            <label class="form-label">Name <span class="text-gray-400 text-xs">(optional)</span></label>
                            <input
                                v-model="formData.name"
                                type="text"
                                class="form-input"
                                placeholder="Auto-generated if empty"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Relationship name (used in code). If empty, will be auto-generated from related table name.
                            </p>
                        </div>
                        
                        <!-- 2. Related Table (Second) -->
                        <div>
                            <label class="form-label">
                                <span v-if="formData.type === 'belongsToMany'">Final Related Table</span>
                                <span v-else>Related Table</span>
                                <span class="text-red-500">*</span>
                            </label>
                            <div class="flex gap-2">
                                <input
                                    v-model="relatedTableInput"
                                    type="text"
                                    class="form-input flex-1"
                                    placeholder="e.g., orders, users, venues_categories"
                                    required
                                />
                                <button
                                    type="button"
                                    @click="applyRelatedTable"
                                    :disabled="relatedTableInput === formData.related_table"
                                    class="btn btn-primary whitespace-nowrap flex items-center justify-center"
                                    :class="{ 'opacity-50 cursor-not-allowed': relatedTableInput === formData.related_table }"
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
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="formData.type === 'belongsToMany'">The final table you want to access (through the pivot table)</span>
                                <span v-else>The table this relationship connects to</span>
                            </p>
                        </div>
                        
                        <!-- 3. Type (Third) -->
                        <div>
                            <label class="form-label">Type <span class="text-red-500">*</span></label>
                            <select
                                v-model="formData.type"
                                class="form-select"
                                required
                            >
                                <option value="hasOne">hasOne</option>
                                <option value="hasMany">hasMany</option>
                                <option value="belongsTo">belongsTo</option>
                                <option value="belongsToMany">belongsToMany</option>
                            </select>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Relationship type
                            </p>
                        </div>
                        
                        <!-- 4. Local Key (Fourth) -->
                        <div v-if="formData.type === 'hasOne' || formData.type === 'hasMany'">
                            <label class="form-label">Local Key</label>
                            <input
                                v-model="formData.local_key"
                                type="text"
                                class="form-input"
                                placeholder="id"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Column in this table (default: id)
                            </p>
                        </div>
                        
                        <!-- 5. Foreign Key (Fifth) -->
                        <div>
                            <label class="form-label">Foreign Key <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.foreign_key"
                                type="text"
                                class="form-input"
                                placeholder="e.g., user_id"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="formData.type === 'belongsToMany'">Column in pivot table pointing to this table (e.g., venue_id in venues_categories_records)</span>
                                <span v-else-if="formData.type === 'belongsTo'">Column in this table pointing to related table</span>
                                <span v-else>Column in related table pointing to this table</span>
                            </p>
                        </div>
                        
                        <!-- Additional fields based on type -->
                        <div v-if="formData.type === 'belongsTo'">
                            <label class="form-label">Owner Key</label>
                            <input
                                v-model="formData.owner_key"
                                type="text"
                                class="form-input"
                                placeholder="id"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Column in related table (default: id)
                            </p>
                        </div>
                        
                        <div v-if="formData.type === 'belongsToMany'">
                            <label class="form-label">Pivot Table (Intermediate) <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.pivot_table"
                                type="text"
                                class="form-input"
                                placeholder="e.g., venues_categories_records, user_roles"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The intermediate/pivot table that connects this table to the final related table
                            </p>
                        </div>
                        
                        <div v-if="formData.type === 'belongsToMany'">
                            <label class="form-label">Related Key <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.related_key"
                                type="text"
                                class="form-input"
                                placeholder="e.g., category_id, role_id"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Column in pivot table pointing to the final related table (e.g., category_id in venues_categories_records pointing to venues_categories)
                            </p>
                        </div>
                        
                        <!-- PHP Handler class -->
                        <div class="md:col-span-2">
                            <label class="form-label">PHP Handler class <span class="text-gray-400 text-xs">(optional)</span></label>
                            <input
                                v-model="formData.handler_class"
                                type="text"
                                class="form-input"
                                placeholder="e.g., App\Handlers\CustomRelationshipHandler"
                            />
                            <div class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p class="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                                    Interface: <code class="text-xs">AtlasCMS\Contracts\Modules\DbTable\RecordHandler</code>
                                </p>
                                <p class="text-xs text-blue-800 dark:text-blue-300 mb-2">
                                    The class must implement this interface. You can extend <code class="text-xs">AbstractRecordHandler</code> to make all methods optional. Available methods:
                                </p>
                                <ul class="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                                    <li><code>creating($context, $tableName, &$data, $request)</code> - Called before creating a related record</li>
                                    <li><code>created($context, $tableName, $recordId, $data, $request)</code> - Called after a related record is created</li>
                                    <li><code>updating($context, $tableName, $recordId, &$data, $originalData, $request)</code> - Called before updating a related record</li>
                                    <li><code>updated($context, $tableName, $recordId, $data, $originalData, $request)</code> - Called after a related record is updated</li>
                                    <li><code>deleting($context, $tableName, $recordId, $data, $request)</code> - Called before deleting a related record</li>
                                    <li><code>deleted($context, $tableName, $recordId, $data, $request)</code> - Called after a related record is deleted</li>
                                </ul>
                            </div>
                        </div>
                        
                        <!-- Field Configuration for Related Table -->
                        <div v-if="formData.related_table && formData.related_table.trim() !== ''" class="md:col-span-2">
                            <label class="form-label">Field Configuration <span class="text-gray-400 text-xs">(optional)</span></label>
                            <FieldConfigurationBuilder
                                :table-name="formData.related_table"
                                :module-id="moduleId"
                                :initial-ui-config="relatedTableUiConfig"
                                :show-editable="true"
                                :show-show-in-list="true"
                                :key="formData.related_table"
                                @update:ui-config="(config) => { relatedTableUiConfig = config; formData.ui_config = config; }"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Configure which columns to display, how they appear, and which fields are editable when editing related records.
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" class="btn-text" @click="close">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

