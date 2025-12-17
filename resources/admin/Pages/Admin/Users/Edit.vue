<script setup>
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { ref, computed, watch } from 'vue';
import ToastStack from '@/components/ToastStack.vue';
import { useToast } from '@/composables/useToast.js';
import CustomFieldsTab from '@admin/Pages/Admin/Modules/Default/components/CustomFieldsTab.vue';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();

const props = defineProps({
    title: {
        type: String,
        default: 'Edit User',
    },
    moduleHandle: {
        type: String,
        default: 'users',
    },
    module: {
        type: Object,
        required: true,
    },
    itemType: {
        type: Object,
        default: null,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    customFieldTabs: {
        type: Array,
        default: () => [],
    },
    systemFields: {
        type: Array,
        default: () => [],
    },
    item: {
        type: Object,
        default: null,
    },
    user: {
        type: Object,
        required: true,
    },
    updateUrl: {
        type: String,
        required: true,
    },
    indexUrl: {
        type: String,
        required: true,
    },
});

const { toasts, showToast, dismissToast } = useToast();
const languages = computed(() => usePage().props.languages || []);
const currentUser = computed(() => usePage().props.auth?.user ?? null);
const isCurrentUserSuperadmin = computed(() => currentUser.value?.is_superadmin === true);

const normalizeCheckboxValue = (value) => {
    if (value === null || value === undefined) {
        return false;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value === '1' || value === 'true' || value === 'on';
    }
    return !!value;
};

const buildCustomFieldState = () => {
    if (!props.item || !props.customFieldTabs) {
        return {};
    }
    
    const state = {};

    // Include regular custom field tabs
    props.customFieldTabs.forEach((tab) => {
        (tab.fields || []).forEach((field) => {
            const isFileField = field.type === 'file';
            const isCheckboxField = field.type === 'checkbox';
            
            let defaultValue;
            if (isFileField) {
                defaultValue = null;
            } else if (isCheckboxField) {
                defaultValue = normalizeCheckboxValue(field.values?.default);
            } else {
                defaultValue = field.values?.default ?? '';
            }
            
            let translations = {};
            if (field.values?.translations) {
                if (isFileField) {
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = null;
                    });
                } else if (isCheckboxField) {
                    Object.keys(field.values.translations).forEach((lang) => {
                        translations[lang] = normalizeCheckboxValue(field.values.translations[lang]);
                    });
                } else {
                    translations = { ...field.values.translations };
                }
            }
            
            state[field.id] = {
                default: defaultValue,
                translations,
            };
        });
    });

    return state;
};

const buildFormPayload = () => {
    const payload = {
        user_id: props.user?.id || null,
        item_id: props.user?.item_id || props.item?.id || null,
        name: props.user?.name || '',
        email: props.user?.email || '',
        password: '',
        password_confirmation: '',
        active: props.user?.active ?? true,
        admin_access: props.user?.admin_access ?? false,
        is_superadmin: props.user?.is_superadmin ?? false,
    };

    // Add item values if item exists
    if (props.item?.values) {
        const values = { ...props.item.values };
        delete values.item_file_url;
        
        Object.assign(payload, values);
        payload.custom_fields = buildCustomFieldState();
        
        // Initialize item_file as null
        if (!(payload.item_file instanceof File)) {
            payload.item_file = null;
        }
        
        payload.delete_item_file = false;
        
        if (props.itemType?.slugIsMultilingual && !payload.slug_translations) {
            payload.slug_translations = {};
        }
    }

    return payload;
};

const activeTabId = ref('user');

const tabItems = computed(() => {
    const base = [{ id: 'user', title: t('admin.users.title') }];
    
    if (props.customFieldTabs && props.customFieldTabs.length > 0) {
        const custom = props.customFieldTabs.map((tab) => ({
            id: `custom-${tab.id}`,
            title: tab.title,
            kind: 'custom',
            payload: tab,
        }));
        return [...base, ...custom];
    }
    
    return base;
});

const activeTab = computed(() => tabItems.value.find((tab) => tab.id === activeTabId.value) || tabItems.value[0]);

