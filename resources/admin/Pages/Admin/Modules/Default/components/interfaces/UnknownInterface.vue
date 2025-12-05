<script setup>
defineProps({
    field: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <div class="space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <p>
            Interface <span class="font-mono">{{ field.type || 'unknown' }}</span> is not supported yet.
        </p>
    </div>
</template>
