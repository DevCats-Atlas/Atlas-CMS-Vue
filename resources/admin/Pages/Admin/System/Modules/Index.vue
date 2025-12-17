<script setup>
import { computed, ref, watch } from 'vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    title: {
        type: String,
        default: 'Modules',
    },
    modules: {
        type: Array,
        default: () => [],
    },
    itemTypes: {
        type: Array,
        default: () => [],
    },
    itemTypeFieldOptions: {
        type: Array,
        default: () => [],
    },
    menuGroups: {
        type: Array,
        default: () => [],
    },
    collections: {
        type: Array,
        default: () => [],
    },
    collectionCreateValue: {
        type: String,
        default: '__create_collection__',
    },
    dbConnections: {
        type: Array,
        default: () => [],
    },
});

const CREATE_TYPE_OPTION = '__create__';
const COLLECTION_CREATE_OPTION = props.collectionCreateValue || '__create_collection__';

const defaultDbConnectionLabel = computed(() => {
    const def = props.dbConnections.find((c) => c.is_default);
    return def ? def.label : 'default';
});

const createForm = useForm({
    title: '',
    visible: true,
    item_type_id: '',
    create_item_type: false,
    new_type_code: '',
    new_type_class: '',
    new_type_slug_is_multilingual: false,
    new_type_fields: [],
    create_crud_actions: true,
    create_menu_item: false,
    menu_group_id: '',
    menu_item_title: '',
    collection_choice: '',
    collection_title: '',
    data_source: 'items', // Default to 'items'
    data_source_table: '', // Data source table field
    db_table_connection: '', // Database connection field
});

const isCreateModalOpen = ref(false);
const selectedItemType = ref('');

const canCreateMenuItem = computed(() => props.menuGroups.length > 0);
const hasCollections = computed(() => props.collections.length > 0);

