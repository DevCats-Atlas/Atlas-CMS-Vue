<script setup>
import { computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: [Boolean, String, Number],
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    size: {
        type: String,
        default: 'md', // 'sm', 'md', 'lg'
        validator: (value) => ['sm', 'md', 'lg'].includes(value),
    },
});

const emit = defineEmits(['update:modelValue']);

const isChecked = computed({
    get: () => {
        if (typeof props.modelValue === 'boolean') {
            return props.modelValue;
        }
        if (typeof props.modelValue === 'string') {
            return props.modelValue === '1' || props.modelValue === 'true' || props.modelValue === 'on';
        }
        if (typeof props.modelValue === 'number') {
            return props.modelValue === 1;
        }
        return !!props.modelValue;
    },
    set: (value) => {
        emit('update:modelValue', value);
    },
});

const toggleSize = computed(() => {
    const sizes = {
        sm: {
            track: 'h-4 w-7',
            thumb: 'h-3 w-3',
            translate: 'translate-x-3',
        },
        md: {
            track: 'h-5 w-9',
            thumb: 'h-4 w-4',
            translate: 'translate-x-4',
        },
        lg: {
            track: 'h-6 w-11',
            thumb: 'h-5 w-5',
            translate: 'translate-x-5',
        },
    };
    return sizes[props.size] || sizes.md;
});

const handleClick = () => {
    if (!props.disabled) {
        isChecked.value = !isChecked.value;
    }
};
</script>

<template>
    <button
        type="button"
        role="switch"
        :aria-checked="isChecked"
        :disabled="disabled"
        :class="[
            'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
            toggleSize.track,
            isChecked
                ? 'bg-indigo-600 dark:bg-indigo-500'
                : 'bg-gray-200 dark:bg-gray-700',
            disabled && 'opacity-50 cursor-not-allowed',
        ]"
        @click="handleClick"
    >
        <span
            :class="[
                'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out',
                toggleSize.thumb,
                isChecked ? toggleSize.translate : 'translate-x-0',
            ]"
        />
    </button>
</template>
