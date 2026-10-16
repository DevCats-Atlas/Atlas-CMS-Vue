<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { ref } from 'vue';
import { router, useForm } from '@inertiajs/vue3';
import ModalDialog from '@/components/ModalDialog.vue';
import TabInterfacesManager from './TabInterfacesManager.vue';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';

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

const { t } = useTranslation();

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
        ? adminUrl(`system/item-types/${props.itemTypeId}/tabs/${editingTab.value.id}`)
        : adminUrl(`system/item-types/${props.itemTypeId}/tabs`);
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
    router.patch(adminUrl(`system/item-types/${props.itemTypeId}/tabs/${tab.id}/toggle-visible`), {}, { preserveScroll: true });
};

const reorderTab = (tab, direction) => {
    router.patch(
        adminUrl(`system/item-types/${props.itemTypeId}/tabs/${tab.id}/reorder`),
        { direction },
        { preserveScroll: true }
    );
};

const deleteTab = async (tab) => {
    const confirmed = await confirmDialog({
        title: t('admin.item_types.delete_tab'),
        message: t('admin.item_types.delete_tab_confirm', { title: tab.title }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });

    if (!confirmed) {
        return;
    }

    router.delete(adminUrl(`system/item-types/${props.itemTypeId}/tabs/${tab.id}`), { preserveScroll: true });
};
</script>

<template>
    <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
        <div class="flex items-start justify-between">
            <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('admin.item_types.tabs') }}</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.item_types.tabs_hint') }}</p>
            </div>
            <button type="button" class="btn btn-primary" @click="openCreateModal">
                {{ t('admin.item_types.add_tab') }}
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
                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('admin.item_types.meta_order', { value: tab.order }) }}</p>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <span
                            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                            :class="tab.visible
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                        >
                            {{ tab.visible ? t('admin.items.visible') : t('admin.items.hidden') }}
                        </span>
                        <button type="button" class="btn btn-outline" :title="t('admin.module_settings.move_up')" @click="reorderTab(tab, 'up')">↑</button>
                        <button type="button" class="btn btn-outline" :title="t('admin.module_settings.move_down')" @click="reorderTab(tab, 'down')">↓</button>
                        <button class="btn btn-outline" @click="toggleTab(tab)">
                            {{ tab.visible ? t('admin.module_settings.hide') : t('admin.module_settings.show') }}
                        </button>
                        <button type="button" class="btn btn-outline" @click="openEditModal(tab)">{{ t('admin.common.edit') }}</button>
                        <button type="button" class="btn btn-outline-danger" @click="deleteTab(tab)">{{ t('admin.common.delete') }}</button>
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
            <p v-if="tabs.length === 0" class="text-sm text-gray-500 dark:text-gray-400">{{ t('admin.item_types.no_tabs') }}</p>
        </section>
    </div>

    <ModalDialog :open="modalOpen" :title="editingTab ? t('admin.item_types.edit_tab') : t('admin.item_types.create_tab')" @close="closeModal">
        <form class="space-y-4" @submit.prevent="submit">
            <div>
                <label class="form-label">{{ t('admin.item_types.tab_title') }}</label>
                <input v-model="form.title" type="text" class="form-input" required />
                <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">{{ form.errors.title }}</p>
            </div>
            <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input v-model="form.visible" type="checkbox" class="form-checkbox" />
                <span class="ml-2">{{ t('admin.items.visible') }}</span>
            </label>
            <div class="actions-footer">
                <button type="button" class="btn-text" @click="closeModal">{{ t('admin.common.cancel') }}</button>
                <button type="submit" class="btn btn-primary" :disabled="form.processing">
                    {{ form.processing ? (editingTab ? t('admin.users.saving') : t('admin.items.creating')) : (editingTab ? t('admin.item_types.save_tab') : t('admin.item_types.create_tab')) }}
                </button>
            </div>
        </form>
    </ModalDialog>
</template>
