<script setup>
import { computed, ref, watch, onMounted, nextTick } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    title: {
        type: String,
        default: 'Users',
    },
    moduleHandle: {
        type: String,
        default: 'users',
    },
    module: {
        type: Object,
        required: true,
    },
    action: {
        type: Object,
        required: true,
    },
    menuItem: {
        type: Object,
        default: null,
    },
    crud: {
        type: Object,
        required: true,
    },
    availableActions: {
        type: Array,
        default: () => [],
    },
    itemType: {
        type: Object,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    items: {
        type: Array,
        default: () => [],
    },
    hasSortingEnabled: {
        type: Boolean,
        default: false,
    },
    hasDeepStructureEnabled: {
        type: Boolean,
        default: false,
    },
    search: {
        type: String,
        default: '',
    },
    pagination: {
        type: Object,
        default: null,
    },
});

const baseUrl = computed(() => `/admin/${props.moduleHandle}`);
const createUrl = computed(() => `${baseUrl.value}/create`);
const deleteUrl = computed(() => `${baseUrl.value}/delete`);

const createModalOpen = ref(false);
const selectedItems = ref(new Set());
const isDeleting = ref(false);
const selectAllCheckbox = ref(null);

// Create form
const createForm = useForm({
    title: '', // For users, this will be the name
    email: '',
    password: '',
    password_confirmation: '',
    active: true,
    admin_access: false,
});

const openCreateModal = () => {
    createModalOpen.value = true;
    resetCreateForm();
};

const closeCreateModal = () => {
    createModalOpen.value = false;
};

const resetCreateForm = () => {
    createForm.reset();
    createForm.title = '';
    createForm.email = '';
    createForm.password = '';
    createForm.password_confirmation = '';
    createForm.active = true;
    createForm.admin_access = false;
};

const submitCreate = () => {
    createForm.post(createUrl.value, {
        preserveScroll: true,
        onSuccess: (responsePage) => {
            // The backend redirects to edit page, so we just close the modal
            closeCreateModal();
        },
    });
};

// Search form
const searchForm = useForm({
    search: props.search || '',
});

const performSearch = () => {
    router.get(baseUrl.value, 
        { search: searchForm.search },
        {
            preserveState: true,
            preserveScroll: true,
            only: ['items', 'search'],
        }
    );
};

const clearSearch = () => {
    searchForm.search = '';
    router.get(baseUrl.value, {}, {
        preserveState: true,
        preserveScroll: true,
        only: ['items', 'search'],
    });
};

// Multi-select functionality
const toggleSelectAll = (event) => {
    if (event.target.checked) {
        // Only select items that can be deleted
        const deletableItems = props.items
            .filter(item => item.can_delete !== false)
            .map(item => item.id);
        selectedItems.value = new Set(deletableItems);
    } else {
        selectedItems.value.clear();
    }
};

const toggleSelectItem = (itemId) => {
    if (selectedItems.value.has(itemId)) {
        selectedItems.value.delete(itemId);
    } else {
        selectedItems.value.add(itemId);
    }
};

const deletableItems = computed(() => {
    return props.items.filter(item => item.can_delete !== false);
});

const isAllSelected = computed(() => {
    const deletable = deletableItems.value;
    return deletable.length > 0 && selectedItems.value.size === deletable.length;
});

const isIndeterminate = computed(() => {
    const deletable = deletableItems.value;
    return selectedItems.value.size > 0 && selectedItems.value.size < deletable.length;
});

const deleteItem = async (item) => {
    const confirmed = await confirmDialog({
        title: 'Delete user',
        message: `Delete "${item.title}"?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(deleteUrl.value, {
        data: { item_id: item.id },
        preserveScroll: true,
    });
};

const deleteSelectedItems = async () => {
    if (selectedItems.value.size === 0) {
        return;
    }

    const selectedCount = selectedItems.value.size;
    const confirmed = await confirmDialog({
        title: 'Delete selected users',
        message: `Delete ${selectedCount} user(s)?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    isDeleting.value = true;
    
    // Delete items one by one using fetch API for better control
    // Filter out items that can't be deleted
    const itemIds = Array.from(selectedItems.value).filter(itemId => {
        const item = props.items.find(i => i.id === itemId);
        return item && item.can_delete !== false;
    });
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    
    for (const itemId of itemIds) {
        try {
            const response = await fetch(deleteUrl.value, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ item_id: itemId }),
            });

            if (response.ok) {
                selectedItems.value.delete(itemId);
            }
        } catch (error) {
            console.error(`Failed to delete user ${itemId}:`, error);
        }
    }

    isDeleting.value = false;
    
    // Refresh the page to update the users list
    router.reload({ preserveScroll: true });
};

