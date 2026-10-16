<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed, ref } from 'vue';
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';
import { useListSearch } from '@/lists/useListSearch.js';
import { useSelection } from '@/lists/useSelection.js';
import ListPagination from '@/lists/ListPagination.vue';
import ListSearch from '@/lists/ListSearch.vue';
import ListToolbar from '@/lists/ListToolbar.vue';

const { t } = useTranslation();

const props = defineProps({
    title: { type: String, default: '' },
    moduleHandle: { type: String, default: 'users' },
    module: { type: Object, required: true },
    action: { type: Object, required: true },
    menuItem: { type: Object, default: null },
    crud: { type: Object, required: true },
    availableActions: { type: Array, default: () => [] },
    itemType: { type: Object, required: true },
    fields: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
    hasSortingEnabled: { type: Boolean, default: false },
    hasDeepStructureEnabled: { type: Boolean, default: false },
    search: { type: String, default: '' },
    pagination: { type: Object, default: null },
});

const baseUrl = computed(() => adminUrl(`${props.moduleHandle}`));
const deleteUrl = computed(() => `${baseUrl.value}/delete`);

const listSearch = useListSearch(() => baseUrl.value, props.search);

// Users the current admin may not delete (themselves, superadmins) cannot be selected
const selection = useSelection(() => props.items, {
    deletable: (item) => item.can_delete !== false,
    deleteUrl: () => deleteUrl.value,
    confirm: (count) => ({
        title: t('admin.users.delete_selected_users'),
        message: t('admin.users.delete_selected_confirm', { count }),
        confirmLabel: t('admin.common.delete'),
    }),
});

// Users are created in a modal; the backend redirects to the new user's edit page
const createModalOpen = ref(false);
const createForm = useForm({
    title: '', // the user's name
    email: '',
    password: '',
    password_confirmation: '',
    active: true,
    admin_access: false,
});

const openCreateModal = () => {
    createForm.reset();
    createForm.clearErrors();
    createModalOpen.value = true;
};

const submitCreate = () => {
    createForm.post(`${baseUrl.value}/create`, {
        preserveScroll: true,
        onSuccess: () => {
            createModalOpen.value = false;
        },
    });
};

