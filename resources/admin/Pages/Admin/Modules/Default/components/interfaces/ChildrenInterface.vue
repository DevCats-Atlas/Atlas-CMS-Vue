<script setup>
import { adminUrl, adminModuleHandle } from '@/utils/adminUrl';
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { usePage, useForm, router } from '@inertiajs/vue3';
import ModalDialog from '@/components/ModalDialog.vue';
import EditForm from '../EditForm.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { moveInList } from '@admin/js/lists/tree.js';
import { useTreeDragDrop } from '@admin/js/lists/useTreeDragDrop.js';
import { useTranslation } from '@/utils/useTranslation.js';

const props = defineProps({
    field: {
        type: Object,
        required: true,
    },
    model: {
        type: Object,
        default: () => ({}),
    },
    parentItemId: {
        type: Number,
        default: null,
    },
});

const { t } = useTranslation();

const page = usePage();
const childrenItems = ref([]);
const loading = ref(false);
const isMounted = ref(false);
const showCreateForm = ref(false);
const editModalOpen = ref(false);
const editModalData = ref(null);
const loadingEditData = ref(false);

// Gallery upload form
const uploadForm = useForm({
    files: [],
    parent_id: null,
    field_id: null,
});
const selectedFiles = ref([]);
const uploading = ref(false);


const relatedItemTypeId = computed(() => props.field.config?.related_item_type_id);
const viewType = computed(() => props.field.config?.view_type || 'list');

// Get current item ID - prefer parentItemId prop (for nested modals), fallback to URL query parameter
const currentItemId = computed(() => {
    // If parentItemId is provided, use it (for nested modals/contexts)
    if (props.parentItemId !== null && props.parentItemId !== undefined) {
        return props.parentItemId;
    }
    
    // Otherwise, use URL query parameter (for regular page context)
    const url = new URL(window.location.href);
    const itemParam = url.searchParams.get('item');
    return itemParam ? parseInt(itemParam, 10) : null;
});

// Get module handle - prefer from parentItemId context, fallback to URL path
const moduleHandle = computed(() => {
    // If we have a parentItemId prop and are in a modal, we might need to use a different module handle
    // For now, still use URL-based module handle, but this could be enhanced if needed
    return adminModuleHandle();
});

// Get module handle for children requests - use parent module or child module based on context
const childrenModuleHandle = computed(() => {
    // For nested children, we might need to use a different module handle
    // For now, use the current module handle, but the backend should handle field resolution
    return moduleHandle.value;
});

const baseUrl = computed(() => {
    if (!childrenModuleHandle.value) {
        return '';
    }
    return adminUrl(`${childrenModuleHandle.value}`);
});

const fetchChildren = async () => {
    if (!isMounted.value || !currentItemId.value || !props.field.id) {
        return;
    }

    loading.value = true;
    try {
        const response = await fetch(
            `${baseUrl.value}/children?parent_id=${currentItemId.value}&field_id=${props.field.id}`,
            {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            }
        );

        if (!response.ok || !isMounted.value) {
            throw new Error('Failed to fetch children');
        }

        const data = await response.json();
        if (isMounted.value) {
            childrenItems.value = data.items || [];
        }
    } catch (error) {
        if (isMounted.value) {
            console.error('Error fetching children:', error);
            childrenItems.value = [];
        }
    } finally {
        if (isMounted.value) {
            loading.value = false;
        }
    }
};

onMounted(() => {
    isMounted.value = true;
    fetchChildren();
});

onBeforeUnmount(() => {
    isMounted.value = false;
});

// Watch for changes in item ID or field ID to refetch
watch(
    () => [currentItemId.value, props.field.id],
    () => {
        if (isMounted.value) {
            fetchChildren();
        }
    },
    { immediate: false }
);

// Create child form
const createChildForm = useForm({
    title: '',
    parent_id: null,
    field_id: null,
});

const openCreateForm = () => {
    if (!currentItemId.value || !props.field.id) {
        return;
    }
    createChildForm.parent_id = currentItemId.value;
    createChildForm.field_id = props.field.id;
    createChildForm.title = '';
    showCreateForm.value = true;
};

const closeCreateForm = () => {
    showCreateForm.value = false;
    createChildForm.reset();
};