const editForm = useForm(buildFormPayload());

editForm.transform((data) => {
    const payload = { ...data };

    if (!(payload.item_file instanceof File)) {
        delete payload.item_file;
    }

    payload._method = 'put';

    return payload;
});

const submit = () => {
    editForm.post(props.updateUrl, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
            showToast({
                title: t('admin.common.success'),
                message: t('admin.users.user_updated'),
                intent: 'success',
            });
            
            // Reset file inputs
            if (props.customFieldTabs) {
                props.customFieldTabs.forEach((tab) => {
                    (tab.fields || []).forEach((field) => {
                        if (field.type === 'file') {
                            const inputId = `field-${field.id}`;
                            const input = document.getElementById(inputId);
                            if (input) {
                                input.value = '';
                            }
                            
                            if (field.multilanguage && languages.value.length > 0) {
                                languages.value.forEach((language) => {
                                    const langKey = language?.id ?? language?.slug ?? language?.code;
                                    const langInputId = `field-${field.id}-${langKey}`;
                                    const langInput = document.getElementById(langInputId);
                                    if (langInput) {
                                        langInput.value = '';
                                    }
                                });
                            }
                        }
                    });
                });
            }
            
            editForm.reset();
            editForm.defaults(buildFormPayload());
        },
        onError: (errors) => {
            showToast({
                title: t('admin.common.error', 'Error'),
                message: t('admin.users.user_update_failed'),
                intent: 'danger',
            });
        },
    });
};

watch(
    () => [props.item, props.customFieldTabs, props.user],
    () => {
        editForm.defaults(buildFormPayload());
        editForm.reset();
    },
    { deep: true }
);

const selectTab = (tabId) => {
    activeTabId.value = tabId;
};
</script>

