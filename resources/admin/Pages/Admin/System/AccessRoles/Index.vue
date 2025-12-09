<script setup>
import { Head, useForm, router } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { ref, computed, watch } from 'vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Access Roles',
    },
    roles: {
        type: Array,
        default: () => [],
    },
    modules: {
        type: Array,
        default: () => [],
    },
});

const createForm = useForm({
    title: '',
    visible: true,
});

const editForm = useForm({
    title: '',
    visible: true,
    modules: [],
});

const editingRoleId = ref(null);
const { toasts, showToast, dismissToast } = useToast();

const submitNewRole = () => {
    createForm.post('/admin/system/access-roles', {
        preserveScroll: true,
        onSuccess: () => {
            createForm.reset('title');
            showToast({
                title: t('admin.common.success'),
                message: t('admin.access_roles.role_created'),
                intent: 'success',
            });
        },
    });
};

const startEditRole = (role) => {
    editingRoleId.value = role.id;
    editForm.title = role.title;
    editForm.visible = role.visible;
    editForm.modules = role.modules || [];
};

const cancelEdit = () => {
    editingRoleId.value = null;
    editForm.reset();
};

const submitEditRole = (role) => {
    editForm.put(`/admin/system/access-roles/${role.id}`, {
        preserveScroll: true,
        onSuccess: () => {
            showToast({
                title: t('admin.common.success'),
                message: t('admin.access_roles.role_updated'),
                intent: 'success',
            });
            // Reload the page to get updated role data with modules
            router.reload({ only: ['roles'] });
        },
    });
};

// Watch for role data changes to update form when props reload
watch(
    () => props.roles,
    (newRoles) => {
        if (editingRoleId.value) {
            const updatedRole = newRoles.find((r) => r.id === editingRoleId.value);
            if (updatedRole) {
                // Update form modules if role data has changed
                editForm.modules = updatedRole.modules || [];
            }
        }
    },
    { deep: true }
);

const toggleRole = (role) => {
    router.patch(`/admin/system/access-roles/${role.id}/toggle-visible`, {}, { preserveScroll: true });
};

const reorderRole = (role, direction) => {
    router.patch(`/admin/system/access-roles/${role.id}/reorder`, { direction }, { preserveScroll: true });
};

const deleteRole = async (role) => {
    const confirmed = await confirmDialog({
        title: t('admin.access_roles.delete_role'),
        message: t('admin.access_roles.delete_confirm', { title: role.title }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/access-roles/${role.id}`, { preserveScroll: true });
};

// Select all modules functionality
const allModulesSelected = computed(() => {
    if (props.modules.length === 0) {
        return false;
    }
    return props.modules.every(module => editForm.modules.includes(module.id));
});

const toggleAllModules = () => {
    if (allModulesSelected.value) {
        // Deselect all
        editForm.modules = [];
    } else {
        // Select all
        editForm.modules = props.modules.map(module => module.id);
    }
};
</script>

<template>
    <SystemLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-4xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between">
                        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ t('admin.access_roles.title') }}</h1>
                    </div>

                    <form class="space-y-4" @submit.prevent="submitNewRole">
                        <div>
                            <label class="form-label">Title</label>
                            <input
                                v-model="createForm.title"
                                type="text"
                                class="form-input"
                                required
                            />
                            <p v-if="createForm.errors.title" class="mt-1 text-sm text-red-600">{{ createForm.errors.title }}</p>
                        </div>
                        <div class="flex gap-4">
                            <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    v-model="createForm.visible"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2">Visible</span>
                            </label>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="createForm.processing"
                            >
                                {{ createForm.processing ? t('admin.access_roles.creating') : t('admin.access_roles.create_role') }}
                            </button>
                        </div>
                    </form>
                </div>

                <section class="space-y-4">
                    <div
                        v-for="role in roles"
                        :key="role.id"
                        class="bg-white dark:bg-gray-800 shadow rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                        <div>
                            <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ role.title }}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.access_roles.order') }} {{ role.order }}</p>
                        </div>
                        <div class="flex items-center gap-2 text-sm">
                            <span
                                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                :class="role.visible
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                            >
                                {{ role.visible ? t('admin.access_roles.visible') : t('admin.access_roles.hidden') }}
                            </span>
                            <button class="btn btn-outline" @click="reorderRole(role, 'up')">↑</button>
                            <button class="btn btn-outline" @click="reorderRole(role, 'down')">↓</button>
                            <button class="btn btn-outline" @click="toggleRole(role)">
                                {{ role.visible ? t('admin.access_roles.hide') : t('admin.access_roles.show') }}
                            </button>
                            <button class="btn btn-outline" @click="startEditRole(role)">
                                {{ t('admin.common.edit') }}
                            </button>
                            <button class="btn btn-outline-danger" @click="deleteRole(role)">
                                {{ t('admin.common.delete') }}
                            </button>
                        </div>
                    </div>
                    <p v-if="roles.length === 0" class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.access_roles.no_roles') }}</p>
                </section>

                <section v-if="editingRoleId" class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('admin.access_roles.edit_role') }}</h2>
                    <form class="space-y-4" @submit.prevent="submitEditRole(props.roles.find((r) => r.id === editingRoleId))">
                        <div>
                            <label class="form-label">Title</label>
                            <input
                                v-model="editForm.title"
                                type="text"
                                class="form-input"
                                required
                            />
                        </div>
                        <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <input
                                v-model="editForm.visible"
                                type="checkbox"
                                class="form-checkbox"
                            />
                            <span class="ml-2">Visible</span>
                        </label>
                        
                        <!-- Modules assignment -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="form-label block mb-0">{{ t('admin.access_roles.modules') }}</label>
                                <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        :checked="allModulesSelected"
                                        @change="toggleAllModules"
                                        class="form-checkbox"
                                    />
                                    <span>{{ t('admin.access_roles.select_all') }}</span>
                                </label>
                            </div>
                            <div class="space-y-2 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                                <label
                                    v-for="module in modules"
                                    :key="module.id"
                                    class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded"
                                >
                                    <input
                                        v-model="editForm.modules"
                                        type="checkbox"
                                        :value="module.id"
                                        class="form-checkbox"
                                    />
                                    <span class="font-mono text-xs text-gray-500 dark:text-gray-400 w-12">{{ module.id }}</span>
                                    <span>{{ module.title }}</span>
                                </label>
                                <p v-if="modules.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                                    {{ t('admin.access_roles.no_modules') }}
                                </p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-3">
                            <button type="button" class="btn-text" @click="cancelEdit">{{ t('admin.common.cancel') }}</button>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="editForm.processing"
                            >
                                {{ editForm.processing ? t('admin.access_roles.saving') : t('admin.access_roles.save_changes') }}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
        
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </SystemLayout>
</template>
