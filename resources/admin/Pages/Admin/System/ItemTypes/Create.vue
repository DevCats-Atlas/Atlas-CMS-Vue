<script setup>
import { Head, Link, useForm } from '@inertiajs/vue3';
import SystemLayout from '@admin/Layouts/SystemLayout.vue';

const props = defineProps({
    fieldOptions: {
        type: Array,
        default: () => [],
    },
});

const form = useForm({
    code: '',
    class_name: '',
    fields: [],
    slug_is_multilingual: false,
});

const submit = () => {
    form.post('/admin/system/item-types');
};
</script>

<template>
    <SystemLayout>
        <Head title="Create Item Type" />

        <div class="py-6">
            <div class="mx-auto max-w-3xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Create item type</h1>
                            <p class="text-gray-500 dark:text-gray-400 mt-1">Define a new polymorphic content type.</p>
                        </div>
                        <Link href="/admin/system/item-types" class="btn-text">
                            Back to list
                        </Link>
                    </div>

                    <form class="space-y-6" @submit.prevent="submit">
                        <div>
                            <label for="code" class="form-label">
                                Code
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
                                Bound class (optional)
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
                                Basic fields
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
                                Enable multilingual slugs for this type
                                <span class="block text-xs text-gray-500 dark:text-gray-400">
                                    Stores language-specific slugs in the slug dictionary.
                                </span>
                            </label>
                        </div>
                    
                        <div class="flex items-center justify-end gap-3">
                            <Link href="/admin/system/item-types" class="btn-text">
                                Cancel
                            </Link>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                :disabled="form.processing"
                            >
                                {{ form.processing ? 'Saving...' : 'Create type' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </SystemLayout>
</template>
