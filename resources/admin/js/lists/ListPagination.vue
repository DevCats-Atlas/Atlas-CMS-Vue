<script setup>
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { useTranslation } from '@/utils/useTranslation.js';

/** Laravel paginator links (`pagination.links` keep the list's query string). */
const props = defineProps({
    pagination: { type: Object, default: null },
});

const { t } = useTranslation();
const previousUrl = computed(() => props.pagination?.links?.[0]?.url ?? null);
const nextUrl = computed(() => props.pagination?.links?.at(-1)?.url ?? null);
</script>

<template>
    <div v-if="pagination && pagination.total > 0" class="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div class="flex flex-1 justify-between sm:hidden">
            <Link v-if="previousUrl" :href="previousUrl" class="btn-text">{{ t('admin.common.previous') }}</Link>
            <span v-else class="text-gray-400">{{ t('admin.common.previous') }}</span>
            <Link v-if="nextUrl" :href="nextUrl" class="btn-text">{{ t('admin.common.next') }}</Link>
            <span v-else class="text-gray-400">{{ t('admin.common.next') }}</span>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <p class="text-sm text-gray-700 dark:text-gray-300">
                {{ t('admin.lists.showing_range', { from: pagination.from, to: pagination.to, total: pagination.total }) }}
            </p>
            <nav v-if="pagination.last_page > 1" class="isolate inline-flex -space-x-px rounded-md shadow-sm" :aria-label="t('admin.lists.pagination')">
                <Link
                    v-for="link in pagination.links"
                    :key="link.label"
                    :href="link.url || '#'"
                    class="pagination-link"
                    :class="{
                        'pagination-link-inactive': link.url && !link.active,
                        'pagination-link-active': link.active,
                        'pagination-link-disabled': !link.url,
                    }"
                    v-html="link.label"
                />
            </nav>
        </div>
    </div>
</template>
