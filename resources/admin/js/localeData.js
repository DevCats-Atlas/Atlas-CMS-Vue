/**
 * Locale data of a language item (Custom/Interfaces/LanguageLocaleData.vue): key/value rows <-> the stored flat JSON.
 * Pure helpers, covered by `tests/Frontend/localeData.test.mjs`.
 */

/** `{ key: value }` of the rows with a non-empty key; keys are trimmed, values are strings. */
export function localeDataObject(rows) {
    const data = {};
    for (const row of rows) {
        const key = typeof row.key === 'string' ? row.key.trim() : '';
        if (key !== '') {
            data[key] = row.value || '';
        }
    }

    return data;
}

/** The stored field value: JSON of the rows, or '' when there are none. */
export function serializeLocaleData(rows) {
    const data = localeDataObject(rows);

    return Object.keys(data).length > 0 ? JSON.stringify(data) : '';
}

/**
 * Pasted or stored text -> `{ ok: true, entries: [[key, value]] }` (values as strings), or
 * `{ ok: false, error }` with `empty`, `syntax` (not JSON) or `format` (JSON, but not an object).
 */
export function parseLocaleData(text) {
    if (typeof text !== 'string' || text.trim() === '') {
        return { ok: false, error: 'empty' };
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, error: 'syntax' };
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return { ok: false, error: 'format' };
    }

    return { ok: true, entries: Object.entries(parsed).map(([key, value]) => [key, String(value)]) };
}
