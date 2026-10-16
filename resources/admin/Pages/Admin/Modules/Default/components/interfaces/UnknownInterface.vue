<script setup>
import { useTranslation } from '@/utils/useTranslation.js';

defineProps({
    field: {
        type: Object,
        required: true,
    },
});

const { t } = useTranslation();
</script>

<template>
    <div class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <p>
            {{ t('admin.interfaces.unsupported', { type: field.type || 'unknown' }) }}
        </p>
    </div>
</template>
