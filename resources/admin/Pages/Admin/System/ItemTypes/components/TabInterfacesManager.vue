<script setup>
import { ref, computed, watch } from 'vue';
import { router, useForm } from '@inertiajs/vue3';
import ModalDialog from '@/components/ModalDialog.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    itemTypeId: {
        type: Number,
        required: true,
    },
    tabId: {
        type: Number,
        required: true,
    },
    interfaces: {
        type: Array,
        default: () => [],
    },
    interfaceOptions: {
        type: Array,
        default: () => [],
    },
    itemTypeChoices: {
        type: Array,
        default: () => [],
    },
});

const modalOpen = ref(false);
const editingField = ref(null);

const form = useForm({
    title: '',
    visible: true,
    hide_title: false,
    type: '',
    node: '',
    multilanguage: false,
    related_item_type_id: '',
    view_type: 'list',
    root_id: '',
    relationship: '',
    with_children: false,
    filter_item_type_id: '',
    list_type: '',
    options_raw: '',
    select_root_id: '',
    select_item_type_id: '',
    interface_path: '',
});

const optionMap = computed(() => {
    const map = {};
    props.interfaceOptions.forEach((option) => {
        map[option.value] = option.label;
    });
    return map;
});

const itemTypeChoices = computed(() => props.itemTypeChoices || []);

watch(
    () => form.type,
    (type) => {
        if (type === 'children' && !form.view_type) {
            form.view_type = 'list';
        }

        if (type === 'children' && !form.related_item_type_id && itemTypeChoices.value.length) {
            form.related_item_type_id = String(itemTypeChoices.value[0].id);
        }

        if (type !== 'children') {
            form.related_item_type_id = '';
            form.view_type = 'list';
        }

        if (!['text', 'file', 'date', 'select', 'textarea', 'wysiwyg'].includes(type)) {
            form.node = '';
            form.multilanguage = false;
        }

        if (type !== 'categories') {
            form.root_id = '';
            form.relationship = '';
            form.with_children = false;
            form.filter_item_type_id = '';
        }

        if (type === 'select' && !form.list_type) {
            form.list_type = 'static';
        }

        if (type !== 'select') {
            form.list_type = '';
            form.options_raw = '';
            form.select_root_id = '';
            form.select_item_type_id = '';
        }

        if (type !== 'custom') {
            form.interface_path = '';
        }
    },
);

watch(
    () => form.list_type,
    (value) => {
        if (form.type !== 'select') {
            return;
        }

        if (value === 'static') {
            form.select_root_id = '';
        } else if (value === 'dynamic') {
            form.options_raw = '';
        }
    },
);

const openCreateModal = () => {
    resetForm();
    form.type = props.interfaceOptions[0]?.value || '';
    form.node = '';
    form.multilanguage = false;
    form.hide_title = false;
    form.related_item_type_id = '';
    form.view_type = 'list';
    form.root_id = '';
    form.relationship = '';
    form.with_children = false;
    form.filter_item_type_id = '';
    form.list_type = 'static';
    form.options_raw = '';
    form.select_root_id = '';
    form.select_item_type_id = '';
    form.interface_path = '';
    modalOpen.value = true;
};

const openEditModal = (field) => {
    editingField.value = field;
    form.title = field.title;
    form.visible = field.visible;
    form.hide_title = field.hide_title || false;
    form.type = field.type;
    form.node = field.node || '';
    form.multilanguage = field.multilanguage || false;
    form.related_item_type_id = field.related_item_type_id ? String(field.related_item_type_id) : '';
    form.view_type = field.view_type || 'list';
    form.root_id = field.root_id || '';
    form.relationship = field.relationship || '';
    form.with_children = field.with_children || false;
    form.filter_item_type_id = field.filter_item_type_id ? String(field.filter_item_type_id) : '';
    form.list_type = field.list_type || 'static';
    form.options_raw = field.options_raw || '';
    form.select_root_id = field.select_root_id || '';
    form.select_item_type_id = field.select_item_type_id ? String(field.select_item_type_id) : '';
    form.interface_path = field.interface_path || '';
    modalOpen.value = true;
};

const closeModal = () => {
    resetForm();
    modalOpen.value = false;
};

const resetForm = () => {
    form.reset();
    form.visible = true;
    form.hide_title = false;
    form.type = '';
    form.node = '';
    form.multilanguage = false;
    form.related_item_type_id = '';
    form.view_type = 'list';
    form.root_id = '';
    form.relationship = '';
    form.with_children = false;
    form.filter_item_type_id = '';
    form.list_type = '';
    form.options_raw = '';
    form.select_root_id = '';
    form.interface_path = '';
    editingField.value = null;
};

const submit = () => {
    const url = editingField.value
        ? `/admin/system/item-types/${props.itemTypeId}/tabs/${props.tabId}/interfaces/${editingField.value.id}`
        : `/admin/system/item-types/${props.itemTypeId}/tabs/${props.tabId}/interfaces`;

    if (editingField.value) {
        form.put(url, {
            preserveScroll: true,
            onSuccess: () => closeModal(),
        });
    } else {
        form.post(url, {
            preserveScroll: true,
            onSuccess: () => closeModal(),
        });
    }
};

