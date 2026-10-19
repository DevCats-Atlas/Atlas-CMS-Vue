<script setup>
import { computed, ref } from 'vue';
import { Head, useForm } from '@inertiajs/vue3';
import axios from 'axios';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { adminUrl } from '@/utils/adminUrl';
import { useTranslation } from '@/utils/useTranslation.js';

const props = defineProps({
    title: { type: String, default: '' },
    // [{ handle, source, type, reason: string|null }]
    modules: { type: Array, default: () => [] },
});
const { t } = useTranslation();
const form = useForm({ name: '', modules: [] });
const search = ref('');
const busy = ref(false);
const downloaded = ref(false);
const visibleModules = computed(() => props.modules.filter(module => `${module.handle} ${module.type || ''}`.toLowerCase().includes(search.value.toLowerCase())));

async function download() {
    if (busy.value || !form.modules.length) return;
    busy.value = true;
    downloaded.value = false;
    form.clearErrors();
    try {
        // Axios sends Laravel's XSRF cookie. Binary responses bypass Inertia's page protocol.
        const response = await axios.post(adminUrl('system/structure/export'), form.data(), {
            responseType: 'blob', headers: { Accept: 'application/json' },
        });
        const disposition = response.headers['content-disposition'] || '';
        const filename = disposition.match(/filename="([a-z0-9_]+\.json)"/i)?.[1];
        if (!filename || !disposition.startsWith('attachment;')) throw new Error('Invalid attachment');
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        downloaded.value = true;
    } catch (error) {
        let payload;
        try {
            payload = JSON.parse(await error.response.data.text());
        } catch { /* Network failures and non-JSON responses use the translated fallback. */ }
        if (payload?.errors) {
            for (const [key, messages] of Object.entries(payload.errors)) {
                form.setError(key.startsWith('modules.') ? 'modules' : key, Array.isArray(messages) ? messages[0] : messages);
            }
        } else {
            form.setError('modules', payload?.error || t('admin.structure.request_failed'));
        }
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <SystemLayout>
        <Head :title="title" />
        <div class="py-6 mx-auto max-w-4xl sm:px-6 lg:px-8">
            <form class="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow" @submit.prevent="download">
                <div>
                    <h1 class="heading-1">{{ title }}</h1>
                    <p class="mt-2 text-gray-500 dark:text-gray-400">{{ t('admin.structure.hint') }}</p>
                </div>
                <div>
                    <label for="structure-name" class="form-label">{{ t('admin.structure.name') }}</label>
                    <input id="structure-name" translate="no" v-model="form.name" class="form-input w-full" required maxlength="80" pattern="[a-z][a-z0-9_]*" placeholder="add_blog" :disabled="busy" />
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{{ t('admin.structure.name_hint') }}</p>
                    <p v-if="form.errors.name" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{{ form.errors.name }}</p>
                </div>
                <fieldset :disabled="busy" class="space-y-3">
                    <legend class="form-label">{{ t('admin.structure.modules') }}</legend>
                    <label for="structure-search" class="sr-only">{{ t('admin.structure.search') }}</label>
                    <input id="structure-search" v-model="search" type="search" class="form-input w-full" :placeholder="t('admin.structure.search')" />
                    <div class="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                        <label v-for="module in visibleModules" :key="module.handle" class="flex items-start gap-3 py-3" :class="{ 'opacity-60': module.reason }">
                            <input v-model="form.modules" type="checkbox" :value="module.handle" :disabled="Boolean(module.reason)" class="form-checkbox mt-1" />
                            <span>
                                <span class="block font-medium text-gray-900 dark:text-white">{{ module.handle }}</span>
                                <span class="text-sm text-gray-500 dark:text-gray-400">{{ module.source }}<template v-if="module.type"> · {{ module.type }}</template><template v-if="module.reason"> — {{ module.reason }}</template></span>
                            </span>
                        </label>
                        <p v-if="!visibleModules.length" class="py-4 text-gray-500 dark:text-gray-400">{{ t('admin.structure.empty') }}</p>
                    </div>
                </fieldset>
                <p v-if="form.errors.modules" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{{ form.errors.modules }}</p>
                <p v-if="downloaded" class="text-sm text-green-700 dark:text-green-400" role="status">{{ t('admin.structure.downloaded') }}</p>
                <button type="submit" class="btn btn-primary" :disabled="busy || !form.modules.length">
                    {{ t(busy ? 'admin.structure.downloading' : 'admin.structure.download') }}
                </button>
            </form>
        </div>
    </SystemLayout>
</template>
