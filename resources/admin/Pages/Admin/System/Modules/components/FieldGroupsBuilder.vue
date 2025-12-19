<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
    columns: {
        type: Array,
        required: true,
    },
    initialGroups: {
        type: Array,
        default: () => [],
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
});

const emit = defineEmits(['update:groups']);

// Groups state
const groups = ref([]);
const draggedField = ref(null);
const dragSourceGroup = ref(null);
const dropTargetGroup = ref(null);
const editingGroupId = ref(null);
const editingTitle = ref('');
const draggedGroup = ref(null);
const dropTargetGroupIndex = ref(null);

// Initialize groups from props
const initializeGroups = () => {
    if (props.initialGroups && props.initialGroups.length > 0) {
        groups.value = JSON.parse(JSON.stringify(props.initialGroups));
    } else {
        groups.value = [];
    }
};

// Get all field names that are assigned to any group
const assignedFields = computed(() => {
    const assigned = new Set();
    groups.value.forEach(group => {
        group.fields.forEach(field => assigned.add(field));
    });
    return assigned;
});

// Get ungrouped fields (fields not in any group)
const ungroupedFields = computed(() => {
    return props.columns.filter(col => !assignedFields.value.has(col.name));
});

// Get column display info
const getColumnDisplay = (columnName) => {
    const column = props.columns.find(c => c.name === columnName);
    const config = props.uiConfig[columnName];
    return {
        name: columnName,
        title: config?.title || columnName,
        type: column?.type || 'unknown',
    };
};

// Add new group
const addGroup = () => {
    const newGroup = {
        id: `group_${Date.now()}`,
        title: `Group ${groups.value.length + 1}`,
        fields: [],
    };
    groups.value.push(newGroup);
    emitGroups();
};

// Remove group (fields go back to ungrouped)
const removeGroup = (groupId) => {
    const index = groups.value.findIndex(g => g.id === groupId);
    if (index !== -1) {
        groups.value.splice(index, 1);
        emitGroups();
    }
};

// Move group up
const moveGroupUp = (index) => {
    if (index > 0) {
        const temp = groups.value[index];
        groups.value[index] = groups.value[index - 1];
        groups.value[index - 1] = temp;
        emitGroups();
    }
};

// Move group down
const moveGroupDown = (index) => {
    if (index < groups.value.length - 1) {
        const temp = groups.value[index];
        groups.value[index] = groups.value[index + 1];
        groups.value[index + 1] = temp;
        emitGroups();
    }
};

// Start editing group title
const startEditingTitle = (group) => {
    editingGroupId.value = group.id;
    editingTitle.value = group.title;
};

// Save group title
const saveGroupTitle = (group) => {
    group.title = editingTitle.value || `Group`;
    editingGroupId.value = null;
    editingTitle.value = '';
    emitGroups();
};

// Cancel editing
const cancelEditingTitle = () => {
    editingGroupId.value = null;
    editingTitle.value = '';
};

// Drag and drop handlers
const onDragStart = (event, fieldName, sourceGroupId = null) => {
    draggedField.value = fieldName;
    dragSourceGroup.value = sourceGroupId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', fieldName);
};

const onDragEnd = () => {
    draggedField.value = null;
    dragSourceGroup.value = null;
    dropTargetGroup.value = null;
};

const onDragOver = (event, targetGroupId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    dropTargetGroup.value = targetGroupId;
};

const onDragLeave = () => {
    dropTargetGroup.value = null;
};

const onDropToGroup = (event, targetGroupId) => {
    event.preventDefault();
    
    if (!draggedField.value) return;
    
    // Remove from source
    if (dragSourceGroup.value) {
        const sourceGroup = groups.value.find(g => g.id === dragSourceGroup.value);
        if (sourceGroup) {
            const fieldIndex = sourceGroup.fields.indexOf(draggedField.value);
            if (fieldIndex !== -1) {
                sourceGroup.fields.splice(fieldIndex, 1);
            }
        }
    }
    
    // Add to target group
    const targetGroup = groups.value.find(g => g.id === targetGroupId);
    if (targetGroup && !targetGroup.fields.includes(draggedField.value)) {
        targetGroup.fields.push(draggedField.value);
    }
    
    dropTargetGroup.value = null;
    emitGroups();
};

const onDropToUngrouped = (event) => {
    event.preventDefault();
    
    if (!draggedField.value || !dragSourceGroup.value) return;
    
    // Remove from source group
    const sourceGroup = groups.value.find(g => g.id === dragSourceGroup.value);
    if (sourceGroup) {
        const fieldIndex = sourceGroup.fields.indexOf(draggedField.value);
        if (fieldIndex !== -1) {
            sourceGroup.fields.splice(fieldIndex, 1);
        }
    }
    
    dropTargetGroup.value = null;
    emitGroups();
};

// Reorder field within a group
const moveFieldUp = (group, fieldIndex) => {
    if (fieldIndex > 0) {
        const temp = group.fields[fieldIndex];
        group.fields[fieldIndex] = group.fields[fieldIndex - 1];
        group.fields[fieldIndex - 1] = temp;
        emitGroups();
    }
};