const toggleInterface = (field) => {
    router.patch(
        `/admin/system/item-types/${props.itemTypeId}/tabs/${props.tabId}/interfaces/${field.id}/toggle-visible`,
        {},
        { preserveScroll: true }
    );
};

const reorderInterface = (field, direction) => {
    router.patch(
        `/admin/system/item-types/${props.itemTypeId}/tabs/${props.tabId}/interfaces/${field.id}/reorder`,
        { direction },
        { preserveScroll: true }
    );
};

const deleteInterface = async (field) => {
    const confirmed = await confirmDialog({
        title: 'Delete field',
        message: `Delete interface "${field.title}"?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(
        `/admin/system/item-types/${props.itemTypeId}/tabs/${props.tabId}/interfaces/${field.id}`,
        { preserveScroll: true }
    );
};
</script>

<template>
    <div class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Interfaces</h3>
            <button type="button" class="btn btn-primary" @click="openCreateModal">
                Add interface
            </button>
       </div>

        <div
            v-for="field in interfaces"
            :key="field.id"
            class="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-2 "
        >
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ field.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ optionMap[field.type] || 'Custom' }} · Order {{ field.order }}
                        <span v-if="field.node">· Node {{ field.node }}</span>
                        <span v-if="field.related_item_type_label">· Linked type {{ field.related_item_type_label }}</span>
                        <span v-if="field.view_type">· View {{ field.view_type }}</span>
                        <span v-if="field.root_id">· Root {{ field.root_id }}</span>
                        <span v-if="field.relationship">· Relationship {{ field.relationship }}</span>
                        <span v-if="field.type === 'categories' && field.filter_item_type_id">· Filter type {{ field.filter_item_type_label || field.filter_item_type_id }}</span>
                        <span v-if="field.type === 'categories' && field.with_children">· With children</span>
                        <span v-if="field.type === 'select' && field.list_type === 'static'">
                            · Static select ({{ field.options?.length || 0 }} options)
                        </span>
                        <span v-if="field.type === 'select' && field.list_type === 'dynamic' && field.select_root_id">
                            · Dynamic select root {{ field.select_root_id }}
                            <span v-if="field.select_item_type_id">· Filter type {{ field.select_item_type_label || field.select_item_type_id }}</span>
                        </span>
                    </p>
                </div>
                <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="field.visible
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                >
                    {{ field.visible ? 'Visible' : 'Hidden' }}
                </span>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-sm">
                <button class="btn btn-outline" @click="reorderInterface(field, 'up')">↑</button>
                <button class="btn btn-outline" @click="reorderInterface(field, 'down')">↓</button>
                <button class="btn btn-outline" @click="toggleInterface(field)">
                    {{ field.visible ? 'Hide' : 'Show' }}
                </button>
                <button class="btn btn-outline" @click="openEditModal(field)">Edit</button>
                <button class="btn btn-outline-danger" @click="deleteInterface(field)">Delete</button>
            </div>
        </div>
        <p v-if="interfaces.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No interfaces yet.</p>
    </div>

    <ModalDialog :open="modalOpen" :title="editingField ? 'Edit interface' : 'Create interface'" @close="closeModal">
        <form class="space-y-4" @submit.prevent="submit">
            <div>
                <label class="form-label">Title</label>
                <input v-model="form.title" type="text" class="form-input" required />
                <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">{{ form.errors.title }}</p>
            </div>
            <div>
                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input v-model="form.hide_title" type="checkbox" class="form-checkbox" />
                    <span class="ml-2">Hide title</span>
                </label>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    When enabled, the field title will not be displayed when rendering this interface.
                </p>
            </div>
            <div>
                <label class="form-label">Interface type</label>
                <select v-model="form.type" class="form-select" required>
                    <option value="" disabled>Select type</option>
                    <option v-for="option in interfaceOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <p v-if="form.errors.type" class="mt-1 text-sm text-red-600">{{ form.errors.type }}</p>
            </div>
            <div v-if="['text', 'file', 'date', 'select', 'textarea', 'wysiwyg'].includes(form.type)">
                <label class="form-label">Node</label>
                <input v-model="form.node" type="text" class="form-input" required />
                <p v-if="form.errors.node" class="mt-1 text-sm text-red-600">{{ form.errors.node }}</p>
            </div>
            <div class="flex gap-3">
                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input v-model="form.visible" type="checkbox" class="form-checkbox" />
                    <span class="ml-2">Visible</span>
                </label>
                <label
                    v-if="['text', 'file', 'date', 'select', 'textarea', 'wysiwyg'].includes(form.type)"
                    class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300"
                >
                    <input v-model="form.multilanguage" type="checkbox" class="form-checkbox" />
                    <span class="ml-2">Multilanguage</span>
                </label>
            </div>
            <div v-if="form.type === 'select'" class="space-y-4">
                <div>
                    <label class="form-label">List type</label>
                    <select v-model="form.list_type" class="form-select" required>
                        <option value="static">Static list</option>
                        <option value="dynamic">Dynamic (linked)</option>
                    </select>
                    <p v-if="form.errors.list_type" class="mt-1 text-sm text-red-600">
                        {{ form.errors.list_type }}
                    </p>
                </div>
                <div v-if="form.list_type === 'static'">
                    <label class="form-label">Options</label>
                    <textarea
                        v-model="form.options_raw"
                        rows="4"
                        class="form-input"
                        placeholder="key=Label"
                        required
                    ></textarea>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Enter one option per line using the format <code>key=Label</code>.
                    </p>
                    <p v-if="form.errors.options_raw" class="mt-1 text-sm text-red-600">
                        {{ form.errors.options_raw }}
                    </p>
                </div>
                <div v-else-if="form.list_type === 'dynamic'" class="space-y-4">
                    <div>
                        <label class="form-label">Root ID</label>
                        <input v-model="form.select_root_id" type="text" class="form-input" required />
                        <p v-if="form.errors.select_root_id" class="mt-1 text-sm text-red-600">
                            {{ form.errors.select_root_id }}
                        </p>
                    </div>
                    <div>
                        <label class="form-label">Item type</label>
                        <select v-model="form.select_item_type_id" class="form-select">
                            <option value="">All item types</option>
                            <option v-for="type in itemTypeChoices" :key="type.id" :value="String(type.id)">
                                {{ type.label }}
                            </option>
                        </select>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Filter items by item type. Leave empty to show all items.
                        </p>
                        <p v-if="form.errors.select_item_type_id" class="mt-1 text-sm text-red-600">
                            {{ form.errors.select_item_type_id }}
                        </p>
                    </div>
                </div>
            </div>
            <div v-if="form.type === 'children'" class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="form-label">Item type</label>
                    <select v-model="form.related_item_type_id" class="form-select" required>
                        <option value="" disabled>Select item type</option>
                        <option v-for="type in itemTypeChoices" :key="type.id" :value="String(type.id)">
                            {{ type.label }}
                        </option>
                    </select>
                    <p v-if="form.errors.related_item_type_id" class="mt-1 text-sm text-red-600">
                        {{ form.errors.related_item_type_id }}
                    </p>
                </div>
                <div>
                    <label class="form-label">View type</label>
                    <select v-model="form.view_type" class="form-select" required>
                        <option value="list">List</option>
                        <option value="gallery">Gallery</option>
                    </select>
                </div>
            </div>
            <div v-if="form.type === 'categories'" class="grid gap-4 md:grid-cols-2">
                <div>
                    <label class="form-label">Root ID</label>
                    <input v-model="form.root_id" type="text" class="form-input" required />
                    <p v-if="form.errors.root_id" class="mt-1 text-sm text-red-600">
                        {{ form.errors.root_id }}
                    </p>
                </div>
                <div>
                    <label class="form-label">Item Type</label>
                    <select v-model="form.filter_item_type_id" class="form-select">
                        <option value="">All item types</option>
                        <option v-for="type in itemTypeChoices" :key="type.id" :value="String(type.id)">
                            {{ type.label }}
                        </option>
                    </select>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Filter categories to only show items of the selected type. Leave empty to show all types.
                    </p>
                    <p v-if="form.errors.filter_item_type_id" class="mt-1 text-sm text-red-600">
                        {{ form.errors.filter_item_type_id }}
                    </p>
                </div>
                <div>
                    <label class="form-label">Relationship</label>
                    <input v-model="form.relationship" type="text" class="form-input" required />
                    <p v-if="form.errors.relationship" class="mt-1 text-sm text-red-600">
                        {{ form.errors.relationship }}
                    </p>
                </div>
                <div class="md:col-span-2">
                    <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                        <input v-model="form.with_children" type="checkbox" class="form-checkbox" />
                        <span class="ml-2">With children</span>
                    </label>
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        When enabled, this interface will list all descendants of the configured root item (not just direct children).
                    </p>
                </div>
            </div>
            <div v-if="form.type === 'custom'">
                <label class="form-label">Interface Path</label>
                <input v-model="form.interface_path" type="text" class="form-input" required />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The path to the custom interface component relative to <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">resources/admin/Custom/Interfaces/</code>.
                    <br />
                    Example: If you enter <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Posts/Analytics</code>, the system will load the component from <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">resources/admin/Custom/Interfaces/Posts/Analytics.vue</code>.
                </p>
                <p v-if="form.errors.interface_path" class="mt-1 text-sm text-red-600">
                    {{ form.errors.interface_path }}
                </p>
            </div>
            <div class="actions-footer">
                <button type="button" class="btn-text" @click="closeModal">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="form.processing">
                    {{ form.processing ? (editingField ? 'Saving…' : 'Creating…') : (editingField ? 'Save interface' : 'Create interface') }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>