// Handle indeterminate state for select all checkbox
watch([isIndeterminate, isAllSelected], () => {
    nextTick(() => {
        if (selectAllCheckbox.value) {
            selectAllCheckbox.value.indeterminate = isIndeterminate.value;
        }
    });
});

// Clear selections for items that no longer exist
watch(() => props.items, (newItems) => {
    const itemIds = new Set(newItems.map(item => item.id));
    const toRemove = [];
    selectedItems.value.forEach((id) => {
        if (!itemIds.has(id)) {
            toRemove.push(id);
        }
    });
    toRemove.forEach((id) => selectedItems.value.delete(id));
}, { deep: true });

onMounted(() => {
    nextTick(() => {
        if (selectAllCheckbox.value) {
            selectAllCheckbox.value.indeterminate = isIndeterminate.value;
        }
    });
});
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-6xl sm:px-6 lg:px-8 space-y-6">
                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Module</p>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
                                {{ module.title }}
                                <span class="text-gray-400 text-base font-normal">/ {{ action.title }}</span>
                            </h1>
                        </div>
                        <div class="text-right space-y-1">
                            <p class="text-xs font-semibold text-gray-500 uppercase">Item type</p>
                            <p class="text-sm text-gray-900 dark:text-white">{{ itemType.label }}</p>
                        </div>
                    </div>
                </section>

                <!-- Search Form -->
                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Search Users</h2>
                    <form @submit.prevent="performSearch" class="space-y-4">
                        <div>
                            <label class="form-label">Search</label>
                            <div class="flex items-center gap-2">
                                <div class="flex-1">
                                    <input
                                        v-model="searchForm.search"
                                        type="text"
                                        class="form-input"
                                        placeholder="Search by name, email, or item_id"
                                    />
                                </div>
                                <div class="flex items-center gap-2">
                                    <button type="submit" class="btn btn-primary" :disabled="searchForm.processing">
                                        {{ searchForm.processing ? 'Searching...' : 'Search' }}
                                    </button>
                                    <button
                                        v-if="search"
                                        type="button"
                                        class="btn btn-outline"
                                        @click="clearSearch"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Search across name, email, and item_id fields
                            </p>
                        </div>
                    </form>
                </section>

                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
                        <div class="flex items-center gap-3">
                            <button
                                v-if="selectedItems.size > 0"
                                type="button"
                                class="btn btn-outline-danger"
                                :disabled="isDeleting"
                                @click="deleteSelectedItems"
                            >
                                {{ isDeleting ? 'Deleting...' : `Delete ${selectedItems.size} selected` }}
                            </button>
                            <button type="button" class="btn btn-outline" @click="openCreateModal">
                                New user
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th class="px-4 py-2 text-center w-12">
                                        <input
                                            ref="selectAllCheckbox"
                                            type="checkbox"
                                            class="form-checkbox"
                                            :checked="isAllSelected"
                                            @change="toggleSelectAll"
                                        />
                                    </th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-0">ID</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Email</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">Item ID</th>
                                    <th class="px-4 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr
                                    v-for="(item, index) in items"
                                    :key="`${item.id}-${index}`"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                                >
                                    <td class="px-4 py-2 text-center">
                                        <input
                                            type="checkbox"
                                            class="form-checkbox"
                                            :checked="selectedItems.has(item.id)"
                                            :disabled="item.can_delete === false"
                                            @change="toggleSelectItem(item.id)"
                                        />
                                    </td>
                                    <td class="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                        #{{ item.id }}
                                    </td>
                                    <td class="px-4 py-2">
                                        <Link
                                            v-if="item.can_edit !== false"
                                            :href="`${baseUrl}/edit?item=${item.id}`"
                                            class="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                                            preserve-scroll
                                        >
                                            {{ item.title || 'Unnamed User' }}
                                        </Link>
                                        <span
                                            v-else
                                            class="text-sm font-medium text-gray-900 dark:text-white"
                                        >
                                            {{ item.title || 'Unnamed User' }}
                                        </span>
                                    </td>
                                    <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                        {{ item.email || '-' }}
                                    </td>
                                    <td class="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                                        {{ item.item_id || '-' }}
                                    </td>
                                    <td class="px-4 py-2">
                                        <div class="btn-group" role="group">
                                            <Link
                                                v-if="item.can_edit !== false"
                                                :href="`${baseUrl}/edit?item=${item.id}`"
                                                class="btn-group-item-edit"
                                                preserve-scroll
                                                title="Edit"
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
                                            </Link>
                                            <button
                                                v-if="item.can_delete !== false"
                                                type="button"
                                                class="btn-group-item-delete"
                                                @click="deleteItem(item)"
                                                title="Delete"
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
                                            <span
                                                v-if="item.can_edit === false && item.can_delete === false"
                                                class="text-xs text-gray-400 dark:text-gray-500"
                                            >
                                                No permission
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="items.length === 0">
                                    <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        {{ search ? 'No users found matching your search.' : 'No users yet.' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <div v-if="pagination" class="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                        <div class="flex flex-1 justify-between sm:hidden">
                            <Link
                                v-if="pagination.current_page > 1"
                                :href="`${baseUrl}?page=${pagination.current_page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`"
                                class="btn-text"
                            >
                                Previous
                            </Link>
                            <span v-else class="text-gray-400">Previous</span>
                            
                            <Link
                                v-if="pagination.current_page < pagination.last_page"
                                :href="`${baseUrl}?page=${pagination.current_page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`"
                                class="btn-text"
                            >
                                Next
                            </Link>
                            <span v-else class="text-gray-400">Next</span>
                        </div>
                        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p class="text-sm text-gray-700 dark:text-gray-300">
                                    Showing
                                    <span class="font-medium">{{ pagination.from }}</span>
                                    to
                                    <span class="font-medium">{{ pagination.to }}</span>
                                    of
                                    <span class="font-medium">{{ pagination.total }}</span>
                                    results
                                </p>
                            </div>
                            <div>
                                <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <Link
                                        v-for="link in pagination.links"
                                        :key="link.label"
                                        :href="link.url || '#'"
                                        class="relative inline-flex items-center px-4 py-2 text-sm font-semibold"
                                        :class="{
                                            'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700': link.url && !link.active,
                                            'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600': link.active,
                                            'text-gray-300 cursor-not-allowed dark:text-gray-600': !link.url
                                        }"
                                        v-html="link.label"
                                    />
                                </nav>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        <ModalDialog :open="createModalOpen" title="Create user" @close="closeCreateModal">
            <form class="space-y-4" @submit.prevent="submitCreate">
                <!-- Name field (required) -->
                <div class="space-y-1">
                    <label class="form-label">Name</label>
                    <input
                        v-model="createForm.title"
                        type="text"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.title }"
                        required
                        placeholder="Enter user name"
                    />
                    <p v-if="createForm.errors.title" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.title }}
                    </p>
                </div>

                <!-- Email field (required) -->
                <div class="space-y-1">
                    <label class="form-label">Email</label>
                    <input
                        v-model="createForm.email"
                        type="email"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.email }"
                        required
                        placeholder="Enter user email"
                    />
                    <p v-if="createForm.errors.email" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.email }}
                    </p>
                </div>

                <!-- Password field (required) -->
                <div class="space-y-1">
                    <label class="form-label">Password</label>
                    <input
                        v-model="createForm.password"
                        type="password"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.password }"
                        required
                        placeholder="Enter password"
                    />
                    <p v-if="createForm.errors.password" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.password }}
                    </p>
                </div>

                <!-- Password confirmation field (required) -->
                <div class="space-y-1">
                    <label class="form-label">Confirm Password</label>
                    <input
                        v-model="createForm.password_confirmation"
                        type="password"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.password_confirmation }"
                        required
                        placeholder="Confirm password"
                    />
                    <p v-if="createForm.errors.password_confirmation" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.password_confirmation }}
                    </p>
                </div>

                <!-- Active checkbox -->
                <div class="flex items-center space-x-2">
                    <input
                        id="active"
                        v-model="createForm.active"
                        type="checkbox"
                        class="form-checkbox"
                    />
                    <label for="active" class="form-label mb-0">Active</label>
                    <p v-if="createForm.errors.active" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.active }}
                    </p>
                </div>

                <!-- Admin Access checkbox -->
                <div class="flex items-center space-x-2">
                    <input
                        id="admin_access"
                        v-model="createForm.admin_access"
                        type="checkbox"
                        class="form-checkbox"
                    />
                    <label for="admin_access" class="form-label mb-0">Admin Access</label>
                    <p v-if="createForm.errors.admin_access" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.admin_access }}
                    </p>
                </div>

                <div class="flex items-center justify-end gap-3">
                    <button type="button" class="btn-text" @click="closeCreateModal">Cancel</button>
                    <button type="submit" class="btn btn-primary" :disabled="createForm.processing">
                        {{ createForm.processing ? 'Creating…' : 'Create' }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </AdminLayout>
</template>
