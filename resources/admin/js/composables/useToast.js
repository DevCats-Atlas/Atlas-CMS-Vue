import { ref } from 'vue';

const toasts = ref([]);
let nextId = 1;

const showToast = ({ title = 'Notification', message = '', intent = 'default', duration = 4000 } = {}) => {
    const id = nextId++;
    const toast = {
        id,
        title,
        message,
        intent,
    };

    toasts.value.push(toast);

    if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
    }

    return id;
};

const dismissToast = (id) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
};

export const useToast = () => ({
    toasts,
    showToast,
    dismissToast,
});
