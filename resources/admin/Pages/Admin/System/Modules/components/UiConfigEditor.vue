<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed, ref, watch } from 'vue';
import { useTranslation } from '@/utils/useTranslation.js';
import { columnDefaults, configForColumns, INTERFACE_TYPES, parseUiConfig, serializeUiConfig } from '@/dbTable/uiConfig.js';
import FieldGroupsBuilder from './FieldGroupsBuilder.vue';

/**
 * Column settings (`uiConfig`) of a db_table module or relationship. Columns are read from `connection` — the
 * value currently chosen in the module form, saved or not; empty means the default connection.
 */
const props = defineProps({
    tableName: { type: String, default: '' },
    connection: { type: String, default: '' },
    // Without a module (new relationship) the generic endpoint is used
    moduleId: { type: [Number, String], default: null },
    initialUiConfig: { type: [String, Object], default: null },
    // Columns not configured here, e.g. the foreign key a hasMany/hasOne relationship fills itself
    excludeColumns: { type: Array, default: () => [] },
    // Module-only parts: form field groups and list casts (DbTableCasts decorates the module list)
    withFieldGroups: { type: Boolean, default: false },
    withCasts: { type: Boolean, default: false },
});

const emit = defineEmits(['update:uiConfig']);
const { t } = useTranslation();

const parsed = parseUiConfig(props.initialUiConfig);
const uiConfig = ref(parsed.columns);
const fieldGroups = ref(parsed.groups);
const showGroupsBuilder = ref(parsed.groups.length > 0);

const columns = ref([]);
const loading = ref(false);
const errorMessage = ref(null);
const table = computed(() => (props.tableName || '').trim());
const shownColumns = computed(() => columns.value.filter((column) => !props.excludeColumns.includes(column.name)));

const emitUiConfig = () => emit('update:uiConfig', serializeUiConfig(uiConfig.value, fieldGroups.value));

const loadColumns = async ([tableName, connection], previous, onCleanup) => {
    // A connection change or unmount makes every result of this request obsolete, including errors.
    let active = true;
    onCleanup(() => { active = false; });
    columns.value = [];
    errorMessage.value = null;
    loading.value = false;
    if (tableName === '') {
        return;
    }

    loading.value = true;
    try {
        const url = adminUrl(props.moduleId ? `system/modules/${props.moduleId}/check-table-columns` : 'system/modules/check-table-columns');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ table_name: tableName, connection: connection || '' }),
        });
        const data = await response.json().catch(() => ({}));

        if (!active) {
            return;
        }
        if (!response.ok || !data.exists) {
            errorMessage.value = data.error || data.message || t('admin.ui_config.table_not_found');
            return;
        }
        columns.value = data.columns || [];
        uiConfig.value = configForColumns(uiConfig.value, columns.value.map((column) => column.name));
        emitUiConfig();
    } catch (error) {
        if (active) {
            errorMessage.value = t('admin.ui_config.check_failed', { message: error.message || '' });
        }
    } finally {
        if (active) {
            loading.value = false;
        }
    }
};

watch([table, () => props.connection], loadColumns, { immediate: true });

const config = (name) => uiConfig.value[name] ?? columnDefaults(name);
const update = (name, field, value) => {
    uiConfig.value[name] = { ...config(name), [field]: value };
    emitUiConfig();
};
const onGroupsUpdate = (groups) => {
    fieldGroups.value = groups;
    emitUiConfig();
};

const OPTION_PLACEHOLDERS = {
    comma: 'option1, option2, option3',
    newline: 'option1\noption2\noption3',
    value_label: 'value1=Label 1\nvalue2=Label 2\nvalue3=Label 3',
};
const inputType = (name) => config(name).select_input_type || 'comma';
const selectType = (name) => config(name).select_type || 'static';
</script>