const moveFieldDown = (group, fieldIndex) => {
    if (fieldIndex < group.fields.length - 1) {
        const temp = group.fields[fieldIndex];
        group.fields[fieldIndex] = group.fields[fieldIndex + 1];
        group.fields[fieldIndex + 1] = temp;
        emitGroups();
    }
};

// Remove field from group (back to ungrouped)
const removeFieldFromGroup = (group, fieldName) => {
    const fieldIndex = group.fields.indexOf(fieldName);
    if (fieldIndex !== -1) {
        group.fields.splice(fieldIndex, 1);
        emitGroups();
    }
};

// Group drag and drop handlers
const onGroupDragStart = (event, groupIndex) => {
    draggedGroup.value = groupIndex;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `group-${groupIndex}`);
};

const onGroupDragEnd = () => {
    draggedGroup.value = null;
    dropTargetGroupIndex.value = null;
};

const onGroupDragOver = (event, targetIndex) => {
    if (draggedGroup.value === null) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    dropTargetGroupIndex.value = targetIndex;
};

const onGroupDragLeave = (event) => {
    // Only clear if we're actually leaving the group container
    if (!event.currentTarget.contains(event.relatedTarget)) {
        dropTargetGroupIndex.value = null;
    }
};

const onGroupDrop = (event, targetIndex) => {
    if (draggedGroup.value === null) return;
    event.preventDefault();
    event.stopPropagation();
    
    if (draggedGroup.value === targetIndex) {
        dropTargetGroupIndex.value = null;
        return;
    }
    
    // Reorder groups
    const dragged = groups.value[draggedGroup.value];
    groups.value.splice(draggedGroup.value, 1);
    
    // Adjust target index if we removed an item before it
    const adjustedTargetIndex = draggedGroup.value < targetIndex ? targetIndex - 1 : targetIndex;
    groups.value.splice(adjustedTargetIndex, 0, dragged);
    
    dropTargetGroupIndex.value = null;
    draggedGroup.value = null;
    emitGroups();
};

// Emit groups update
const emitGroups = () => {
    emit('update:groups', JSON.parse(JSON.stringify(groups.value)));
};

// Watch for initial groups changes
watch(() => props.initialGroups, () => {
    initializeGroups();
}, { immediate: true, deep: true });
</script>

