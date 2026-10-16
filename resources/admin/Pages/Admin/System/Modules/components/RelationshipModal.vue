<script setup>
import { ref, watch, computed } from 'vue';
import UiConfigEditor from './UiConfigEditor.vue';
import { useTranslation } from '@/utils/useTranslation.js';

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
    // Connection chosen in the module form: related tables live on the module's connection
    connection: {
        type: String,
        default: '',
    },
});

const { t } = useTranslation();

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
    // UiConfigEditor fetches the table structure itself
    // because it watches the tableName prop and has :key binding
    formData.value.related_table = relatedTableInput.value;
};

// Watch for UI config changes from UiConfigEditor
watch(relatedTableUiConfig, (newConfig) => {
    formData.value.ui_config = newConfig;
});

const isEditMode = computed(() => !!props.relationship);

// hasMany/hasOne related forms never show the foreign key: the server fills it (DbTableRelationshipContext)
const serverFilledColumns = computed(() => (['hasMany', 'hasOne'].includes(formData.value.type) && formData.value.foreign_key
    ? [formData.value.foreign_key]
    : []));

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
            <div class="modal-header">
                <h3 class="section-heading">
                    {{ isEditMode ? t('admin.relationships.edit_relationship') : t('admin.relationship_form.create') }}
                </h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    @click="close"
                >
                    ✕
                </button>
            </div>
            <div class="modal-body">
                <form @submit.prevent="submit" class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-2">
                        <!-- 1. Name (First) -->
                        <div>
                            <label class="form-label">{{ t('admin.relationship_form.name') }} <span class="text-gray-400 text-xs">{{ t('admin.relationship_form.optional') }}</span></label>
                            <input
                                v-model="formData.name"
                                type="text"
                                class="form-input"
                                :placeholder="t('admin.relationship_form.name_placeholder')"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.name_hint') }}
                            </p>
                        </div>
                        
                        <!-- 2. Related Table (Second) -->
                        <div>
                            <label class="form-label">
                                <span v-if="formData.type === 'belongsToMany'">{{ t('admin.relationship_form.final_related_table') }}</span>
                                <span v-else>{{ t('admin.relationship_form.related_table') }}</span>
                                <span class="text-red-500">*</span>
                            </label>
                            <div class="flex gap-2">
                                <input
                                    v-model="relatedTableInput"
                                    type="text"
                                    class="form-input flex-1"
                                    translate="no"
                                    placeholder="orders, users, venues_categories"
                                    required
                                />
                                <button
                                    type="button"
                                    @click="applyRelatedTable"
                                    :disabled="relatedTableInput === formData.related_table"
                                    class="btn btn-primary whitespace-nowrap flex items-center justify-center"
                                    :class="{ 'opacity-50 cursor-not-allowed': relatedTableInput === formData.related_table }"
                                    :title="t('admin.relationship_form.apply_table')"
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
                                <span v-if="formData.type === 'belongsToMany'">{{ t('admin.relationship_form.final_related_table_hint') }}</span>
                                <span v-else>{{ t('admin.relationship_form.related_table_hint') }}</span>
                            </p>
                        </div>
                        
                        <!-- 3. Type (Third) -->
                        <div>
                            <label class="form-label">{{ t('admin.relationship_form.type') }} <span class="text-red-500">*</span></label>
                            <select
                                v-model="formData.type"
                                class="form-select"
                                required
                            >
                                <option v-for="type in ['hasOne', 'hasMany', 'belongsTo', 'belongsToMany']" :key="type" :value="type">
                                    {{ t(`admin.relationships.type.${type}`) }} ({{ type }})
                                </option>
                            </select>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.type_hint') }}
                            </p>
                        </div>
                        
                        <!-- 4. Local Key (Fourth) -->
                        <div v-if="formData.type === 'hasOne' || formData.type === 'hasMany'">
                            <label class="form-label">{{ t('admin.relationship_form.local_key') }}</label>
                            <input
                                v-model="formData.local_key"
                                type="text"
                                class="form-input"
                                translate="no" placeholder="id"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.local_key_hint') }}
                            </p>
                        </div>
                        
                        <!-- 5. Foreign Key (Fifth) -->
                        <div>
                            <label class="form-label">{{ t('admin.relationship_form.foreign_key') }} <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.foreign_key"
                                type="text"
                                class="form-input"
                                translate="no"
                                placeholder="user_id"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="formData.type === 'belongsToMany'">{{ t('admin.relationship_form.foreign_key_pivot_hint') }}</span>
                                <span v-else-if="formData.type === 'belongsTo'">{{ t('admin.relationship_form.foreign_key_belongs_to_hint') }}</span>
                                <span v-else>{{ t('admin.relationship_form.foreign_key_hint') }}</span>
                            </p>
                        </div>
                        
                        <!-- Additional fields based on type -->
                        <div v-if="formData.type === 'belongsTo'">
                            <label class="form-label">{{ t('admin.relationship_form.owner_key') }}</label>
                            <input
                                v-model="formData.owner_key"
                                type="text"
                                class="form-input"
                                translate="no" placeholder="id"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.owner_key_hint') }}
                            </p>
                        </div>
                        
                        <div v-if="formData.type === 'belongsToMany'">
                            <label class="form-label">{{ t('admin.relationship_form.pivot_table') }} <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.pivot_table"
                                type="text"
                                class="form-input"
                                translate="no"
                                placeholder="venues_categories_records, user_roles"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.pivot_table_hint') }}
                            </p>
                        </div>
                        
                        <div v-if="formData.type === 'belongsToMany'">
                            <label class="form-label">{{ t('admin.relationship_form.related_key') }} <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.related_key"
                                type="text"
                                class="form-input"
                                translate="no"
                                placeholder="category_id, role_id"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.related_key_hint') }}
                            </p>
                        </div>
                        
                        <!-- PHP Handler class -->
                        <div class="md:col-span-2">
                            <label class="form-label">{{ t('admin.relationship_form.handler_class') }} <span class="text-gray-400 text-xs">{{ t('admin.relationship_form.optional') }}</span></label>
                            <input
                                v-model="formData.handler_class"
                                type="text"
                                class="form-input"
                                translate="no"
                                placeholder="App\Handlers\CustomRelationshipHandler"
                            />
                            <div class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                <p class="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-2">
                                    {{ t('admin.module_settings.handler_interface') }} <code class="text-xs">AtlasCMS\Contracts\Modules\DbTable\RecordHandler</code>
                                </p>
                                <p class="text-xs text-blue-800 dark:text-blue-300 mb-2">
                                    {{ t('admin.relationship_form.handler_hint') }}
                                </p>
                                <ul class="text-xs text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                                    <li><code>creating($context, $tableName, &$data, $request)</code> — {{ t('admin.relationship_form.handler_creating') }}</li>
                                    <li><code>created($context, $tableName, $recordId, $data, $request)</code> — {{ t('admin.relationship_form.handler_created') }}</li>
                                    <li><code>updating($context, $tableName, $recordId, &$data, $originalData, $request)</code> — {{ t('admin.relationship_form.handler_updating') }}</li>
                                    <li><code>updated($context, $tableName, $recordId, $data, $originalData, $request)</code> — {{ t('admin.relationship_form.handler_updated') }}</li>
                                    <li><code>deleting($context, $tableName, $recordId, $data, $request)</code> — {{ t('admin.relationship_form.handler_deleting') }}</li>
                                    <li><code>deleted($context, $tableName, $recordId, $data, $request)</code> — {{ t('admin.relationship_form.handler_deleted') }}</li>
                                </ul>
                            </div>
                        </div>
                        
                        <!-- Field Configuration for Related Table -->
                        <div v-if="formData.related_table && formData.related_table.trim() !== ''" class="md:col-span-2">
                            <label class="form-label">{{ t('admin.relationship_form.field_configuration') }} <span class="text-gray-400 text-xs">{{ t('admin.relationship_form.optional') }}</span></label>
                            <UiConfigEditor
                                :table-name="formData.related_table"
                                :connection="connection"
                                :module-id="moduleId"
                                :initial-ui-config="relatedTableUiConfig"
                                :exclude-columns="serverFilledColumns"
                                :key="formData.related_table"
                                @update:ui-config="(config) => { relatedTableUiConfig = config; formData.ui_config = config; }"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {{ t('admin.relationship_form.field_configuration_hint') }}
                            </p>
                        </div>
                    </div>
                    
                    <div class="actions-footer pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" class="btn-text" @click="close">{{ t('admin.common.cancel') }}</button>
                        <button type="submit" class="btn btn-primary">{{ t('admin.common.save') }}</button>
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

