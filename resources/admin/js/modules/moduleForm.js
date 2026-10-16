/**
 * Module settings form (System/Modules/Show.vue): custom field state and the data source settings stored in module
 * custom fields. Pure helpers, covered by `tests/Frontend/moduleForm.test.mjs`. The request keeps its shape:
 * every setting goes to `custom_fields[fieldId].default` as before.
 */

/** Custom fields edited by the data source part of the form rather than the generic settings list. */
export const DATA_SOURCE_NODES = [
    'data_source',
    'data_source_table',
    'data_source_ui',
    'db_table_connection',
    'db_table_handler_class',
    'db_table_deep_structure',
    'db_table_parent_column',
    'db_table_relationships',
    'db_table_filters',
    'db_table_order_by_column',
    'db_table_order_by_direction',
    'db_table_sorting',
    'db_table_sorting_column',
    'module_custom_buttons',
];

/** Items-module settings that db_table modules do not use. */
export const ITEMS_ONLY_NODES = ['deep_structure', 'sorting', 'columns_to_show'];

export function normalizeCheckbox(value) {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'string') {
        return value === '1' || value === 'true' || value === 'on';
    }

    return Boolean(value);
}

/** `{ default, translations }` for a custom field from its stored values (files start empty). */
export function fieldState(field) {
    const values = field.values ?? {};
    const normalize = (value) => {
        if (field.type === 'file') {
            return null;
        }
        if (field.type === 'checkbox') {
            return normalizeCheckbox(value);
        }

        return value ?? '';
    };
    const fallback = field.node === 'data_source' ? 'items' : undefined;
    const translations = Object.fromEntries(
        Object.entries(values.translations ?? {}).map(([lang, value]) => [lang, field.type === 'file' || field.type === 'checkbox' ? normalize(value) : value]),
    );

    return { default: normalize(values.default ?? fallback), translations };
}

/** The settings tab of a module: "Settings", else the first visible tab, else the first one. */
export function settingsTabFields(tabs) {
    const tab = tabs.find((candidate) => candidate.title === 'Settings')
        ?? tabs.find((candidate) => candidate.visible === true)
        ?? tabs[0];

    return tab?.fields ?? [];
}

const DEFAULT_SEARCH = { enabled: true, label: 'Search', placeholder: 'Search across all columns', columns: [] };

const parseJson = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
        return fallback;
    }
};

/** Data source settings from the stored custom field values (`state[fieldId].default`). */
export function readDataSource(fields, state) {
    const stored = (node) => {
        const field = fields.find((candidate) => candidate.node === node);
        return field ? state[field.id]?.default : undefined;
    };
    const filters = parseJson(stored('db_table_filters'), {});
    const relationships = parseJson(stored('db_table_relationships'), {});

    return {
        dataSource: stored('data_source') || 'items',
        table: stored('data_source_table') || '',
        ui: stored('data_source_ui') || '',
        connection: stored('db_table_connection') || '',
        handlerClass: stored('db_table_handler_class') || '',
        deepStructure: normalizeCheckbox(stored('db_table_deep_structure')),
        parentColumn: stored('db_table_parent_column') || 'parent_id',
        // Other keys stored next to the list are kept as they are
        relationships: { ...relationships, relationships: relationships.relationships ?? [] },
        filters: { filters: filters.filters ?? [], default_search: filters.default_search ?? { ...DEFAULT_SEARCH } },
        sorting: normalizeCheckbox(stored('db_table_sorting')),
        sortingColumn: stored('db_table_sorting_column') || 'order_index',
        orderByColumn: stored('db_table_order_by_column') || '',
        orderByDirection: stored('db_table_order_by_direction') || 'asc',
        buttons: { buttons: parseJson(stored('module_custom_buttons'), {}).buttons ?? [] },
    };
}

/** Stored values (`node => string`) of the data source settings, as the module update request expects them. */
export function dataSourceValues(source) {
    return {
        data_source: source.dataSource,
        data_source_table: source.table || '',
        data_source_ui: source.ui || '',
        db_table_connection: source.connection || '',
        db_table_handler_class: source.handlerClass || '',
        db_table_deep_structure: source.deepStructure ? '1' : '0',
        db_table_parent_column: source.parentColumn,
        db_table_relationships: JSON.stringify(source.relationships),
        db_table_filters: JSON.stringify(source.filters),
        db_table_sorting: source.sorting ? '1' : '0',
        db_table_sorting_column: source.sortingColumn,
        db_table_order_by_column: source.orderByColumn,
        db_table_order_by_direction: source.orderByDirection,
        module_custom_buttons: JSON.stringify(source.buttons),
    };
}

/** Custom field state with `values` written into the fields that exist on this module. */
export function withFieldValues(state, fields, values) {
    const next = { ...state };
    for (const field of fields) {
        if (field.node in values) {
            next[field.id] = { ...(next[field.id] ?? { translations: {} }), default: values[field.node] };
        }
    }

    return next;
}
