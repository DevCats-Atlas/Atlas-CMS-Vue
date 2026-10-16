/**
 * Filters of a db_table list (DbTable/Index.vue): URL query <-> filter values, select options from the column
 * settings and the text of the "Active Filters" chips. Pure helpers, covered by `tests/Frontend/dbTableListFilters.test.mjs`.
 *
 * Values: a string for single filters, an array for multiple selects, `{ from, to }` for ranges.
 */

const trimmed = (value) => (value === null || value === undefined ? '' : String(value).trim());

export function isEmptyFilterValue(value) {
    if (Array.isArray(value)) {
        return value.every((item) => trimmed(item) === '');
    }
    if (value && typeof value === 'object') {
        return trimmed(value.from) === '' && trimmed(value.to) === '';
    }

    return trimmed(value) === '';
}

/**
 * Filter values from a URL query (links, reloads): `filter[id]`, `filter[id][]` / `filter[id][0]` lists and
 * `filter[id][from|to]` ranges. Enabled range filters without a value get an empty range for their inputs.
 */
export function filterValuesFromQuery(query, filters = []) {
    const params = new URLSearchParams(query);
    const values = {};

    for (const filter of filters) {
        if (!filter.enabled) {
            continue;
        }
        const key = `filter[${filter.id}]`;
        const list = [...params.entries()]
            .filter(([name]) => name.startsWith(key) && /^\[\d*\]$/.test(name.slice(key.length)))
            .map(([, value]) => value);
        const from = params.get(`${key}[from]`);
        const to = params.get(`${key}[to]`);
        const single = params.get(key);

        if (list.length > 0) {
            values[filter.id] = filter.multiple ? list : list[0];
        } else if (from !== null || to !== null) {
            values[filter.id] = { from: from ?? '', to: to ?? '' };
        } else if (single !== null) {
            values[filter.id] = filter.multiple ? [single] : single;
        } else if (filter.operator === 'range') {
            values[filter.id] = { from: '', to: '' };
        }
    }

    return values;
}

/** Query parameters for the list request; lists use indexed keys (`filter[id][0]`) as Laravel expects. */
export function filterQuery(values, search = '') {
    const params = {};
    if (trimmed(search) !== '') {
        params.search = trimmed(search);
    }

    for (const [id, value] of Object.entries(values)) {
        if (isEmptyFilterValue(value)) {
            continue;
        }
        if (Array.isArray(value)) {
            value.filter((item) => trimmed(item) !== '').forEach((item, index) => {
                params[`filter[${id}][${index}]`] = String(item);
            });
        } else if (typeof value === 'object') {
            for (const bound of ['from', 'to']) {
                if (trimmed(value[bound]) !== '') {
                    params[`filter[${id}][${bound}]`] = trimmed(value[bound]);
                }
            }
        } else {
            params[`filter[${id}]`] = trimmed(value);
        }
    }

    return params;
}

const splitPair = (line) => {
    const separator = line.includes('=') ? '=' : (line.includes(':') ? ':' : null);
    if (!separator) {
        return { key: line, label: line };
    }
    const [key, ...rest] = line.split(separator);
    const label = rest.join(separator).trim();

    return { key: key.trim(), label: label || key.trim() };
};

/**
 * `{ key, label }` options of a static select column. Arrays (already resolved by the backend) are normalized;
 * strings follow `select_input_type`, and a comma list that contains `=` and line breaks is read as value=label.
 */
export function selectOptions(columnConfig) {
    if (!columnConfig) {
        return [];
    }
    const data = columnConfig.options || columnConfig.config?.options;
    if (Array.isArray(data)) {
        return data.map((option) => (typeof option === 'string'
            ? { key: option, label: option }
            : {
                key: option.key || option.value || String(option),
                label: option.label || option.name || option.key || option.value || String(option),
            }));
    }
    if (typeof data !== 'string' || data === '' || columnConfig.select_type !== 'static') {
        return [];
    }

    let inputType = columnConfig.select_input_type || 'comma';
    if (inputType === 'comma' && data.includes('=') && data.includes('\n')) {
        inputType = 'value_label';
    }
    const lines = data.split(inputType === 'comma' ? ',' : '\n').map((line) => line.trim()).filter(Boolean);

    return inputType === 'value_label' ? lines.map(splitPair) : lines.map((line) => ({ key: line, label: line }));
}

/**
 * Chip text of an active filter, '' when it has no value. `labels` gives the translated words:
 * `{ yes, no, from: (value) => string, to: (value) => string }`.
 */
export function filterChipText(value, filter, uiConfig, labels) {
    if (isEmptyFilterValue(value)) {
        return '';
    }
    const column = filter?.type === 'field' ? uiConfig[filter.field] : null;
    const options = selectOptions(column);
    if (options.length > 0) {
        const labelOf = (key) => options.find((option) => String(option.key) === String(key))?.label ?? String(key);
        return (Array.isArray(value) ? value : [value]).map(labelOf).join(', ');
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (typeof value === 'object') {
        return [value.from && labels.from(value.from), value.to && labels.to(value.to)].filter(Boolean).join(', ');
    }
    if (column?.interface === 'checkbox') {
        return value === '1' || value === 1 || value === true ? labels.yes : labels.no;
    }

    return String(value);
}

/** Number of active filters, the default search included. */
export function activeFilterCount(values, search = '') {
    return (trimmed(search) !== '' ? 1 : 0) + Object.values(values).filter((value) => !isEmptyFilterValue(value)).length;
}
