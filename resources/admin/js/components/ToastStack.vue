<script setup>
const props = defineProps({
    toasts: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(['dismiss']);

const intentClasses = {
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-gray-900',
    info: 'bg-blue-600 text-white',
    default: 'bg-gray-800 text-white',
};

const resolveIntent = (intent) => intentClasses[intent] ?? intentClasses.default;
</script>

<template>
    <transition-group
        name="toast"
        tag="div"
        class="fixed inset-x-0 top-4 z-[1100] flex flex-col items-center gap-3 px-4 sm:items-end sm:pr-6 pointer-events-none"
    >
        <div
            v-for="toast in props.toasts"
            :key="toast.id"
            class="pointer-events-auto w-full max-w-sm rounded-xl shadow-lg ring-1 ring-black/10 overflow-hidden"
        >
            <div :class="['px-4 py-3 flex items-start gap-3', resolveIntent(toast.intent)]">
                <div class="flex-1">
                    <p class="text-sm font-semibold leading-5">{{ toast.title }}</p>
                    <p v-if="toast.message" class="mt-1 text-sm leading-5 opacity-90">{{ toast.message }}</p>
                </div>
                <button
                    type="button"
                    class="text-sm font-medium opacity-80 hover:opacity-100"
                    @click="emit('dismiss', toast.id)"
                >
                    ✕
                </button>
            </div>
        </div>
    </transition-group>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
    transition: all 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateY(-12px);
}
</style>