const deleteItem = async (item) => {
    const confirmed = await confirmDialog({
        title: t('admin.users.delete_user'),
        message: t('admin.users.delete_user_confirm', { title: item.title }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    if (confirmed) {
        router.delete(deleteUrl.value, { data: { item_id: item.id }, preserveScroll: true });
    }
};
</script>

<template>
    <AdminLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-6xl sm:px-6 lg:px-8 space-y-6">
                <section class="section">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ t('admin.items.module') }}</p>
                            <h1 class="heading-1">
                                {{ module.title }}
                                <span class="text-gray-400 text-base font-normal">/ {{ action.title }}</span>
                            </h1>
                        </div>
                        <div class="text-right space-y-1">
                            <p class="text-xs font-semibold text-gray-500 uppercase">{{ t('admin.items.item_type') }}</p>
                            <p class="text-sm text-gray-900 dark:text-white">{{ itemType.label }}</p>
                        </div>
                    </div>
                </section>

                <ListSearch
                    :search="listSearch"
                    :active="Boolean(search)"
                    :heading="t('admin.users.search_users')"
                    :placeholder="t('admin.users.search_placeholder')"
                    :hint="t('admin.users.search_hint')"
                />

                <section class="section">
                    <ListToolbar
                        :heading="t('admin.users.title')"
                        :selected-count="selection.count.value"
                        :deleting="selection.isDeleting.value"
                        @delete-selected="selection.deleteSelected"
                    >
                        <button type="button" class="btn btn-outline" @click="openCreateModal">
                            {{ t('admin.users.new_user') }}
                        </button>
                    </ListToolbar>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                            <thead class="bg-gray-50 dark:bg-gray-900/40">
                                <tr>
                                    <th class="table-cell text-center w-12">
                                        <input
                                            type="checkbox"
                                            class="form-checkbox"
                                            :aria-label="t('admin.lists.select_all')"
                                            :checked="selection.isAllSelected.value"
                                            :indeterminate="selection.isIndeterminate.value"
                                            @change="selection.toggleAll($event.target.checked)"
                                        />
                                    </th>
                                    <th class="table-header w-0">ID</th>
                                    <th class="table-header">{{ t('admin.users.name') }}</th>
                                    <th class="table-header">{{ t('admin.users.email') }}</th>
                                    <th class="table-header">{{ t('admin.users.item_id') }}</th>
                                    <th class="w-auto px-2 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">{{ t('admin.common.actions') }}</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr
                                    v-for="(item, index) in items"
                                    :key="`${item.id}-${index}`"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
                                >
                                    <td class="table-cell text-center">
                                        <input
                                            type="checkbox"
                                            class="form-checkbox"
                                            :aria-label="t('admin.lists.select_row')"
                                            :checked="selection.isSelected(item.id)"
                                            :disabled="item.can_delete === false"
                                            @change="selection.toggle(item.id)"
                                        />
                                    </td>
                                    <td class="table-cell table-id">
                                        #{{ item.id }}
                                    </td>
                                    <td class="table-cell">
                                        <Link
                                            v-if="item.can_edit !== false"
                                            :href="`${baseUrl}/edit?item=${item.id}`"
                                            class="text-sm font-medium text-indigo-600 dark:text-indigo-300 hover:underline"
                                            preserve-scroll
                                        >
                                            {{ item.title || t('admin.users.unnamed_user') }}
                                        </Link>
                                        <span
                                            v-else
                                            class="text-sm font-medium text-gray-900 dark:text-white"
                                        >
                                            {{ item.title || t('admin.users.unnamed_user') }}
                                        </span>
                                    </td>
                                    <td class="table-cell text-sm text-gray-900 dark:text-white">
                                        {{ item.email || '-' }}
                                    </td>
                                    <td class="table-cell font-mono text-xs text-gray-500 dark:text-gray-400">
                                        {{ item.item_id || '-' }}
                                    </td>
                                    <td class="w-auto px-2 py-2 whitespace-nowrap">
                                        <div class="btn-group" role="group">
                                            <Link
                                                v-if="item.can_edit !== false"
                                                :href="`${baseUrl}/edit?item=${item.id}`"
                                                class="btn-group-item-edit"
                                                preserve-scroll
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
                                            </Link>
                                            <button
                                                v-if="item.can_delete !== false"
                                                type="button"
                                                class="btn-group-item-delete"
                                                @click="deleteItem(item)"
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
                                            <span
                                                v-if="item.can_edit === false && item.can_delete === false"
                                                class="text-xs text-gray-400 dark:text-gray-500"
                                            >
                                                {{ t('admin.users.no_permission') }}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="items.length === 0">
                                    <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        {{ search ? t('admin.users.no_users_found') : t('admin.users.no_users_yet') }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <ListPagination :pagination="pagination" />
                </section>
            </div>
        </div>

        <ModalDialog :open="createModalOpen" :title="t('admin.users.create_user')" @close="createModalOpen = false">
            <form class="space-y-4" @submit.prevent="submitCreate">
                <!-- Name field (required) -->
                <div class="space-y-1">
                    <label class="form-label">{{ t('admin.users.name') }}</label>
                    <input
                        v-model="createForm.title"
                        type="text"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.title }"
                        required
                        :placeholder="t('admin.users.enter_name')"
                    />
                    <p v-if="createForm.errors.title" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.title }}
                    </p>
                </div>

                <!-- Email field (required) -->
                <div class="space-y-1">
                    <label class="form-label">{{ t('admin.users.email') }}</label>
                    <input
                        v-model="createForm.email"
                        type="email"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.email }"
                        required
                        :placeholder="t('admin.users.enter_email')"
                    />
                    <p v-if="createForm.errors.email" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.email }}
                    </p>
                </div>

                <!-- Password field (required) -->
                <div class="space-y-1">
                    <label class="form-label">{{ t('admin.users.password') }}</label>
                    <input
                        v-model="createForm.password"
                        type="password"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.password }"
                        required
                        :placeholder="t('admin.users.enter_password')"
                    />
                    <p v-if="createForm.errors.password" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.password }}
                    </p>
                </div>

                <!-- Password confirmation field (required) -->
                <div class="space-y-1">
                    <label class="form-label">{{ t('admin.users.confirm_password') }}</label>
                    <input
                        v-model="createForm.password_confirmation"
                        type="password"
                        class="form-input"
                        :class="{ 'form-input-error': createForm.errors.password_confirmation }"
                        required
                        :placeholder="t('admin.users.confirm_password_create')"
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
                    <label for="active" class="form-label mb-0">{{ t('admin.users.active') }}</label>
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
                    <label for="admin_access" class="form-label mb-0">{{ t('admin.users.admin_access') }}</label>
                    <p v-if="createForm.errors.admin_access" class="text-sm text-red-600 dark:text-red-400">
                        {{ createForm.errors.admin_access }}
                    </p>
                </div>

                <div class="actions-footer">
                    <button type="button" class="btn-text" @click="createModalOpen = false">{{ t('admin.common.cancel') }}</button>
                    <button type="submit" class="btn btn-primary" :disabled="createForm.processing">
                        {{ createForm.processing ? t('admin.users.creating') : t('admin.common.create') }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </AdminLayout>
</template>
