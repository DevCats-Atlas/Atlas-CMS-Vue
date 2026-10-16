<script setup>
import { useTranslation } from '@/utils/useTranslation.js';

/** List heading with the bulk delete button for selected rows; extra buttons go in the default slot. */
defineProps({
    heading: { type: String, required: true },
    selectedCount: { type: Number, default: 0 },
    deleting: { type: Boolean, default: false },
});
defineEmits(['delete-selected']);

const { t } = useTranslation();
</script>

<template>
    <div class="flex items-center justify-between">
        <h2 class="section-heading">{{ heading }}</h2>
        <div class="flex items-center gap-3">
            <button
                v-if="selectedCount > 0"
                type="button"
                class="btn btn-outline-danger"
                :disabled="deleting"
                @click="$emit('delete-selected')"
            >
                {{ deleting ? t('admin.lists.deleting') : t('admin.lists.delete_selected', { count: selectedCount }) }}
            </button>
            <slot />
        </div>
    </div>
</template>
