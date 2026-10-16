<script setup>
import { useTranslation } from '@/utils/useTranslation.js';

/** Search card above a list; `search` is the object returned by useListSearch(). */
defineProps({
    search: { type: Object, required: true },
    active: { type: Boolean, default: false },
    heading: { type: String, required: true },
    placeholder: { type: String, default: '' },
    hint: { type: String, default: '' },
});

const { t } = useTranslation();
</script>

<template>
    <section class="section">
        <h2 class="section-heading">{{ heading }}</h2>
        <form class="space-y-4" @submit.prevent="search.perform">
            <div>
                <label class="form-label">{{ t('admin.common.search') }}</label>
                <div class="flex items-center gap-2">
                    <div class="flex-1">
                        <input v-model="search.form.search" type="text" class="form-input" :placeholder="placeholder" />
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="submit" class="btn btn-primary" :disabled="search.form.processing">
                            {{ search.form.processing ? t('admin.lists.searching') : t('admin.common.search') }}
                        </button>
                        <button v-if="active" type="button" class="btn btn-outline" @click="search.clear">
                            {{ t('admin.common.clear') }}
                        </button>
                    </div>
                </div>
                <p v-if="hint" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ hint }}</p>
            </div>
        </form>
    </section>
</template>
