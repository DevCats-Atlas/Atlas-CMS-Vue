// Pure helpers shared by DbTable record forms: module create/edit pages and related-record forms.
// Field objects come from DbTableFormBuilder::fields() and always carry `options` as an array.

const DATETIME_INTERFACES = ['datetime', 'datetime-local'];

const isEmpty = (value) => value === null || value === undefined;

// Database booleans arrive as 1/0, '1'/'0' or true/false.
export const isChecked = (value) => value === true || value === 1 || value === '1' || value === 'true';

// Normalizes datetime values for <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
export function formatDateTimeForInput(value) {
    if (!value) {
        return value;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value)) {
        return value.substring(0, 16).replace(' ', 'T');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const pad = (number) => String(number).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Initial input value. New records start from the column default; existing records show their own value,
// so saving an untouched NULL column does not write the default into it.
export function initialValue(field, { useDefault = true } = {}) {
    const value = isEmpty(field.value) && useDefault ? field.default : field.value;

    if (field.interface === 'checkbox') {
        return isChecked(value);
    }

    if (isEmpty(value)) {
        return '';
    }

    return DATETIME_INTERFACES.includes(field.interface) ? formatDateTimeForInput(value) : value;
}

// Models consumed by the interface components (`model.default`, file `delete_default`).
export function createModels(fields, options = {}) {
    return Object.fromEntries(fields.map((field) => [field.name, { default: initialValue(field, options), translations: {} }]));
}

// Field config for resolveInterfaceComponent()/interface components.
export function fieldConfig(field) {
    const type = field.interface === 'datetime-local' ? 'datetime' : (field.interface || 'text');

    return {
        ...field,
        type,
        title: field.title || field.name,
        required: Boolean(field.required),
        options: Array.isArray(field.options) ? field.options : [],
        config: {
            type,
            inputType: DATETIME_INTERFACES.includes(field.interface) ? 'datetime-local' : undefined,
            options: Array.isArray(field.options) ? field.options : [],
        },
        values: field.interface === 'file'
            ? { default: field.value || null, default_url: field.value_url || null }
            : undefined,
    };
}

// Values to submit for editable fields; a cleared stored file becomes `{column}_delete = 1`.
export function submitValues(fields, models) {
    const payload = {};

    fields.forEach((field) => {
        const model = models[field.name];
        if (field.editable === false || !model) {
            return;
        }

        payload[field.name] = model.default;
        if (field.interface === 'file' && model.delete_default) {
            payload[`${field.name}_delete`] = 1;
        }
    });

    return payload;
}

export const normalizeParent = (value) => (value === '' || value === undefined ? null : value);

// Indented label for a parent option of a tree-structured table.
export function parentLabel(parent) {
    if (!parent.depth) {
        return parent.title;
    }

    return `${'  '.repeat(parent.depth)}└─ ${parent.title}`;
}

// Display text for read-only fields.
export function formatReadOnlyValue(field) {
    const value = field.value;

    if (isEmpty(value) || value === '') {
        return '—';
    }

    if (field.interface === 'checkbox') {
        return isChecked(value) ? 'Yes' : 'No';
    }

    if (field.interface === 'select' && Array.isArray(field.options)) {
        const option = field.options.find((item) => String(item.key) === String(value));
        if (option) {
            return option.label;
        }
    }

    if (field.interface === 'date' || DATETIME_INTERFACES.includes(field.interface)) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return field.interface === 'date' ? date.toLocaleDateString() : date.toLocaleString();
        }
    }

    return String(value);
}

// Splits fields into configured groups (uiConfig.field_groups) and the rest, skipping hidden read-only fields.
export function groupFields(fields, uiConfig = {}) {
    const isHidden = (name) => uiConfig[name]?.editable === false && uiConfig[name]?.hide_in_form === true;
    const groups = Array.isArray(uiConfig.field_groups) ? uiConfig.field_groups : [];
    const grouped = new Set(groups.flatMap((group) => group.fields || []));

    return {
        groups: groups
            .map((group) => ({
                ...group,
                fieldObjects: (group.fields || [])
                    .map((name) => fields.find((field) => field.name === name))
                    .filter((field) => field && !isHidden(field.name)),
            }))
            .filter((group) => group.fieldObjects.length > 0),
        ungrouped: fields.filter((field) => !grouped.has(field.name) && !isHidden(field.name)),
    };
}

// First validation message for a field (Inertia errors are strings, JSON errors are arrays).
export const firstError = (errors, name) => (Array.isArray(errors?.[name]) ? errors[name][0] : errors?.[name]);
