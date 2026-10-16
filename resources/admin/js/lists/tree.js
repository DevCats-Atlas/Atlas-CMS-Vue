/**
 * Pure helpers for admin lists shown as trees (items modules, db_table modules with a parent column).
 * Nodes are plain objects with an id and an optional `children` array; nothing here touches Vue or the DOM,
 * so the rules are covered by `tests/Frontend/listTree.test.mjs`.
 */

const defaultId = (node) => node.id;

/**
 * Rows to render: each node followed by its children when expanded, with `_depth`, `_isChild` and `_parentId`.
 *
 * @param {Array<object>} nodes
 * @param {{ idOf?: (node: object) => any, isExpanded?: (id: any) => boolean, tree?: boolean }} options
 */
export function flatten(nodes, { idOf = defaultId, isExpanded = () => true, tree = true } = {}, depth = 0, parentId = null) {
    return nodes.flatMap((node) => {
        const row = { ...node, _depth: depth, _isChild: depth > 0, _parentId: parentId };
        const id = idOf(node);
        const children = tree && node.children?.length && isExpanded(id)
            ? flatten(node.children, { idOf, isExpanded, tree }, depth + 1, id)
            : [];

        return [row, ...children];
    });
}

/** Ids of the nodes that have children, at every depth. */
export function parentIds(nodes, idOf = defaultId) {
    return nodes.flatMap((node) => (node.children?.length ? [idOf(node), ...parentIds(node.children, idOf)] : []));
}

/** The node with this id, or null. */
export function findNode(nodes, id, idOf = defaultId) {
    for (const node of nodes) {
        if (String(idOf(node)) === String(id)) {
            return node;
        }
        const found = node.children ? findNode(node.children, id, idOf) : null;
        if (found) {
            return found;
        }
    }

    return null;
}

/** The siblings array that contains the node with this id (the root array for top-level nodes), or null. */
function siblingsOf(nodes, id, idOf) {
    if (nodes.some((node) => String(idOf(node)) === String(id))) {
        return nodes;
    }
    for (const node of nodes) {
        const found = node.children ? siblingsOf(node.children, id, idOf) : null;
        if (found) {
            return found;
        }
    }

    return null;
}

/** Whether `id` is `ancestorId` itself or one of its descendants. */
export function isWithin(nodes, ancestorId, id, idOf = defaultId) {
    const ancestor = findNode(nodes, ancestorId, idOf);

    return ancestor !== null && findNode([ancestor], id, idOf) !== null;
}

/**
 * Where a dragged node lands when dropped on a target row. Siblings (same parent) reorder: the dragged node is
 * placed before the target. Otherwise the dragged node becomes the target's last child. `index` is 0-based among
 * the new siblings, counted without the dragged node. Null when the drop changes nothing or would put a node
 * inside itself.
 *
 * @returns {{ parentId: any, index: number, asChild: boolean, targetId: any } | null}
 */
export function dropPlacement(nodes, draggedId, targetId, { idOf = defaultId, parentOf = (node) => node.parent_id ?? null } = {}) {
    if (String(draggedId) === String(targetId) || isWithin(nodes, draggedId, targetId, idOf)) {
        return null;
    }
    const dragged = findNode(nodes, draggedId, idOf);
    const target = findNode(nodes, targetId, idOf);
    if (!dragged || !target) {
        return null;
    }

    if (String(parentOf(dragged)) === String(parentOf(target))) {
        const siblings = siblingsOf(nodes, targetId, idOf).filter((node) => String(idOf(node)) !== String(draggedId));
        const index = siblings.findIndex((node) => String(idOf(node)) === String(targetId));

        return { parentId: parentOf(target), index, asChild: false, targetId };
    }

    const children = (target.children ?? []).filter((node) => String(idOf(node)) !== String(draggedId));

    return { parentId: idOf(target), index: children.length, asChild: true, targetId };
}

/**
 * A copy of the tree with the dragged node moved to `placement` (from dropPlacement); `setParent` returns the
 * moved node with its new parent.
 */
export function moveNode(nodes, draggedId, placement, { idOf = defaultId, setParent = (node, parentId) => ({ ...node, parent_id: parentId }) } = {}) {
    const tree = JSON.parse(JSON.stringify(nodes));
    const from = siblingsOf(tree, draggedId, idOf);
    if (!from) {
        return nodes;
    }
    const [dragged] = from.splice(from.findIndex((node) => String(idOf(node)) === String(draggedId)), 1);
    const moved = setParent(dragged, placement.parentId);

    if (placement.asChild) {
        const parent = findNode(tree, placement.parentId, idOf);
        parent.children = parent.children ?? [];
        parent.children.splice(placement.index, 0, moved);
    } else {
        siblingsOf(tree, placement.targetId, idOf).splice(placement.index, 0, moved);
    }

    return tree;
}

/** `{ id, order_index, parent_id }` for every node, 1-based per sibling group (the items `reorder` payload). */
export function orderEntries(nodes, parentId = null, idOf = defaultId) {
    return nodes.flatMap((node, index) => {
        const ownParent = node.parent_id ?? parentId;
        const entry = { id: idOf(node), order_index: index + 1, parent_id: ownParent };

        return [entry, ...(node.children?.length ? orderEntries(node.children, idOf(node), idOf) : [])];
    });
}

/** A copy of a flat list with the element at `from` moved to `to`. */
export function moveInList(list, from, to) {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
        return list;
    }
    const copy = [...list];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);

    return copy;
}
