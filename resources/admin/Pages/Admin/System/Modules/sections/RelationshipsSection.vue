<script setup>
import { ref } from 'vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';
import { moveInList } from '@/lists/tree.js';
import { useTreeDragDrop } from '@/lists/useTreeDragDrop.js';
import RelationshipModal from '../components/RelationshipModal.vue';

/** Relationships of a db_table module: ordered list (drag to reorder) edited in RelationshipModal. */
const props = defineProps({
    // `{ relationships: [...] }` from the module form; changed in place
    config: { type: Object, required: true },
    moduleId: { type: [Number, String], required: true },
    connection: { type: String, default: '' },
});

const { t } = useTranslation();
const modalOpen = ref(false);
const editingIndex = ref(null);

const openModal = (index = null) => {
    editingIndex.value = index;
    modalOpen.value = true;
};
const closeModal = () => {
    modalOpen.value = false;
    editingIndex.value = null;
};
const save = (relationship) => {
    if (editingIndex.value !== null) {
        props.config.relationships[editingIndex.value] = relationship;
    } else {
        props.config.relationships.push(relationship);
    }
    closeModal();
};

const remove = async (index) => {
    const confirmed = await confirmDialog({
        title: t('admin.modules.remove_relationship'),
        message: t('admin.modules.remove_relationship_confirm'),
        confirmLabel: t('admin.relationships.remove'),
        intent: 'danger',
    });
    if (confirmed) {
        props.config.relationships.splice(index, 1);
    }
};

// Rows carry their index, so the dragged row of index 0 still counts as dragged
const { draggedItem, draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useTreeDragDrop({
    onDrop: (dragged, target, index) => {
        props.config.relationships = moveInList(props.config.relationships, dragged.index, index);
    },
});

const typeLabel = (type) => {
    const label = t(`admin.relationships.type.${type}`);
    return label.startsWith('admin.') ? type : label;
};
</script>

<template>
    <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h4 class="heading-4">{{ t('admin.relationships.title') }}</h4>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('admin.module_settings.relationships_hint') }}</p>
            </div>
            <button type="button" class="btn btn-sm btn-primary" @click="openModal()">{{ t('admin.relationships.add_relationship') }}</button>
        </div>

        <div
            v-if="config.relationships.length === 0"
            class="text-sm text-gray-500 dark:text-gray-400 py-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
        >
            {{ t('admin.module_settings.no_relationships') }}
        </div>

        <div v-else class="space-y-2">
            <div
                v-for="(relationship, index) in config.relationships"
                :key="index"
                draggable="true"
                class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-move transition-colors"
                :class="{
                    'opacity-50': draggedItem?.index === index,
                    'border-blue-500 bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem?.index !== index,
                }"
                @dragstart="handleDragStart($event, { index })"
                @dragend="handleDragEnd"
                @dragover="handleDragOver($event, index)"
                @drop="handleDrop($event, relationship, index)"
            >
                <div class="flex-shrink-0 text-gray-400 dark:text-gray-500" :title="t('admin.lists.reorder')">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ relationship.name || relationship.related_table || t('admin.module_settings.unnamed_relationship') }}
                        </span>
                        <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {{ typeLabel(relationship.type) }}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {{ relationship.related_table || t('admin.module_settings.no_table') }}
                    </p>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <button type="button" class="btn btn-sm btn-outline" :title="t('admin.relationships.edit_relationship')" @click="openModal(index)">
                        {{ t('admin.common.edit') }}
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" :title="t('admin.relationships.remove_relationship')" @click="remove(index)">
                        {{ t('admin.relationships.remove') }}
                    </button>
                </div>
            </div>
        </div>

        <!-- Outside the module <form>: the modal has a form of its own -->
        <Teleport to="body">
            <RelationshipModal
                :open="modalOpen"
                :relationship="editingIndex !== null ? config.relationships[editingIndex] : null"
                :module-id="moduleId"
                :connection="connection"
                @close="closeModal"
                @save="save"
            />
        </Teleport>
    </div>
</template>