const deleteModule = async (module) => {
    const confirmed = await confirmDialog({
        title: 'Delete module',
        message: `Delete module "${module.title}" and its actions?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    createForm.delete(`/admin/system/modules/${module.id}`, {
        preserveScroll: true,
    });
};

const openCreateModal = () => {
    resetCreateForm();
    isCreateModalOpen.value = true;
};

const closeCreateModal = () => {
    isCreateModalOpen.value = false;
    resetCreateForm();
};

const resetCreateForm = () => {
    createForm.reset();
    createForm.visible = true;
    createForm.create_item_type = false;
    createForm.create_crud_actions = true;
    createForm.create_menu_item = false;
    createForm.new_type_fields = [];
    createForm.data_source = 'items'; // Default to 'items'
    createForm.data_source_table = ''; // Reset data_source_table
    createForm.db_table_connection = ''; // Reset db_table_connection
    selectedItemType.value = '';
    setDefaultCollectionChoice();
};

const isDbTableSource = computed(() => {
    return createForm.data_source === 'db_table';
});

const isCustomSource = computed(() => {
    return createForm.data_source === 'custom';
});

const setDefaultCollectionChoice = () => {
    // Keep collection unselected by default
    createForm.collection_choice = '';
    createForm.collection_title = '';
};
setDefaultCollectionChoice();

watch(
    selectedItemType,
    (value) => {
        if (value === CREATE_TYPE_OPTION) {
            createForm.create_item_type = true;
            createForm.item_type_id = '';
        } else {
            createForm.create_item_type = false;
            createForm.item_type_id = value;
            createForm.new_type_code = '';
            createForm.new_type_class = '';
            createForm.new_type_slug_is_multilingual = false;
            createForm.new_type_fields = [];
        }
    },
);

watch(
    () => createForm.create_menu_item,
    (enabled) => {
        if (!enabled) {
            createForm.menu_group_id = '';
            createForm.menu_item_title = '';
        } else if (!createForm.menu_group_id && props.menuGroups.length) {
            createForm.menu_group_id = String(props.menuGroups[0].id);
        }
    },
);

watch(
    () => createForm.collection_choice,
    (value) => {
        if (value !== COLLECTION_CREATE_OPTION) {
            createForm.collection_title = '';
        }
    },
);

const submitNewModule = () => {
    createForm.post('/admin/system/modules', {
        onSuccess: () => closeCreateModal(),
    });
};
</script>

<template>
    <SystemLayout>
        <Head :title="title" />

        <div class="py-6">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h1 class="heading-1">Modules</h1>
                            <p class="text-gray-600 dark:text-gray-400 mt-1">
                                Define the high-level modules available in the CMS and manage their actions.
                            </p>
                        </div>
                        <button type="button" class="btn btn-primary" @click="openCreateModal">
                            Create module
                        </button>
                    </div>
                </div>

                <section class="space-y-4">
                    <div
                        v-for="module in modules"
                        :key="module.id"
                        class="bg-white dark:bg-gray-800 shadow rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                        <div>
                            <Link :href="`/admin/system/modules/${module.id}`" class="text-lg font-semibold text-gray-900 dark:text-white hover:underline">
                                {{ module.title }}
                            </Link>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                {{ module.actions_count }} actions · Order {{ module.order }}
                            </p>
                        </div>
                        <div class="flex items-center gap-3 text-sm">
                            <span
                                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                :class="module.visible
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                            >
                                {{ module.visible ? 'Visible' : 'Hidden' }}
                            </span>
                            <Link :href="`/admin/system/modules/${module.id}`" class="btn btn-outline">
                                Manage
                            </Link>
                            <button
                                type="button"
                                class="btn btn-outline-danger"
                                @click="deleteModule(module)"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <p v-if="modules.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No modules yet.</p>
                </section>
            </div>
        </div>

        <ModalDialog :open="isCreateModalOpen" title="Create module" @close="closeCreateModal">
            <form class="space-y-6" @submit.prevent="submitNewModule">
                <div class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="form-label">Title</label>
                        <input v-model="createForm.title" type="text" class="form-input" required />
                        <p v-if="createForm.errors.title" class="mt-1 text-sm text-red-600">{{ createForm.errors.title }}</p>
                    </div>
                    <div>
                        <label class="form-label">Data source</label>
                        <select v-model="createForm.data_source" class="form-select" required>
                            <option value="items">Items</option>
                            <option value="db_table">Database Table</option>
                            <option value="custom">Custom</option>
                        </select>
                        <p v-if="createForm.errors.data_source" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.data_source }}
                        </p>
                    </div>
                </div>

                <div v-if="isDbTableSource" class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="form-label">Database connection</label>
                        <select v-model="createForm.db_table_connection" class="form-select">
                            <option value="">Default ({{ defaultDbConnectionLabel }})</option>
                            <option
                                v-for="connection in props.dbConnections"
                                :key="connection.key"
                                :value="connection.key"
                            >
                                {{ connection.label }}
                            </option>
                        </select>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Connection name from config/database.php. Leave empty to use default connection.
                        </p>
                        <p v-if="createForm.errors.db_table_connection" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.db_table_connection }}
                        </p>
                    </div>
                    <div>
                        <label class="form-label">Data source table</label>
                        <input v-model="createForm.data_source_table" type="text" class="form-input" />
                        <p v-if="createForm.errors.data_source_table" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.data_source_table }}
                        </p>
                    </div>
                </div>

                <div v-if="isCustomSource" class="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        Custom data source modules use their own controller implementation. 
                        Create a custom controller extending <code class="text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">ModuleBaseController</code> 
                        to implement custom logic for this module.
                    </p>
                </div>
                <div v-if="!isDbTableSource && !isCustomSource" class="grid gap-4 md:grid-cols-2">
                    <div>
                        <label class="form-label">Item type</label>
                        <select v-model="selectedItemType" class="form-select" :required="!isDbTableSource && !isCustomSource">
                            <option value="" disabled>Select type</option>
                            <option v-for="type in props.itemTypes" :key="type.id" :value="String(type.id)">
                                {{ type.label }}
                            </option>
                            <option :value="CREATE_TYPE_OPTION">Create new item type…</option>
                        </select>
                        <p v-if="createForm.errors.item_type_id" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.item_type_id }}
                        </p>
                    </div>
                    <div class="flex items-center gap-3">
                        <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <input v-model="createForm.visible" type="checkbox" class="form-checkbox" />
                            <span class="ml-2">Visible</span>
                        </label>
                        <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                            <input v-model="createForm.create_crud_actions" type="checkbox" class="form-checkbox" />
                            <span class="ml-2">Create CRUD actions</span>
                        </label>
                    </div>
                </div>

                <div v-if="!isDbTableSource && !isCustomSource" class="space-y-3">
                    <div>
                        <label class="form-label">Collection</label>
                        <select v-model="createForm.collection_choice" class="form-select" :required="!isDbTableSource && !isCustomSource">
                            <option value="" disabled>Select collection</option>
                            <option :value="COLLECTION_CREATE_OPTION">✨ Create new collection…</option>
                            <option v-for="collection in props.collections" :key="collection.id" :value="String(collection.id)">
                                {{ collection.title }}
                            </option>
                        </select>
                        <p v-if="createForm.errors.collection_choice" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.collection_choice }}
                        </p>
                    </div>
                    <p v-if="!hasCollections" class="text-xs text-gray-500 dark:text-gray-400">
                        No collections found. Select "Create new collection…" to generate one automatically.
                    </p>
                    <div v-if="createForm.collection_choice === COLLECTION_CREATE_OPTION">
                        <label class="form-label">New collection title</label>
                        <input v-model="createForm.collection_title" type="text" class="form-input" required />
                        <p v-if="createForm.errors.collection_title" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.collection_title }}
                        </p>
                    </div>
                </div>

                <div v-if="createForm.create_item_type" class="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">New item type</h3>
                    <div class="grid gap-4 md:grid-cols-2">
                        <div>
                            <label class="form-label">Code</label>
                            <input v-model="createForm.new_type_code" type="text" class="form-input" required />
                            <p v-if="createForm.errors.new_type_code" class="mt-1 text-sm text-red-600">
                                {{ createForm.errors.new_type_code }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Bound class (optional)</label>
                            <input v-model="createForm.new_type_class" type="text" class="form-input" />
                            <p v-if="createForm.errors.new_type_class" class="mt-1 text-sm text-red-600">
                                {{ createForm.errors.new_type_class }}
                            </p>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <p class="form-label">Basic fields</p>
                        <div class="space-y-2">
                            <label
                                v-for="field in props.itemTypeFieldOptions"
                                :key="field.value"
                                class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                            >
                                <input
                                    v-model="createForm.new_type_fields"
                                    type="checkbox"
                                    :value="field.value"
                                    class="form-checkbox mt-1"
                                />
                                <span>
                                    <span class="font-medium">{{ field.label }}</span>
                                    <span class="block text-xs text-gray-500 dark:text-gray-400">{{ field.description }}</span>
                                </span>
                            </label>
                        </div>
                        <p v-if="createForm.errors.new_type_fields" class="mt-1 text-sm text-red-600">
                            {{ createForm.errors.new_type_fields }}
                        </p>
                    </div>
                    <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                        <input
                            v-model="createForm.new_type_slug_is_multilingual"
                            type="checkbox"
                            class="form-checkbox"
                        />
                        <span class="ml-2">Enable multilingual slugs</span>
                    </label>
                </div>

                <div class="space-y-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4">
                    <label
                        class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300"
                        :class="{ 'opacity-50': !canCreateMenuItem }"
                    >
                        <input
                            v-model="createForm.create_menu_item"
                            type="checkbox"
                            class="form-checkbox"
                            :disabled="!canCreateMenuItem"
                        />
                        <span class="ml-2">Create menu item</span>
                    </label>
                    <p v-if="!canCreateMenuItem" class="text-xs text-gray-500 dark:text-gray-400">
                        Create a CMS menu group first to attach the module.
                    </p>
                    <div v-if="createForm.create_menu_item" class="space-y-4">
                        <div>
                            <label class="form-label">Menu group</label>
                            <select v-model="createForm.menu_group_id" class="form-select" required>
                                <option value="" disabled>Select group</option>
                                <option v-for="group in props.menuGroups" :key="group.id" :value="String(group.id)">
                                    {{ group.title }}
                                </option>
                            </select>
                            <p v-if="createForm.errors.menu_group_id" class="mt-1 text-sm text-red-600">
                                {{ createForm.errors.menu_group_id }}
                            </p>
                        </div>
                        <div>
                            <label class="form-label">Menu item title</label>
                            <input v-model="createForm.menu_item_title" type="text" class="form-input" required />
                            <p v-if="createForm.errors.menu_item_title" class="mt-1 text-sm text-red-600">
                                {{ createForm.errors.menu_item_title }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex items-center justify-between">
                    <button type="button" class="btn-text" @click="closeCreateModal">Cancel</button>
                    <button type="submit" class="btn btn-primary" :disabled="createForm.processing">
                        {{ createForm.processing ? 'Creating…' : 'Create module' }}
                    </button>
                </div>
            </form>
        </ModalDialog>
    </SystemLayout>
</template>