<template>
    <AdminLayout>
        <Head :title="title" />
        <div class="py-6">
            <div class="mx-auto max-w-8xl sm:px-6 lg:px-8 space-y-6">
                <section class="bg-white dark:bg-gray-800 shadow rounded-xl p-6 space-y-4">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Module</p>
                            <h1 class="heading-1">
                                {{ module.title }} · {{ t('admin.users.edit_user') }}
                            </h1>
                            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {{ t('admin.users.editing_user', { id: user.id }) }}
                            </p>
                        </div>
                        <Link :href="indexUrl" class="btn btn-outline" preserve-scroll>
                            {{ t('admin.users.back_to_list') }}
                        </Link>
                    </div>

                    <!-- Tabs -->
                    <div class="space-y-6">
                        <div class="flex flex-wrap gap-2 border-divider pb-1">
                            <button
                                v-for="tab in tabItems"
                                :key="tab.id"
                                type="button"
                                class="px-3 py-1.5 text-sm font-medium rounded-md transition"
                                :class="tab.id === activeTabId
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
                                @click="selectTab(tab.id)"
                            >
                                {{ tab.title }}
                            </button>
                        </div>

                        <!-- Form wrapper -->
                        <form class="space-y-6" @submit.prevent="submit">
                            <input v-model="editForm.user_id" type="hidden" />
                            <input v-model="editForm.item_id" type="hidden" />

                            <!-- User Tab -->
                            <div v-if="activeTab?.id === 'user'" class="space-y-6">
                                <!-- Name field -->
                                <div class="space-y-1">
                                    <label class="form-label" for="name">{{ t('admin.users.name') }}</label>
                                    <input
                                        id="name"
                                        v-model="editForm.name"
                                        type="text"
                                        class="form-input"
                                        :class="{ 'form-input-error': editForm.errors.name }"
                                        required
                                        :placeholder="t('admin.users.enter_name')"
                                    />
                                    <p v-if="editForm.errors.name" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.name }}
                                    </p>
                                </div>

                                <!-- Email field -->
                                <div class="space-y-1">
                                    <label class="form-label" for="email">{{ t('admin.users.email') }}</label>
                                    <input
                                        id="email"
                                        v-model="editForm.email"
                                        type="email"
                                        class="form-input"
                                        :class="{ 'form-input-error': editForm.errors.email }"
                                        required
                                        :placeholder="t('admin.users.enter_email')"
                                    />
                                    <p v-if="editForm.errors.email" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.email }}
                                    </p>
                                </div>

                                <!-- Password field -->
                                <div class="space-y-1">
                                    <label class="form-label" for="password">{{ t('admin.users.password') }}</label>
                                    <input
                                        id="password"
                                        v-model="editForm.password"
                                        type="password"
                                        class="form-input"
                                        :class="{ 'form-input-error': editForm.errors.password }"
                                        :placeholder="t('admin.users.password_leave_blank')"
                                    />
                                    <p v-if="editForm.errors.password" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.password }}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">
                                        {{ t('admin.users.password_leave_blank_hint') }}
                                    </p>
                                </div>

                                <!-- Password confirmation field -->
                                <div v-if="editForm.password" class="space-y-1">
                                    <label class="form-label" for="password_confirmation">{{ t('admin.users.confirm_password') }}</label>
                                    <input
                                        id="password_confirmation"
                                        v-model="editForm.password_confirmation"
                                        type="password"
                                        class="form-input"
                                        :class="{ 'form-input-error': editForm.errors.password_confirmation }"
                                        :placeholder="t('admin.users.confirm_password_placeholder')"
                                    />
                                    <p v-if="editForm.errors.password_confirmation" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.password_confirmation }}
                                    </p>
                                </div>

                                <!-- Active checkbox -->
                                <div class="flex items-center space-x-2">
                                    <input
                                        id="active"
                                        v-model="editForm.active"
                                        type="checkbox"
                                        class="form-checkbox"
                                    />
                                    <label for="active" class="form-label mb-0">{{ t('admin.users.active') }}</label>
                                    <p v-if="editForm.errors.active" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.active }}
                                    </p>
                                </div>

                                <!-- Admin Access checkbox -->
                                <div class="flex items-center space-x-2">
                                    <input
                                        id="admin_access"
                                        v-model="editForm.admin_access"
                                        type="checkbox"
                                        class="form-checkbox"
                                    />
                                    <label for="admin_access" class="form-label mb-0">{{ t('admin.users.admin_access') }}</label>
                                    <p v-if="editForm.errors.admin_access" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.admin_access }}
                                    </p>
                                </div>

                                <!-- Super Admin checkbox -->
                                <div class="flex items-center space-x-2">
                                    <input
                                        id="is_superadmin"
                                        v-model="editForm.is_superadmin"
                                        type="checkbox"
                                        class="form-checkbox"
                                        :disabled="!isCurrentUserSuperadmin"
                                    />
                                    <label 
                                        for="is_superadmin" 
                                        class="form-label mb-0"
                                        :class="{ 'opacity-50 cursor-not-allowed': !isCurrentUserSuperadmin }"
                                    >
                                        {{ t('admin.users.super_admin') }}
                                    </label>
                                    <p v-if="editForm.errors.is_superadmin" class="text-sm text-red-600 dark:text-red-400">
                                        {{ editForm.errors.is_superadmin }}
                                    </p>
                                    <p v-if="!isCurrentUserSuperadmin" class="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        {{ t('admin.users.super_admin_hint') }}
                                    </p>
                                </div>

                            </div>

                            <!-- Custom Field Tabs -->
                            <div v-else-if="activeTab?.kind === 'custom' && activeTab?.payload" class="space-y-6">
                                <CustomFieldsTab
                                    :tab="activeTab.payload"
                                    :form="editForm"
                                />
                            </div>

                            <!-- Submit buttons (shown on all tabs) -->
                            <div class="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button type="submit" class="btn btn-primary" :disabled="editForm.processing">
                                    {{ editForm.processing ? t('admin.users.saving') : t('admin.users.save_changes') }}
                                </button>
                                <Link :href="indexUrl" class="btn-text" preserve-scroll>{{ t('admin.common.cancel') }}</Link>
                            </div>
                        </form>
                    </div>
                </section>
            </div>
        </div>
        <ToastStack :toasts="toasts" @dismiss="dismissToast" />
    </AdminLayout>
</template>
