<script setup>
import { ref } from 'vue';
import { router, useForm } from '@inertiajs/vue3';
import { adminUrl } from '@/utils/adminUrl';
import { confirmDialog } from '@/utils/confirmDialog.js';
import { useTranslation } from '@/utils/useTranslation.js';

/** Module actions: create, rename, show/hide, reorder and delete; each change is saved at once. */
const props = defineProps({
    moduleId: { type: [Number, String], required: true },
    actions: { type: Array, default: () => [] },
});

const { t } = useTranslation();
const form = useForm({ title: '', visible: true });
const editingId = ref(null);

const startEdit = (action) => {
    editingId.value = action.id;
    form.title = action.title;
    form.visible = action.visible;
};

const cancelEdit = () => {
    editingId.value = null;
    form.reset();
};

const submit = () => {
    if (editingId.value) {
        form.put(adminUrl(`system/modules/actions/${editingId.value}`), { preserveScroll: true, onSuccess: cancelEdit });
    } else {
        form.post(adminUrl(`system/modules/${props.moduleId}/actions`), { preserveScroll: true, onSuccess: () => form.reset() });
    }
};

const remove = async (action) => {
    const confirmed = await confirmDialog({
        title: t('admin.modules.delete_action'),
        message: t('admin.modules.delete_action_confirm', { title: action.title }),
        confirmLabel: t('admin.common.delete'),
        intent: 'danger',
    });
    if (confirmed) {
        router.delete(adminUrl(`system/modules/actions/${action.id}`), { preserveScroll: true });
    }
};

const toggle = (action) => router.patch(adminUrl(`system/modules/actions/${action.id}/toggle-visible`), {}, { preserveScroll: true });
const reorder = (action, direction) => router.patch(adminUrl(`system/modules/actions/${action.id}/reorder`), { direction }, { preserveScroll: true });
</script>

<template>
    <div class="section">
        <div class="flex items-center justify-between">
            <h2 class="section-heading">{{ t('admin.module_settings.actions') }}</h2>
            <button v-if="editingId" type="button" class="btn-text" @click="cancelEdit">{{ t('admin.module_settings.cancel_edit') }}</button>
        </div>

        <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submit">
            <div>
                <label class="form-label">{{ t('admin.common.title_label') }}</label>
                <input v-model="form.title" type="text" class="form-input" required />
                <p v-if="form.errors.title" class="mt-1 text-sm text-red-600">{{ form.errors.title }}</p>
            </div>
            <div class="flex items-center gap-4">
                <label class="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input v-model="form.visible" type="checkbox" class="form-checkbox" />
                    <span class="ml-2">{{ t('admin.items.visible') }}</span>
                </label>
                <button type="submit" class="btn btn-primary" :disabled="form.processing">
                    {{ form.processing ? t('admin.users.saving') : (editingId ? t('admin.module_settings.save_action') : t('admin.module_settings.create_action')) }}
                </button>
            </div>
        </form>

        <div class="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div v-for="action in actions" :key="action.id" class="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-sm">
                <p class="font-medium text-gray-900 dark:text-white">{{ action.title }}</p>
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        :class="action.visible
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                    >
                        {{ action.visible ? t('admin.items.visible') : t('admin.items.hidden') }}
                    </span>
                    <button type="button" class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" :title="t('admin.module_settings.move_up')" @click="reorder(action, 'up')">↑</button>
                    <button type="button" class="px-2 py-1 rounded border border-gray-300 dark:border-gray-600" :title="t('admin.module_settings.move_down')" @click="reorder(action, 'down')">↓</button>
                    <button type="button" class="btn btn-outline" @click="toggle(action)">
                        {{ action.visible ? t('admin.module_settings.hide') : t('admin.module_settings.show') }}
                    </button>
                    <button type="button" class="btn btn-outline" @click="startEdit(action)">{{ t('admin.common.edit') }}</button>
                    <button type="button" class="btn btn-outline-danger" @click="remove(action)">{{ t('admin.common.delete') }}</button>
                </div>
            </div>
            <p v-if="actions.length === 0" class="text-sm text-gray-500 dark:text-gray-400 px-4 py-3">{{ t('admin.module_settings.no_actions') }}</p>
        </div>
    </div>
</template>
