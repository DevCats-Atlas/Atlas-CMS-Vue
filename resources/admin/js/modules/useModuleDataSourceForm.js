import { computed, reactive, ref } from 'vue';
import { useForm } from '@inertiajs/vue3';
import { adminUrl } from '@/utils/adminUrl';
import {
    DATA_SOURCE_NODES, dataSourceValues, fieldState, ITEMS_ONLY_NODES, readDataSource, settingsTabFields, withFieldValues,
} from './moduleForm.js';

/**
 * State of the module settings form. Data source settings live in one reactive `source` object and are written
 * into their custom fields when the form is submitted (`dataSourceValues`), so the request is the same as before.
 *
 * @param {object} props Show.vue props (`module`, `customFieldTabs`, `collections`, `collectionCreateValue`)
 */
export function useModuleDataSourceForm(props) {
    const createOption = props.collectionCreateValue || '__create_collection__';
    const fields = computed(() => settingsTabFields(props.customFieldTabs));
    const initialState = Object.fromEntries(
        props.customFieldTabs.flatMap((tab) => tab.fields ?? []).map((field) => [field.id, fieldState(field)]),
    );
    const stored = readDataSource(fields.value, initialState);

    const defaultCollection = () => {
        if (props.module.collection?.id) {
            return String(props.module.collection.id);
        }
        return props.collections.length ? String(props.collections[0].id) : createOption;
    };

    const form = useForm({
        title: props.module.title,
        visible: props.module.visible,
        item_type_id: props.module.item_type_id ? String(props.module.item_type_id) : '',
        collection_choice: defaultCollection(),
        collection_title: '',
        data_source: stored.dataSource,
        data_source_table: stored.table,
        data_source_ui: stored.ui,
        custom_fields: initialState,
    });

    // Everything except the data source type, table and UI JSON, which are top-level form fields
    const source = reactive({ ...stored });
    delete source.dataSource;
    delete source.table;
    delete source.ui;
    // The table name is applied explicitly (it reloads the column editor); the input is kept apart until then
    const tableInput = ref(stored.table);

    const isDbTable = computed(() => (form.data_source || 'items') === 'db_table');
    const isCustom = computed(() => form.data_source === 'custom');
    const uiConfig = computed(() => {
        try {
            return form.data_source_ui ? JSON.parse(form.data_source_ui) : {};
        } catch {
            return {};
        }
    });

    // Remaining settings are edited through their field interfaces
    const otherSettingsFields = computed(() => fields.value.filter((field) => !DATA_SOURCE_NODES.includes(field.node)
        && !(isDbTable.value && ITEMS_ONLY_NODES.includes(field.node))));
    const fieldModel = (field) => {
        form.custom_fields[field.id] ??= fieldState(field);
        return form.custom_fields[field.id];
    };

    const applyTable = () => {
        form.data_source_table = tableInput.value;
    };

    const submit = (options = {}) => {
        form.data_source_table = tableInput.value;
        const values = dataSourceValues({ ...source, dataSource: form.data_source, table: tableInput.value, ui: form.data_source_ui });
        form.transform((data) => ({ ...data, custom_fields: withFieldValues(data.custom_fields, fields.value, values) }))
            .put(adminUrl(`system/modules/${props.module.id}`), {
                preserveScroll: true,
                // Multipart only when a settings field uploads a file
                forceFormData: otherSettingsFields.value.some((field) => field.type === 'file'),
                ...options,
            });
    };

    return { form, source, tableInput, applyTable, isDbTable, isCustom, uiConfig, otherSettingsFields, fieldModel, createOption, submit };
}
