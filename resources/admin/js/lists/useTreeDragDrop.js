import { ref } from 'vue';

/**
 * Drag-and-drop state for list rows. `canDrag()` gates the start; `onDrop(dragged, target, targetIndex)` decides
 * what the drop means (see tree.js dropPlacement / moveInList) and sends it.
 */
export function useTreeDragDrop({ canDrag = () => true, onDrop }) {
    const draggedItem = ref(null);
    const draggedOverIndex = ref(null);

    const reset = () => {
        draggedItem.value = null;
        draggedOverIndex.value = null;
    };

    const handleDragStart = (event, item) => {
        if (!canDrag()) {
            event.preventDefault();
            return;
        }
        draggedItem.value = item;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDragOver = (event, index) => {
        if (!draggedItem.value) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        draggedOverIndex.value = index;
    };

    const handleDrop = async (event, target, index) => {
        if (!draggedItem.value) {
            return;
        }
        event.preventDefault();
        const dragged = draggedItem.value;
        reset();
        await onDrop(dragged, target, index);
    };

    return { draggedItem, draggedOverIndex, handleDragStart, handleDragEnd: reset, handleDragOver, handleDrop };
}
