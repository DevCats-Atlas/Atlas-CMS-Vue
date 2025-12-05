<script setup>
import { ref } from 'vue';
import { router, useForm } from '@inertiajs/vue3';
import ModalDialog from '@/components/ModalDialog.vue';
import TabInterfacesManager from './TabInterfacesManager.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';

const props = defineProps({
    itemTypeId: {
        type: Number,
        required: true,
    },
    tabs: {
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
const editingTab = ref(null);

const form = useForm({
    title: '',
    visible: true,
});

const openCreateModal = () => {
    resetForm();
    modalOpen.value = true;
};

const openEditModal = (tab) => {
    editingTab.value = tab;
    form.title = tab.title;
    form.visible = tab.visible;
    modalOpen.value = true;
};

const closeModal = () => {
    resetForm();
    modalOpen.value = false;
};

const resetForm = () => {
    form.reset();
    form.visible = true;
    editingTab.value = null;
};

const submit = () => {
    const url = editingTab.value
        ? `/admin/system/item-types/${props.itemTypeId}/tabs/${editingTab.value.id}`
        : `/admin/system/item-types/${props.itemTypeId}/tabs`;
    if (editingTab.value) {
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

const toggleTab = (tab) => {
    router.patch(`/admin/system/item-types/${props.itemTypeId}/tabs/${tab.id}/toggle-visible`, {}, { preserveScroll: true });
};

const reorderTab = (tab, direction) => {
    router.patch(
        `/admin/system/item-types/${props.itemTypeId}/tabs/${tab.id}/reorder`,
        { direction },
        { preserveScroll: true }
    );
};

const deleteTab = async (tab) => {
    const confirmed = await confirmDialog({
        title: 'Delete tab',
        message: `Delete tab "${tab.title}"?`,
        confirmLabel: 'Delete',
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(`/admin/system/item-types/${props.itemTypeId}/tabs/${tab.id}`, { preserveScroll: true });
};
</script>

<template>
    <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
            <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tabs</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">Group custom fields inside logical sections.</p>
            </div>
            <button type="button" class="btn btn-primary" @click="openCreateModal">
                Add tab
            </button>
        </div>

        <section class="space-y-3">
            <div
                v-for="tab in tabs"
                :key="tab.id"
                class="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-4 bg-gray-50 dark:bg-gray-800"
            >
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p class="text-base font-semibold text-gray-900 dark:text-white">{{ tab.title }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Order {{ tab.order }}</p>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <span
                            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                            :class="tab.visible
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                        >
                            {{ tab.visible ? 'Visible' : 'Hidden' }}
                        </span>
                        <button class="btn btn-outline" @click="reorderTab(tab, 'up')">↑</button>
                        <button class="btn btn-outline" @click="reorderTab(tab, 'down')">↓</button>
                        <button class="btn btn-outline" @click="toggleTab(tab)">
                            {{ tab.visible ? 'Hide' : 'Show' }}
                        </button>
                        <button class="btn btn-outline" @click="openEditModal(tab)">Edit</button>
                        <button class="btn btn-outline-danger" @click="deleteTab(tab)">Delete</button>
                    </div>
                </div>
                <TabInterfacesManager
                    :item-type-id="itemTypeId"
                    :tab-id="tab.id"
                    :interfaces="tab.interfaces || []"
                    :interface-options="interfaceOptions"
                    :item-type-choices="itemTypeChoices"
                />
            </div>
            <p v-if="tabs.length === 0" class="text-sm text-gray-500 dark:text-gray-400">No tabs yet.</p>
        </section>
    </div>

    <ModalDialog :open="modalOpen" :title="editingTab ? 'Edit tab' : 'Create tab'" @close="closeModal">
        <form class="space-y-4" @submit.prevent="submit">
            <div>
                <label class="form-label">Tab title</label>
                <input v-model="form.title" type="text" class="form-input" required />
                <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">{{ form.errors.title }}</p>
            </div>
            <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input v-model="form.visible" type="checkbox" class="form-checkbox" />
                <span class="ml-2">Visible</span>
            </label>
            <div class="flex items-center justify-end gap-3">
                <button type="button" class="btn-text" @click="closeModal">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="form.processing">
                    {{ form.processing ? (editingTab ? 'Saving…' : 'Creating…') : (editingTab ? 'Save tab' : 'Create tab') }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>
