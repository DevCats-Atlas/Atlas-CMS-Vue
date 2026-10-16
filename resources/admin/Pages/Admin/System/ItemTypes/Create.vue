<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { Head, Link, useForm } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const props = defineProps({
    fieldOptions: {
        type: Array,
        default: () => [],
    },
});

const { t } = useTranslation();

const form = useForm({
    code: '',
    class_name: '',
    fields: [],
    slug_is_multilingual: false,
});

const submit = () => {
    form.post(adminUrl('system/item-types'));
};
</script>

<template>
    <SystemLayout>
        <Head :title="t('admin.item_types.create_title')" />

        <div class="py-6">
            <div class="mx-auto max-w-3xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h1 class="heading-1">{{ t('admin.item_types.create_title') }}</h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-1">{{ t('admin.item_types.create_hint') }}</p>
                        </div>
                        <Link :href="adminUrl('system/item-types')" class="btn-text">
                            {{ t('admin.users.back_to_list') }}
                        </Link>
                    </div>

                    <form class="space-y-6" @submit.prevent="submit">
                        <div>
                            <label for="code" class="form-label">
                                {{ t('admin.item_types.code') }}
                            </label>
                            <input
                                id="code"
                                v-model="form.code"
                                type="text"
                                class="form-input"
                                required
                            />
                            <p v-if="form.errors.code" class="mt-1 text-sm text-red-600">{{ form.errors.code }}</p>
                        </div>

                        <div>
                            <label for="class_name" class="form-label">
                                {{ t('admin.item_types.bound_class_optional') }}
                            </label>
                            <input
                                id="class_name"
                                v-model="form.class_name"
                                type="text"
                                class="form-input"
                            />
                            <p v-if="form.errors.class_name" class="mt-1 text-sm text-red-600">{{ form.errors.class_name }}</p>
                        </div>

                        <fieldset>
                            <legend class="form-label mb-2">
                                {{ t('admin.item_types.basic_fields') }}
                            </legend>
                            <div class="space-y-3">
                                <label
                                    v-for="field in props.fieldOptions"
                                    :key="field.value"
                                    class="flex items-start gap-3"
                                >
                                    <input
                                        v-model="form.fields"
                                        type="checkbox"
                                        :value="field.value"
                                        class="form-checkbox mt-1"
                                    />
                                    <span>
                                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ field.label }}</span>
                                        <span class="block text-xs text-gray-500 dark:text-gray-400">{{ field.description }}</span>
                                    </span>
                                </label>
                            </div>
                            <p v-if="form.errors.fields" class="mt-2 text-sm text-red-600">{{ form.errors.fields }}</p>
                        </fieldset>

                        <div class="flex items-start gap-3">
                            <input
                                id="slug_is_multilingual"
                                v-model="form.slug_is_multilingual"
                                type="checkbox"
                                class="form-checkbox mt-1"
                            />
                            <label for="slug_is_multilingual" class="form-label">
                                {{ t('admin.item_types.multilingual_slugs') }}
                                <span class="block text-xs text-gray-500 dark:text-gray-400">
                                    {{ t('admin.item_types.multilingual_slugs_hint') }}
                                </span>
                            </label>
                        </div>
                    
                        <div class="actions-footer">
                            <Link :href="adminUrl('system/item-types')" class="btn-text">
                                {{ t('admin.common.cancel') }}
                            </Link>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="form.processing"
                            >
                                {{ form.processing ? t('admin.users.saving') : t('admin.item_types.create_type') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </SystemLayout>
</template>