<template>
    <div class="space-y-3">
        <div v-if="table === ''" class="text-xs text-gray-500 dark:text-gray-400">
            {{ t('admin.ui_config.enter_table') }}
        </div>
        <div v-else-if="loading" class="text-xs text-gray-600 dark:text-gray-400">
            {{ t('admin.ui_config.checking_table') }}
        </div>
        <div v-else-if="errorMessage" class="rounded border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-2.5">
            <p class="text-xs font-medium text-red-800 dark:text-red-200">{{ errorMessage }}</p>
        </div>
        <div v-else-if="shownColumns.length > 0" class="space-y-6">
            <div v-if="withFieldGroups" class="space-y-3">
                <div class="flex items-center justify-between">
                    <div class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        {{ t('admin.ui_config.field_grouping') }}
                    </div>
                    <button
                        type="button"
                        class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        @click="showGroupsBuilder = !showGroupsBuilder"
                    >
                        {{ showGroupsBuilder ? t('admin.ui_config.hide_groups') : t('admin.ui_config.configure_groups') }}
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
            </div>

            <div class="space-y-3">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {{ t('admin.ui_config.columns') }}
                </div>
                <div
                    v-for="column in shownColumns"
                    :key="column.name"
                    class="rounded border border-gray-200 dark:border-gray-700 p-3 space-y-3"
                >
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 text-sm">
                            <span class="font-medium text-gray-900 dark:text-white">{{ column.name }}</span>
                            <span class="text-xs text-gray-500 dark:text-gray-400">({{ column.type }})</span>
                        </div>
                        <div class="flex items-center gap-4 text-xs text-gray-700 dark:text-gray-300">
                            <label class="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    class="form-checkbox h-3.5 w-3.5"
                                    :checked="config(column.name).show_in_list !== false"
                                    @change="update(column.name, 'show_in_list', $event.target.checked)"
                                />
                                <span>{{ t('admin.ui_config.show_in_list') }}</span>
                            </label>
                            <label class="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    class="form-checkbox h-3.5 w-3.5"
                                    :checked="config(column.name).editable !== false"
                                    @change="update(column.name, 'editable', $event.target.checked)"
                                />
                                <span>{{ t('admin.ui_config.editable') }}</span>
                            </label>
                            <label v-if="config(column.name).editable === false" class="inline-flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    class="form-checkbox h-3.5 w-3.5"
                                    :checked="config(column.name).hide_in_form"
                                    @change="update(column.name, 'hide_in_form', $event.target.checked)"
                                />
                                <span>{{ t('admin.ui_config.hide_in_form') }}</span>
                            </label>
                        </div>
                    </div>

                    <div class="grid gap-3 md:grid-cols-2">
                        <div>
                            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.common.title_label') }}</label>
                            <input
                                type="text"
                                class="form-input text-sm py-1.5"
                                :value="config(column.name).title"
                                :placeholder="t('admin.ui_config.display_title')"
                                @input="update(column.name, 'title', $event.target.value)"
                            />
                        </div>
                        <div>
                            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.interface') }}</label>
                            <select
                                class="form-select text-sm py-1.5"
                                :value="config(column.name).interface"
                                @change="update(column.name, 'interface', $event.target.value)"
                            >
                                <option v-for="type in INTERFACE_TYPES" :key="type" :value="type">
                                    {{ t(`admin.ui_config.interfaces.${type}`) }}
                                </option>
                            </select>
                        </div>
                    </div>

                    <div v-if="config(column.name).interface === 'select'" class="pt-1 space-y-3">
                        <div>
                            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.select_type') }}</label>
                            <select
                                class="form-select text-sm py-1.5"
                                :value="selectType(column.name)"
                                @change="update(column.name, 'select_type', $event.target.value)"
                            >
                                <option value="static">{{ t('admin.ui_config.select_static') }}</option>
                                <option value="dynamic">{{ t('admin.ui_config.select_dynamic') }}</option>
                            </select>
                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.ui_config.select_type_hint') }}</p>
                        </div>

                        <template v-if="selectType(column.name) === 'static'">
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.input_type') }}</label>
                                <select
                                    class="form-select text-sm py-1.5"
                                    :value="inputType(column.name)"
                                    @change="update(column.name, 'select_input_type', $event.target.value)"
                                >
                                    <option value="comma">{{ t('admin.ui_config.input_comma') }}</option>
                                    <option value="newline">{{ t('admin.ui_config.input_newline') }}</option>
                                    <option value="value_label">{{ t('admin.ui_config.input_value_label') }}</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.options') }}</label>
                                <textarea
                                    class="form-textarea text-sm py-1.5"
                                    :rows="inputType(column.name) === 'comma' ? 2 : 4"
                                    :value="config(column.name).options"
                                    :placeholder="OPTION_PLACEHOLDERS[inputType(column.name)] ?? OPTION_PLACEHOLDERS.comma"
                                    @input="update(column.name, 'options', $event.target.value)"
                                />
                                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ t(`admin.ui_config.options_hint_${inputType(column.name)}`) }}</p>
                            </div>
                        </template>

                        <div v-else>
                            <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.sql_query') }}</label>
                            <textarea
                                class="form-textarea text-sm py-1.5 font-mono"
                                rows="3"
                                translate="no" placeholder="SELECT code, title FROM articles_languages"
                                :value="config(column.name).options"
                                @input="update(column.name, 'options', $event.target.value)"
                            />
                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.ui_config.sql_hint') }}</p>
                            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.ui_config.sql_tree_hint') }}</p>
                        </div>
                    </div>

                    <div v-if="config(column.name).interface === 'file'" class="pt-1">
                        <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.file_root_folder') }}</label>
                        <input
                            type="text"
                            class="form-input text-sm py-1.5"
                            :value="config(column.name).file_root_folder || ''"
                            :placeholder="t('admin.ui_config.file_root_placeholder')"
                            @input="update(column.name, 'file_root_folder', $event.target.value)"
                        />
                        <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.ui_config.file_root_hint') }}</p>
                    </div>

                    <div v-if="withCasts" class="pt-2 border-t border-gray-100 dark:border-gray-700/50">
                        <label class="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                class="form-checkbox h-3.5 w-3.5"
                                :checked="config(column.name).cast_as_enabled"
                                @change="update(column.name, 'cast_as_enabled', $event.target.checked)"
                            />
                            <span>{{ t('admin.ui_config.cast_as') }}</span>
                        </label>
                        <div v-if="config(column.name).cast_as_enabled" class="mt-3 space-y-3 pl-5 border-l-2 border-blue-200 dark:border-blue-800">
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.cast_table') }}</label>
                                <input
                                    type="text"
                                    class="form-input text-sm py-1.5"
                                    translate="no" placeholder="users"
                                    :value="config(column.name).cast_table"
                                    @input="update(column.name, 'cast_table', $event.target.value)"
                                />
                            </div>
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.cast_foreign_key') }}</label>
                                <input
                                    type="text"
                                    class="form-input text-sm py-1.5"
                                    translate="no" placeholder="id"
                                    :value="config(column.name).cast_foreign_key"
                                    @input="update(column.name, 'cast_foreign_key', $event.target.value)"
                                />
                            </div>
                            <div>
                                <label class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">{{ t('admin.ui_config.cast_template') }}</label>
                                <textarea
                                    class="form-textarea text-sm py-1.5"
                                    rows="2"
                                    translate="no" placeholder="{first_name} {last_name}"
                                    :value="config(column.name).cast_template"
                                    @input="update(column.name, 'cast_template', $event.target.value)"
                                />
                                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.ui_config.cast_template_hint') }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
