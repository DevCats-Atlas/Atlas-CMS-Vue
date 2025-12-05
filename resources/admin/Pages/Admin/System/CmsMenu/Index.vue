<script setup>
import { Head, router, useForm } from '@inertiajs/vue3';
import { computed, ref, watch } from 'vue';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    title: {
        type: String,
        default: 'CMS Menu',
    },
    groups: {
        type: Array,
        default: () => [],
    },
    modules: {
        type: Array,
        default: () => [],
    },
    roles: {
        type: Array,
        default: () => [],
    },
});

const newGroupForm = useForm({
    title: '',
    visible: true,
    roles: [],
});

const editGroupForm = useForm({
    title: '',
    visible: true,
    roles: [],
});

const editingGroupId = ref(null);

const itemForm = useForm({
    title: '',
    visible: true,
    module_id: '',
    module_action_id: '',
    query_params: '',
    roles: [],
});

const suppressNextActionReset = ref(false);

const activeItemContext = ref({
    groupId: null,
    itemId: null,
});

const isEditingItem = computed(() => activeItemContext.value.itemId !== null);

const submitNewGroup = () => {
    newGroupForm.post('/admin/system/cms-menu/groups', {
        preserveScroll: true,
        onSuccess: () => {
            newGroupForm.reset('title');
            newGroupForm.roles = [];
        },
    });
};

const startEditGroup = (group) => {
    editingGroupId.value = group.id;
    editGroupForm.title = group.title;
    editGroupForm.visible = group.visible;
    editGroupForm.roles = group.roleIds ? group.roleIds.map((id) => String(id)) : [];
};

const cancelEditGroup = () => {
    editingGroupId.value = null;
    editGroupForm.reset();
    editGroupForm.roles = [];
};

const submitEditGroup = (group) => {
    editGroupForm.put(`/admin/system/cms-menu/groups/${group.id}`, {
        preserveScroll: true,
        onSuccess: () => cancelEditGroup(),
    });
};

const toggleGroupVisible = (group) => {
    router.patch(`/admin/system/cms-menu/groups/${group.id}/toggle-visible`, {}, { preserveScroll: true });
};

const reorderGroup = (group, direction) => {
    router.patch(
        `/admin/system/cms-menu/groups/${group.id}/reorder`,
        { direction },
        { preserveScroll: true },
    );
};

