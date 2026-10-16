<script setup>
import { computed } from 'vue';
import { useTranslation } from '@/utils/useTranslation.js';
import UiConfigEditor from '../components/UiConfigEditor.vue';

/** db_table settings: connection, table, record handler, sorting, default order, column settings and tree. */
const props = defineProps({
    // Returned by useModuleDataSourceForm()
    moduleForm: { type: Object, required: true },
    moduleId: { type: [Number, String], required: true },
    dbConnections: { type: Array, default: () => [] },
});

const { t } = useTranslation();
const form = computed(() => props.moduleForm.form);
const source = computed(() => props.moduleForm.source);
const tableApplied = computed(() => props.moduleForm.tableInput.value === form.value.data_source_table);
const defaultConnectionLabel = computed(() => props.dbConnections.find((connection) => connection.is_default)?.label ?? 'default');
const HANDLER_METHODS = ['creating', 'created', 'updating', 'updated', 'deleting', 'deleted'];
</script>

<template>
    <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="heading-4 mb-4">{{ t('admin.module_settings.db_table_heading') }}</h3>
        <div class="grid gap-4 md:grid-cols-2">
            <div>
                <label class="form-label">{{ t('admin.module_settings.connection') }}</label>
                <select v-model="source.connection" class="form-select">
                    <option value="">{{ t('admin.module_settings.default_connection', { name: defaultConnectionLabel }) }}</option>
                    <option v-for="connection in dbConnections" :key="connection.key" :value="connection.key">{{ connection.label }}</option>
                </select>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.connection_hint') }}</p>
            </div>
        </div>
        <div class="grid gap-4 md:grid-cols-2 mt-4">
            <div>
                <label class="form-label">{{ t('admin.module_settings.table') }}</label>
                <div class="flex gap-2">
                    <input v-model="moduleForm.tableInput.value" type="text" class="form-input flex-1" translate="no" placeholder="users, products" />
                    <button
                        type="button"
                        class="btn btn-primary whitespace-nowrap flex items-center justify-center"
                        :class="{ 'opacity-50 cursor-not-allowed': tableApplied }"
                        :disabled="tableApplied"
                        :title="t('admin.module_settings.apply_table')"
                        @click="moduleForm.applyTable"
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
                <p v-if="form.errors.data_source_table" class="mt-1 text-sm text-red-600">{{ form.errors.data_source_table }}</p>
            </div>
            <div>
                <label class="form-label">{{ t('admin.module_settings.handler_class') }}</label>
                <input v-model="source.handlerClass" type="text" class="form-input" translate="no" placeholder="App\Handlers\CustomHandler" />
                <div class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs text-blue-800 dark:text-blue-300">
                    <p class="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        {{ t('admin.module_settings.handler_interface') }} <code class="text-xs">AtlasCMS\Contracts\Modules\DbTable\RecordHandler</code>
                    </p>
                    <p class="mb-2">{{ t('admin.module_settings.handler_hint') }}</p>
                    <ul class="space-y-1 list-disc list-inside">
                        <li v-for="method in HANDLER_METHODS" :key="method">
                            <code class="text-xs">{{ method }}()</code> — {{ t(`admin.module_settings.handler_${method}`) }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 class="heading-4 mb-4">{{ t('admin.module_settings.sorting') }}</h4>
            <div class="space-y-4">
                <div>
                    <label class="flex items-center gap-2">
                        <input v-model="source.sorting" type="checkbox" class="form-checkbox" />
                        <span class="text-sm text-gray-900 dark:text-white">{{ t('admin.module_settings.enable_sorting') }}</span>
                    </label>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.sorting_hint') }}</p>
                </div>
                <div v-if="source.sorting">
                    <label class="form-label">{{ t('admin.module_settings.sorting_column') }}</label>
                    <input v-model="source.sortingColumn" type="text" class="form-input" translate="no" placeholder="order_index" />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.sorting_column_hint') }}</p>
                </div>
            </div>
        </div>

        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 class="heading-4 mb-4">{{ t('admin.module_settings.default_order') }}</h4>
            <div class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="form-label">{{ t('admin.module_settings.order_by_column') }}</label>
                    <input v-model="source.orderByColumn" type="text" class="form-input" translate="no" placeholder="id, created_at, name" />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.order_by_column_hint') }}</p>
                </div>
                <div>
                    <label class="form-label">{{ t('admin.module_settings.order_direction') }}</label>
                    <select v-model="source.orderByDirection" class="form-select">
                        <option value="asc">{{ t('admin.module_settings.ascending') }}</option>
                        <option value="desc">{{ t('admin.module_settings.descending') }}</option>
                    </select>
                </div>
            </div>
        </div>

        <div v-if="form.data_source_table && form.data_source_table.trim() !== ''" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 class="heading-4 mb-4">{{ t('admin.module_settings.field_configuration') }}</h4>
            <UiConfigEditor
                :key="form.data_source_table"
                :table-name="form.data_source_table"
                :connection="source.connection"
                :module-id="moduleId"
                :initial-ui-config="form.data_source_ui"
                with-field-groups
                with-casts
                @update:ui-config="(config) => { form.data_source_ui = config; }"
            />
        </div>

        <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 class="heading-4 mb-4">{{ t('admin.module_settings.tree') }}</h4>
            <div class="space-y-4">
                <div>
                    <label class="flex items-center gap-2">
                        <input v-model="source.deepStructure" type="checkbox" class="form-checkbox" />
                        <span class="text-sm text-gray-900 dark:text-white">{{ t('admin.module_settings.enable_tree') }}</span>
                    </label>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.tree_hint') }}</p>
                </div>
                <div v-if="source.deepStructure">
                    <label class="form-label">{{ t('admin.module_settings.parent_column') }}</label>
                    <input v-model="source.parentColumn" type="text" class="form-input" translate="no" placeholder="parent_id" />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.parent_column_hint') }}</p>
                </div>
            </div>
        </div>

        <slot />
    </div>
</template>
