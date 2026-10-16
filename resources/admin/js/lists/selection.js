/**
 * Pure selection rules for admin lists (covered by `tests/Frontend/listSelection.test.mjs`). Ids are compared as
 * strings; `rows` are the rows on screen, including expanded tree children.
 */

const key = (id) => String(id);

/** Ids of the rows that can be selected. */
export function selectableIds(rows, { idOf = (row) => row.id, deletable = () => true } = {}) {
    return rows.filter(deletable).map((row) => key(idOf(row)));
}

/**
 * Header checkbox state: `all` when every selectable row on screen is selected, `some` when something is selected
 * but not all of them (for example only rows inside a collapsed branch).
 */
export function selectionState(selected, ids) {
    const shown = ids.filter((id) => selected.has(id)).length;
    const all = ids.length > 0 && shown === ids.length;

    return { all, some: selected.size > 0 && !all };
}

/** The selection without ids that are no longer listed. */
export function pruneSelection(selected, ids) {
    const listed = new Set(ids.map(key));

    return new Set([...selected].filter((id) => listed.has(id)));
}
