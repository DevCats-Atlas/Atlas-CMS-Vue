/**
 * The `uiConfig` JSON of a db_table module or relationship: one entry per column plus optional `field_groups`
 * (format: AtlasCMS docs/db-table.md, read by DbTableFormBuilder). Pure helpers for UiConfigEditor, covered by
 * `tests/Frontend/dbTableUiConfig.test.mjs`.
 */

export const INTERFACE_TYPES = ['text', 'textarea', 'wysiwyg', 'datetime', 'checkbox', 'select', 'file'];

/** Settings a column gets when it has none; missing keys of older configs are filled with the same values. */
export const columnDefaults = (name) => ({
    title: name,
    interface: 'text',
    options: '',
    select_type: 'static',
    select_input_type: 'comma',
    editable: true,
    show_in_list: true,
});

/** `{ columns, groups }` from the stored value (JSON string or object); invalid JSON gives an empty config. */
export function parseUiConfig(value) {
    let config = {};
    if (value && typeof value === 'object') {
        config = { ...value };
    } else if (typeof value === 'string' && value.trim() !== '') {
        try {
            const parsed = JSON.parse(value);
            config = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
            config = {};
        }
    }
    const { field_groups: groups, ...columns } = config;

    return { columns, groups: Array.isArray(groups) ? groups : [] };
}

/** Column settings for exactly these table columns: unknown columns are dropped, new ones get defaults. */
export function configForColumns(columns, columnNames) {
    return Object.fromEntries(columnNames.map((name) => [name, { ...columnDefaults(name), ...(columns[name] ?? {}) }]));
}

/** The JSON stored in the module or relationship; `field_groups` only when there are groups. */
export function serializeUiConfig(columns, groups = []) {
    return JSON.stringify(groups.length > 0 ? { ...columns, field_groups: groups } : columns);
}