const submitCreateChild = () => {
    if (!createChildForm.title.trim()) {
        return;
    }

    createChildForm.post(`${baseUrl.value}/children/create`, {
        preserveScroll: true,
        onSuccess: (responsePage) => {
            closeCreateForm();
            // Refresh children list
            fetchChildren();
            
            // Check if we have a created item ID to open in modal
            const createdItemId = responsePage.props?.flash?.created_item_id;
            
            if (createdItemId) {
                // Fetch edit data and open modal, passing field_id for validation
                openEditModal(moduleHandle.value, createdItemId, props.field.id);
            } else if (responsePage.props?.redirect) {
                // Fallback to redirect if no module handle
                window.location.href = responsePage.props.redirect;
            }
        },
        onError: () => {
            // Form errors will be displayed
        },
    });
};

const openEditModal = async (itemModuleHandle, itemId, fieldId = null) => {
    if (!itemModuleHandle || !itemId) {
        return;
    }

    editModalOpen.value = true;
    loadingEditData.value = true;
    editModalData.value = null;

    try {
        // Build URL with field_id if provided
        const url = new URL(adminUrl(`${moduleHandle.value}/item-edit-data`), window.location.origin);
        url.searchParams.set('item', itemId.toString());
        if (fieldId) {
            url.searchParams.set('field_id', fieldId.toString());
            url.searchParams.set('parent_id', currentItemId.value.toString());
        }

        const response = await fetch(url.toString(), {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        editModalData.value = data;
    } catch (error) {
        console.error('Error fetching item edit data:', error);
        editModalOpen.value = false;
    } finally {
        loadingEditData.value = false;
    }
};

const closeEditModal = () => {
    editModalOpen.value = false;
    editModalData.value = null;
};

const handleEditFormSaved = () => {
    // Refresh children list after save
    fetchChildren();
    // Keep modal open so user can continue editing
};

const editChild = async (child) => {
    // Open edit modal with field_id so backend can determine correct module from interface config
    openEditModal(moduleHandle.value, child.id, props.field.id);
};

const deleteChild = async (child) => {
    const confirmed = await confirmDialog({
        title: t('admin.interfaces.delete_child'),
        message: t('admin.items.delete_item_confirm', { title: child.title || t('admin.items.untitled') }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    // Delete child item using the children delete endpoint with field_id validation
    router.delete(`${baseUrl.value}/children/delete`, {
        data: {
            item_id: child.id,
            field_id: props.field.id,
            parent_id: currentItemId.value,
        },
        preserveScroll: true,
        onSuccess: () => {
            fetchChildren();
        },
    });
};

// Gallery upload handlers
const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    selectedFiles.value = files;
    uploadForm.files = files;
};

const openFileDialog = () => {
    if (!currentItemId.value || !props.field.id) {
        return;
    }
    uploadForm.parent_id = currentItemId.value;
    uploadForm.field_id = props.field.id;
    document.getElementById(`gallery-upload-${props.field.id}`)?.click();
};

const cancelUpload = () => {
    selectedFiles.value = [];
    uploadForm.reset();
    const fileInput = document.getElementById(`gallery-upload-${props.field.id}`);
    if (fileInput) {
        fileInput.value = '';
    }
};

const submitUpload = () => {
    if (selectedFiles.value.length === 0) {
        return;
    }

    uploading.value = true;
    uploadForm.post(`${baseUrl.value}/children/upload`, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
            cancelUpload();
            fetchChildren();
            uploading.value = false;
        },
        onError: () => {
            uploading.value = false;
        },
    });
};

// Drag and drop: reorder the children list, then save the new order
const { draggedItem, draggedOverIndex, handleDragStart, handleDragEnd, handleDragOver, handleDrop } = useTreeDragDrop({
    onDrop: (dragged, target, dropIndex) => {
        const dragIndex = childrenItems.value.findIndex((item) => item.id === dragged.id);
        if (dragIndex === -1 || dragged.id === target.id) {
            return;
        }
        childrenItems.value = moveInList(childrenItems.value, dragIndex, dropIndex);

        router.post(
            `${baseUrl.value}/children/reorder`,
            {
                field_id: props.field.id,
                parent_id: currentItemId.value,
                order: childrenItems.value.map((item, index) => ({ id: item.id, order_index: index + 1 })),
            },
            {
                preserveScroll: true,
                onFinish: () => fetchChildren(), // the saved order, or the previous one after an error
            },
        );
    },
});
</script>

<template>
    <div class="space-y-4">
        <div>
            <label v-if="!(field.config?.hide_title === true)" class="form-label block mb-1">
                {{ field.title }}
            </label>
            <p v-if="relatedItemTypeId" class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.interfaces.related_type_id') }} <span class="font-mono">{{ relatedItemTypeId }}</span>
            </p>
            <p v-else class="text-xs text-red-500 dark:text-red-400">
                {{ t('admin.interfaces.no_related_type') }}
            </p>
        </div>

        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            {{ t('admin.common.loading') }}
        </div>

        <div v-else-if="!relatedItemTypeId" class="text-sm text-red-500 dark:text-red-400 py-4">
            {{ t('admin.interfaces.configure_related_type') }}
        </div>

        <div v-else-if="!currentItemId" class="text-sm text-gray-500 dark:text-gray-400 py-4">
            {{ t('admin.interfaces.save_before_children') }}
        </div>

        <div v-else-if="viewType === 'list'" class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('admin.interfaces.children') }}</h3>
                <button
                    v-if="currentItemId && relatedItemTypeId"
                    type="button"
                    class="btn btn-sm btn-primary"
                    @click="openCreateForm"
                >
                    {{ t('admin.interfaces.create_child') }}
                </button>
            </div>

            <!-- Create form -->
            <div v-if="showCreateForm" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
                <div>
                    <label class="form-label block mb-1">{{ t('admin.common.title_label') }}</label>
                    <input
                        v-model="createChildForm.title"
                        type="text"
                        class="form-input"
                        :placeholder="t('admin.interfaces.child_title_placeholder')"
                        @keyup.enter="submitCreateChild"
                    />
                    <p v-if="createChildForm.errors.title" class="mt-1 text-xs text-red-500 dark:text-red-400">
                        {{ createChildForm.errors.title }}
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        :disabled="createChildForm.processing || !createChildForm.title.trim()"
                        @click="submitCreateChild"
                    >
                        {{ createChildForm.processing ? t('admin.items.creating') : t('admin.common.create') }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-sm btn-outline"
                        :disabled="createChildForm.processing"
                        @click="closeCreateForm"
                    >
                        {{ t('admin.common.cancel') }}
                    </button>
                </div>
            </div>

            <!-- Children table -->
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead class="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                            <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-0">ID</th>
                            <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-0">{{ t('admin.items.visible') }}</th>
                            <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">{{ t('admin.common.title_label') }}</th>
                            <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-32">{{ t('admin.common.actions') }}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr
                            v-for="(child, index) in childrenItems"
                            :key="child.id"
                            draggable="true"
                            class="cursor-move transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/40"
                            :class="{
                                'opacity-50': draggedItem?.id === child.id,
                                'bg-blue-50 dark:bg-blue-900/20': draggedOverIndex === index && draggedItem?.id !== child.id,
                            }"
                            @dragstart="handleDragStart($event, child)"
                            @dragend="handleDragEnd"
                            @dragover.prevent="handleDragOver($event, index)"
                            @drop="handleDrop($event, child, index)"
                        >
                            <td class="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">#{{ child.id }}</td>
                            <td class="px-4 py-2 whitespace-nowrap">
                                <span
                                    class="px-2 py-0.5 rounded-full text-xs font-semibold"
                                    :class="child.visible
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                >
                                    {{ child.visible ? t('admin.items.visible') : t('admin.items.hidden') }}
                                </span>
                            </td>
                            <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {{ child.title || 'Untitled' }}
                            </td>
                            <td class="px-4 py-2" @mousedown.stop @click.stop>
                                <div class="btn-group" role="group">
                                    <button
                                        type="button"
                                        class="btn-group-item-edit"
                                        @click.stop="editChild(child)"
                                        :title="t('admin.common.edit')"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        class="btn-group-item-delete"
                                        @click.stop="deleteChild(child)"
                                        :title="t('admin.common.delete')"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="childrenItems.length === 0 && !showCreateForm">
                            <td colspan="4" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                {{ t('admin.interfaces.no_children') }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-else-if="viewType === 'gallery'" class="space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('admin.interfaces.gallery') }}</h3>
                <div class="flex items-center gap-2">
                    <input
                        :id="`gallery-upload-${field.id}`"
                        type="file"
                        multiple
                        accept="image/*"
                        class="hidden"
                        @change="handleFileSelect"
                    />
                    <button
                        v-if="currentItemId && relatedItemTypeId"
                        type="button"
                        class="btn btn-sm btn-primary"
                        :disabled="uploading"
                        @click="openFileDialog"
                    >
                        {{ uploading ? t('admin.interfaces.uploading') : t('admin.interfaces.choose_images') }}
                    </button>
                </div>
            </div>

            <!-- Selected files preview -->
            <div v-if="selectedFiles.length > 0" class="bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
                <div>
                    <p class="heading-label mb-2">
                        {{ t('admin.interfaces.selected_files', { count: selectedFiles.length }) }}
                    </p>
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span
                            v-for="(file, index) in selectedFiles"
                            :key="index"
                            class="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                        >
                            {{ file.name }}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        :disabled="uploading || selectedFiles.length === 0"
                        @click="submitUpload"
                    >
                        {{ uploading ? t('admin.interfaces.uploading') : t('admin.interfaces.upload_images', { count: selectedFiles.length }) }}
                    </button>
                    <button
                        type="button"
                        class="btn btn-sm btn-outline"
                        :disabled="uploading"
                        @click="cancelUpload"
                    >
                        {{ t('admin.common.cancel') }}
                    </button>
                </div>
                <p v-if="uploadForm.errors.files" class="text-xs text-red-500 dark:text-red-400">
                    {{ uploadForm.errors.files }}
                </p>
            </div>

            <!-- Gallery grid -->
            <div v-if="childrenItems.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <div
                    v-for="(child, index) in childrenItems"
                    :key="child.id"
                    draggable="true"
                    class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow flex flex-col cursor-move"
                    :class="{
                        'opacity-50': draggedItem?.id === child.id,
                        'ring-2 ring-blue-500': draggedOverIndex === index && draggedItem?.id !== child.id,
                    }"
                    @dragstart="handleDragStart($event, child)"
                    @dragend="handleDragEnd"
                    @dragover.prevent="handleDragOver($event, index)"
                    @drop="handleDrop($event, child, index)"
                >
                    <!-- Image -->
                    <div class="aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden flex-shrink-0">
                        <img
                            v-if="child.thumbnail_url || child.item_file_url"
                            :src="child.thumbnail_url || child.item_file_url"
                            :alt="child.title || 'Untitled'"
                            class="w-full h-full object-cover"
                        />
                        <div
                            v-else
                            class="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600"
                        >
                            <svg
                                class="w-12 h-12"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="p-2 flex flex-col flex-1">
                        <p class="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {{ child.title || 'Untitled' }}
                        </p>
                        <div class="flex items-center justify-between mt-1 mb-2">
                            <span
                                class="text-xs px-1.5 py-0.5 rounded"
                                :class="child.visible
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                            >
                                {{ child.visible ? t('admin.items.visible') : t('admin.items.hidden') }}
                            </span>
                            <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                #{{ child.id }}
                            </span>
                        </div>
                        <!-- Actions -->
                        <div class="flex items-center gap-1 mt-auto" @mousedown.stop @click.stop>
                            <div class="btn-group w-full" role="group">
                                <button
                                    type="button"
                                    class="btn-group-item-edit btn-group-item-xs flex-1"
                                    @click.stop="editChild(child)"
                                    :title="t('admin.common.edit')"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                        />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    class="btn-group-item-delete btn-group-item-xs flex-1"
                                    @click.stop="deleteChild(child)"
                                    :title="t('admin.common.delete')"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty state -->
            <div
                v-else-if="!selectedFiles.length"
                class="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
            >
                <svg
                    class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ t('admin.interfaces.no_images') }}</p>
                <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">{{ t('admin.interfaces.no_images_hint') }}</p>
            </div>
        </div>

        <!-- Edit Modal -->
        <Teleport to="body">
            <ModalDialog
                :open="editModalOpen"
                :title="t('admin.interfaces.edit_item', { type: editModalData?.itemType?.label || t('admin.interfaces.item') })"
                size="xl"
                @close="closeEditModal"
            >
                <div v-if="loadingEditData" class="py-8 text-center text-gray-500 dark:text-gray-400">
                    {{ t('admin.common.loading') }}
                </div>
                <EditForm
                    v-else-if="editModalData"
                    :title="editModalData.title"
                    :module-handle="editModalData.moduleHandle"
                    :module="editModalData.module"
                    :item-type="editModalData.itemType"
                    :fields="editModalData.fields"
                    :custom-field-tabs="editModalData.customFieldTabs"
                    :item="editModalData.item"
                    :update-url="editModalData.updateUrl"
                    :index-url="editModalData.indexUrl"
                    :inline="true"
                    :field-id="editModalData.fieldId"
                    :parent-id="editModalData.parentId"
                    :parent-item-id="editModalData.item.id"
                    @saved="handleEditFormSaved"
                    @cancel="closeEditModal"
                />
            </ModalDialog>
        </Teleport>
    </div>
</template>