<template>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Left Column: Ungrouped Fields -->
        <div class="space-y-3">
            <div class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Available Fields
            </div>
            
            <div
                class="min-h-[120px] rounded border-2 border-dashed p-3 transition-colors"
                :class="[
                    dropTargetGroup === 'ungrouped' 
                        ? 'border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20' 
                        : 'border-gray-200 dark:border-gray-700'
                ]"
                @dragover.prevent="onDragOver($event, 'ungrouped')"
                @dragleave="onDragLeave"
                @drop="onDropToUngrouped"
            >
                <div v-if="ungroupedFields.length === 0" class="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                    All fields are assigned to groups
                </div>
                
                <div v-else class="space-y-1.5">
                    <div
                        v-for="column in ungroupedFields"
                        :key="column.name"
                        class="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 cursor-grab hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                        draggable="true"
                        @dragstart="onDragStart($event, column.name, null)"
                        @dragend="onDragEnd"
                    >
                        <svg class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                        </svg>
                        <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ uiConfig[column.name]?.title || column.name }}
                        </span>
                        <span class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                            {{ column.type }}
                        </span>
                    </div>
                </div>
            </div>
            
            <p class="text-xs text-gray-500 dark:text-gray-400">
                Drag fields to groups on the right, or leave them here to display without grouping.
            </p>
        </div>
        
        <!-- Right Column: Groups -->
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <div class="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Field Groups
                </div>
                <button
                    type="button"
                    @click="addGroup"
                    class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Group
                </button>
            </div>
            
            <div v-if="groups.length === 0" class="text-xs text-gray-400 dark:text-gray-500 text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded">
                No groups yet. Click "Add Group" to create one.
            </div>
            
            <div v-else class="space-y-3">
                <template v-for="(group, groupIndex) in groups" :key="group.id">
                    <!-- Drop zone above group (for inserting before this group) -->
                    <div
                        class="h-3 -mb-3 transition-all rounded"
                        :class="[
                            dropTargetGroupIndex === groupIndex && draggedGroup !== null && draggedGroup !== groupIndex
                                ? 'bg-blue-400 dark:bg-blue-500 h-6'
                                : draggedGroup !== null ? 'bg-gray-100 dark:bg-gray-700 h-3 opacity-50' : 'bg-transparent h-0'
                        ]"
                        @dragover.prevent="(e) => { if (draggedGroup !== null) { e.stopPropagation(); onGroupDragOver(e, groupIndex); } }"
                        @drop="(e) => { if (draggedGroup !== null) { e.stopPropagation(); onGroupDrop(e, groupIndex); } }"
                    ></div>
                    
                    <div
                        class="rounded border border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
                        :class="[
                            draggedGroup === groupIndex ? 'opacity-50' : '',
                            dropTargetGroupIndex === groupIndex && draggedGroup !== null && draggedGroup !== groupIndex ? 'border-blue-400 dark:border-blue-500 shadow-lg' : ''
                        ]"
                    >
                        <!-- Group Header -->
                        <div
                            class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing"
                            draggable="true"
                            @dragstart="(e) => { e.stopPropagation(); onGroupDragStart(e, groupIndex); }"
                            @dragend="(e) => { e.stopPropagation(); onGroupDragEnd(); }"
                        >
                            <!-- Drag handle icon -->
                            <div class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                            </div>
                            
                            <!-- Reorder buttons -->
                            <div class="flex flex-col gap-0.5">
                                <button
                                    type="button"
                                    @click.stop="moveGroupUp(groupIndex)"
                                    :disabled="groupIndex === 0"
                                    class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    @click.stop="moveGroupDown(groupIndex)"
                                    :disabled="groupIndex === groups.length - 1"
                                    class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                        
                        <!-- Title (editable) -->
                        <div class="flex-1 min-w-0">
                            <template v-if="editingGroupId === group.id">
                                <input
                                    v-model="editingTitle"
                                    type="text"
                                    class="w-full px-2 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-blue-500"
                                    @keyup.enter="saveGroupTitle(group)"
                                    @keyup.escape="cancelEditingTitle"
                                    @blur="saveGroupTitle(group)"
                                    ref="titleInput"
                                    autofocus
                                />
                            </template>
                            <template v-else>
                                <span
                                    @dblclick="startEditingTitle(group)"
                                    class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                                    title="Double-click to edit"
                                >
                                    {{ group.title }}
                                </span>
                            </template>
                        </div>
                        
                        <!-- Field count -->
                        <span class="text-xs text-gray-400 dark:text-gray-500">
                            {{ group.fields.length }} field{{ group.fields.length !== 1 ? 's' : '' }}
                        </span>
                        
                        <!-- Delete button -->
                        <button
                            type="button"
                            @click="removeGroup(group.id)"
                            class="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            title="Delete group"
                        >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                    
                        <!-- Group Body (Drop Zone) -->
                        <div
                            class="min-h-[60px] p-2 transition-colors"
                            :class="[
                                dropTargetGroup === group.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                                    : 'bg-white dark:bg-gray-900'
                            ]"
                            @dragover.prevent="(e) => { if (draggedField && draggedGroup === null) onDragOver(e, group.id); }"
                            @dragleave="(e) => { if (draggedField && draggedGroup === null) onDragLeave(e); }"
                            @drop="(e) => { if (draggedField && draggedGroup === null) { e.stopPropagation(); onDropToGroup(e, group.id); } }"
                        >
                        <div v-if="group.fields.length === 0" class="text-xs text-gray-400 dark:text-gray-500 text-center py-3">
                            Drop fields here
                        </div>
                        
                        <div v-else class="space-y-1">
                            <div
                                v-for="(fieldName, fieldIndex) in group.fields"
                                :key="fieldName"
                                class="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 cursor-grab"
                                draggable="true"
                                @dragstart="onDragStart($event, fieldName, group.id)"
                                @dragend="onDragEnd"
                            >
                                <svg class="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                                </svg>
                                
                                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1 truncate">
                                    {{ getColumnDisplay(fieldName).title }}
                                </span>
                                
                                <!-- Field reorder buttons -->
                                <div class="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        @click.stop="moveFieldUp(group, fieldIndex)"
                                        :disabled="fieldIndex === 0"
                                        class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        @click.stop="moveFieldDown(group, fieldIndex)"
                                        :disabled="fieldIndex === group.fields.length - 1"
                                        class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <!-- Remove from group -->
                                <button
                                    type="button"
                                    @click.stop="removeFieldFromGroup(group, fieldName)"
                                    class="p-0.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                                    title="Remove from group"
                                >
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        </div>
                    </div>
                    
                    <!-- Drop zone below group (for inserting after this group) -->
                    <div
                        class="h-3 -mt-3 transition-all rounded"
                        :class="[
                            dropTargetGroupIndex === groupIndex + 1 && draggedGroup !== null && draggedGroup !== groupIndex + 1
                                ? 'bg-blue-400 dark:bg-blue-500 h-6'
                                : draggedGroup !== null ? 'bg-gray-100 dark:bg-gray-700 h-3 opacity-50' : 'bg-transparent h-0'
                        ]"
                        @dragover.prevent="(e) => { if (draggedGroup !== null) { e.stopPropagation(); onGroupDragOver(e, groupIndex + 1); } }"
                        @drop="(e) => { if (draggedGroup !== null) { e.stopPropagation(); onGroupDrop(e, groupIndex + 1); } }"
                    ></div>
                </template>
            </div>
            
            <p class="text-xs text-gray-500 dark:text-gray-400">
                Groups will be displayed as collapsible sections on the edit form. Double-click group title to rename.
            </p>
        </div>
    </div>
</template>