const deleteGroup = async (group) => {
    const confirmed = await confirmDialog({
        title: 'Delete menu group',
        message: `Delete group "${group.title}" and all nested menu items?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/cms-menu/groups/${group.id}`, { preserveScroll: true });
};

const startCreateItem = (group) => {
    activeItemContext.value = { groupId: group.id, itemId: null };
    itemForm.reset();
    itemForm.visible = true;
    itemForm.module_id = '';
    itemForm.module_action_id = '';
    itemForm.query_params = '';
    itemForm.roles = [];
};

const startEditItem = (group, item) => {
    activeItemContext.value = { groupId: group.id, itemId: item.id };
    itemForm.title = item.title;
    itemForm.visible = item.visible;
    suppressNextActionReset.value = true;
    itemForm.module_id = item.moduleId ? String(item.moduleId) : '';
    itemForm.module_action_id = item.moduleActionId ? String(item.moduleActionId) : '';
    itemForm.query_params = item.queryParams || '';
    itemForm.roles = item.roleIds ? item.roleIds.map((id) => String(id)) : [];
};

const cancelItemForm = () => {
    activeItemContext.value = { groupId: null, itemId: null };
    itemForm.reset();
    itemForm.visible = true;
    itemForm.module_id = '';
    itemForm.module_action_id = '';
    itemForm.query_params = '';
    itemForm.roles = [];
};

const submitItemForm = () => {
    if (!activeItemContext.value.groupId) {
        return;
    }

    if (activeItemContext.value.itemId) {
        itemForm.put(`/admin/system/cms-menu/items/${activeItemContext.value.itemId}`, {
            preserveScroll: true,
            onSuccess: () => cancelItemForm(),
        });
    } else {
        itemForm.post(`/admin/system/cms-menu/groups/${activeItemContext.value.groupId}/items`, {
            preserveScroll: true,
            onSuccess: () => {
                itemForm.reset();
                itemForm.visible = true;
                itemForm.module_id = '';
                itemForm.module_action_id = '';
                itemForm.query_params = '';
                itemForm.roles = [];
            },
        });
    }
};

const availableActions = computed(() => {
    const moduleId = Number(itemForm.module_id);

    if (!moduleId) {
        return [];
    }

    const module = props.modules.find((m) => m.id === moduleId);

    return module ? module.actions : [];
});

watch(
    () => itemForm.module_id,
    () => {
        if (suppressNextActionReset.value) {
            suppressNextActionReset.value = false;
            return;
        }
        itemForm.module_action_id = '';
    },
);

const toggleItemVisible = (item) => {
    router.patch(`/admin/system/cms-menu/items/${item.id}/toggle-visible`, {}, { preserveScroll: true });
};

const reorderItem = (item, direction) => {
    router.patch(
        `/admin/system/cms-menu/items/${item.id}/reorder`,
        { direction },
        { preserveScroll: true },
    );
};

const deleteItem = async (item) => {
    const confirmed = await confirmDialog({
        title: 'Delete menu item',
        message: `Delete menu item "${item.title}"?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/cms-menu/items/${item.id}`, { preserveScroll: true });
};
</script>

<template>
    <SystemLayout>
        <Head :title="props.title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">CMS Menu</h1>
                            <p class="text-gray-600 dark:text-gray-400 mt-1">
                                Manage the groups and links that compose the administrative menu. Use ordering buttons to
                                rearrange entries and quickly toggle visibility when needed.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create menu group</h2>
                        <form class="space-y-4" @submit.prevent="submitNewGroup">
                            <div>
                                <label class="form-label">Title</label>
                                <input
                                    v-model="newGroupForm.title"
                                    type="text"
                                    class="form-input"
                                    required
                                />
                                <p v-if="newGroupForm.errors.title" class="mt-1 text-sm text-red-600">{{ newGroupForm.errors.title }}</p>
                            </div>
                            <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                                <input
                                    v-model="newGroupForm.visible"
                                    type="checkbox"
                                    class="form-checkbox"
                                />
                                <span class="ml-2">Visible</span>
                            </label>
                            <div>
                                <p class="form-label">Access roles</p>
                                <div class="mt-2 flex flex-wrap gap-3">
                                    <label
                                        v-for="role in props.roles"
                                        :key="role.id"
                                        class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                    >
                                        <input
                                            v-model="newGroupForm.roles"
                                            type="checkbox"
                                            :value="String(role.id)"
                                            class="form-checkbox"
                                        />
                                        <span>{{ role.title }}</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    :disabled="newGroupForm.processing"
                                >
                                    {{ newGroupForm.processing ? 'Creating…' : 'Create group' }}
                                </button>
                            </div>
                        </form>
                    </section>

                    
                </div>

                <section class="space-y-6">
                    <div v-for="group in props.groups" :key="group.id" class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                        <div class="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-3">
                                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ group.title }}</h3>
                                    <span
                                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                        :class="group.visible
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                    >
                                        {{ group.visible ? 'Visible' : 'Hidden' }}
                                    </span>
                                </div>
                                <p class="text-sm text-gray-500 dark:text-gray-400">{{ group.items.length }} items</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Roles:
                                    <span v-if="group.roleTitles?.length">{{ group.roleTitles.join(', ') }}</span>
                                    <span v-else>None</span>
                                </p>
                            </div>
                            <div class="flex flex-wrap gap-2 text-sm">
                                <button class="btn btn-outline" @click="reorderGroup(group, 'up')">↑</button>
                                <button class="btn btn-outline" @click="reorderGroup(group, 'down')">↓</button>
                                <button class="btn btn-outline" @click="toggleGroupVisible(group)">
                                    {{ group.visible ? 'Hide' : 'Show' }}
                                </button>
                                <button class="btn btn-outline" @click="startEditGroup(group)">
                                    Edit
                                </button>
                                <button class="btn btn-outline" @click="startCreateItem(group)">
                                    Add item
                                </button>
                                <button class="btn btn-outline-danger" @click="deleteGroup(group)">
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Menu items</h4>
                            <template v-if="group.items.length">
                                <div class="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <div
                                        v-for="item in group.items"
                                        :key="item.id"
                                        class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm"
                                    >
                                        <div>
                                            <p class="font-medium text-gray-900 dark:text-white">{{ item.title }}</p>
                                            <p class="text-gray-500 dark:text-gray-400">Order: {{ item.order }}</p>
                                            <p class="text-gray-500 dark:text-gray-400">
                                                Module: {{ item.moduleTitle || '—' }}
                                                <span v-if="item.actionTitle"> · Action: {{ item.actionTitle }}</span>
                                            </p>
                                            <p class="text-gray-500 dark:text-gray-400">
                                                Query: {{ item.queryParams || '—' }}
                                            </p>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                Roles:
                                                <span v-if="item.roleTitles?.length">{{ item.roleTitles.join(', ') }}</span>
                                                <span v-else>None</span>
                                            </p>
                                        </div>
                                        <div class="flex flex-wrap items-center gap-2">
                                            <span
                                                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                                :class="item.visible
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                                            >
                                                {{ item.visible ? 'Visible' : 'Hidden' }}
                                            </span>
                                            <button class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" @click="reorderItem(item, 'up')">↑</button>
                                            <button class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" @click="reorderItem(item, 'down')">↓</button>
                                            <button class="btn btn-outline" @click="toggleItemVisible(item)">
                                                {{ item.visible ? 'Hide' : 'Show' }}
                                            </button>
                                            <button class="btn btn-outline" @click="startEditItem(group, item)">
                                                Edit
                                            </button>
                                            <button class="btn btn-outline-danger" @click="deleteItem(item)">
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template v-else>
                                <p class="text-sm text-gray-500 dark:text-gray-400">No menu items yet.</p>
                            </template>
                        </div>
                    </div>
                </section>

            </div>
        </div>
        
        <ModalDialog
            :open="editingGroupId !== null"
            title="Edit menu group"
            @close="cancelEditGroup"
        >
            <form class="space-y-4" @submit.prevent="submitEditGroup(props.groups.find((g) => g.id === editingGroupId))">
                <div>
                    <label class="form-label">Title</label>
                    <input
                        v-model="editGroupForm.title"
                        type="text"
                        class="form-input"
                        required
                    />
                    <p v-if="editGroupForm.errors.title" class="mt-1 text-sm text-red-600">{{ editGroupForm.errors.title }}</p>
                </div>
                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                        v-model="editGroupForm.visible"
                        type="checkbox"
                        class="form-checkbox"
                    />
                    <span class="ml-2">Visible</span>
                </label>
                <div>
                    <p class="form-label">Access roles</p>
                    <div class="mt-2 flex flex-wrap gap-3">
                        <label
                            v-for="role in props.roles"
                            :key="role.id"
                            class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                            <input
                                v-model="editGroupForm.roles"
                                type="checkbox"
                                :value="String(role.id)"
                                class="form-checkbox"
                            />
                            <span>{{ role.title }}</span>
                        </label>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <button type="button" class="btn-text" @click="cancelEditGroup">Cancel</button>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        :disabled="editGroupForm.processing"
                    >
                        {{ editGroupForm.processing ? 'Saving…' : 'Save group' }}
                    </button>
                </div>
            </form>
        </ModalDialog>

        <ModalDialog
            :open="activeItemContext.groupId !== null"
            :title="isEditingItem ? 'Edit menu item' : 'Add menu item'"
            @close="cancelItemForm"
        >
            <form class="space-y-4" @submit.prevent="submitItemForm">
                <div>
                    <label class="form-label text-gray-600 dark:text-gray-400">Title</label>
                    <input
                        v-model="itemForm.title"
                        type="text"
                        class="form-input"
                        required
                    />
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="form-label text-gray-600 dark:text-gray-400">Module</label>
                        <select
                            v-model="itemForm.module_id"
                            class="form-select"
                        >
                            <option value="">Select module</option>
                            <option v-for="module in props.modules" :key="module.id" :value="module.id">
                                {{ module.title }}
                            </option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label text-gray-600 dark:text-gray-400">Module action</label>
                        <select
                            v-model="itemForm.module_action_id"
                            :disabled="!itemForm.module_id"
                            class="form-select disabled:opacity-50"
                        >
                            <option value="">Select action</option>
                            <option v-for="action in availableActions" :key="action.id" :value="action.id">
                                {{ action.title }}
                            </option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="form-label text-gray-600 dark:text-gray-400">Query parameters</label>
                    <input
                        v-model="itemForm.query_params"
                        type="text"
                        class="form-input"
                        placeholder="utm_source=admin"
                    />
                </div>
                <div>
                    <p class="form-label">Access roles</p>
                    <div class="mt-2 flex flex-wrap gap-3">
                        <label
                            v-for="role in props.roles"
                            :key="role.id"
                            class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                            <input
                                v-model="itemForm.roles"
                                type="checkbox"
                                :value="String(role.id)"
                                class="form-checkbox"
                            />
                            <span>{{ role.title }}</span>
                        </label>
                    </div>
                </div>
                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                        v-model="itemForm.visible"
                        type="checkbox"
                        class="form-checkbox"
                    />
                    <span class="ml-2">Visible</span>
                </label>
                <div class="flex items-center gap-3">
                    <button type="button" class="btn-text" @click="cancelItemForm">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        class="btn btn-primary"
                        :disabled="itemForm.processing"
                    >
                        {{ itemForm.processing ? 'Saving…' : (isEditingItem ? 'Save item' : 'Create item') }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </SystemLayout>
</template>
