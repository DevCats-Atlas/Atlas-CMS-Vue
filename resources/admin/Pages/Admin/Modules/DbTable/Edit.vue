<script setup>
import { adminUrl } from '@/utils/adminUrl';
import { computed, watch } from 'vue';
import { Head, Link, usePage } from '@inertiajs/vue3';
import AdminLayout from '@admin/Layouts/AdminLayout.vue';
import { useToast } from '@/composables/useToast.js';
import RelationshipManager from './components/RelationshipManager.vue';
import CustomButtons from '../components/CustomButtons.vue';
import DbTableRecordForm from './components/DbTableRecordForm.vue';
import { useDbTableRecordForm } from '@/composables/useDbTableRecordForm.js';
import { useTranslation } from '@/utils/useTranslation.js';

const { t } = useTranslation();
const page = usePage();

const props = defineProps({
    title: {
        type: String,
        default: null,
    },
    moduleHandle: {
        type: String,
        required: true,
    },
    module: {
        type: Object,
        required: true,
    },
    tableName: {
        type: String,
        required: true,
    },
    recordId: {
        type: [String, Number],
        required: true,
    },
    primaryKeyColumn: {
        type: String,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    uiConfig: {
        type: Object,
        default: () => ({}),
    },
    record: {
        type: Object,
        required: true,
    },
    hasDeepStructure: {
        type: Boolean,
        default: false,
    },
    parentColumn: {
        type: String,
        default: 'parent_id',
    },
    availableParents: {
        type: Array,
        default: () => [],
    },
    relationships: {
        type: Array,
        default: () => [],
    },
    customButtons: {
        type: Array,
        default: () => [],
    },
    dataSource: {
        type: String,
        default: 'db_table',
    },
});

const baseUrl = computed(() => adminUrl(`${props.moduleHandle}`));
const { showToast } = useToast();

// Watch for flash messages and show them as toasts
watch(() => page.props.flash, (flash) => {
    if (flash?.error) {
        showToast({
            title: t('admin.common.error'),
            message: flash.error,
            intent: 'danger',
            duration: 6000,
        });
    }
    if (flash?.success) {
        showToast({
            title: t('admin.common.success'),
            message: flash.success,
            intent: 'success',
            duration: 4000,
        });
    }
}, { immediate: true, deep: true });

const { form: editForm, models, fields, usesParentSelector, submit } = useDbTableRecordForm(props, {
    recordId: props.recordId,
    parentId: props.record[props.parentColumn] ?? null,
});

// Inertia follows the backend redirect; success toasts come from flash messages
const submitUpdate = () => submit(`${baseUrl.value}/edit`, { method: 'put' });

// Format cast display with safe HTML and newline support
const formatCastDisplay = (html) => {
    if (!html) return '';
    
    // Allowed tags whitelist
    const allowedTags = ['div', 'p', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li', 'a', 'br', 'span'];
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Sanitize: remove disallowed tags but keep their content
    const sanitize = (node) => {
        const children = Array.from(node.childNodes);
        children.forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();
                if (!allowedTags.includes(tagName)) {
                    // Replace disallowed tag with its content
                    while (child.firstChild) {
                        node.insertBefore(child.firstChild, child);
                    }
                    node.removeChild(child);
                } else {
                    // For <a> tags, ensure they open in new tab and have safe attributes
                    if (tagName === 'a') {
                        child.setAttribute('target', '_blank');
                        child.setAttribute('rel', 'noopener noreferrer');
                        child.classList.add('underline', 'hover:text-blue-700');
                    }
                    // Recursively sanitize children
                    sanitize(child);
                }
            }
        });
    };
    
    sanitize(temp);
    
    // Convert remaining newlines to <br>
    let result = temp.innerHTML;
    result = result.replace(/\n/g, '<br>');
    
    return '→ ' + result;
};
</script>

<template>
    <AdminLayout>
        <Head :title="title || t('admin.db_table.edit_record')" />

        <div class="py-6 pb-24">
            <div class="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                <div class="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
                    <div class="flex items-start justify-between gap-4 mb-6">
                        <div>
                            <h1 class="heading-1">{{ title }}</h1>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {{ t('admin.db_table.table') }} <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ tableName }}</code>
                                · {{ t('admin.db_table.record_id') }} <code class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{{ recordId }}</code>
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <CustomButtons
                                v-if="customButtons && customButtons.length > 0"
                                :buttons="customButtons"
                                :module-handle="moduleHandle"
                                :record-id="recordId"
                                :data-source="dataSource"
                            />
                            <Link :href="baseUrl" class="btn btn-outline">
                                {{ t('admin.users.back_to_list') }}
                            </Link>
                        </div>
                    </div>

                    <form @submit.prevent="submitUpdate" class="space-y-6">
                        <DbTableRecordForm
                            v-model:parent="editForm[parentColumn]"
                            :fields="fields"
                            :models="models"
                            :errors="editForm.errors"
                            :ui-config="uiConfig"
                            :available-parents="availableParents"
                            :parent-column="parentColumn"
                            :show-parent="usesParentSelector"
                        >
                            <template #after-field="{ field }">
                                <!-- Cast display (related data) -->
                                <div v-if="field.cast_display || field.cast_error" class="mt-1.5">
                                    <div v-if="field.cast_error" class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <span>{{ field.cast_error }}</span>
                                    </div>
                                    <div v-else class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1.5 rounded cast-display" v-html="formatCastDisplay(field.cast_display)"></div>
                                </div>
                            </template>
                        </DbTableRecordForm>

                        <!-- Relationships Section -->
                        <RelationshipManager
                            v-if="relationships.length > 0"
                            :relationships="relationships"
                            :record-id="recordId"
                            :module-handle="moduleHandle"
                            :primary-key-column="primaryKeyColumn"
                        />
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Sticky Bottom Toolbar -->
        <div class="sticky bottom-0 left-0 right-0 z-40 bg-transparent dark:bg-gray-800 mx-auto max-w-7xl">

            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 bg-white lg:mx-8 shadow-lg border-t border-gray-200 dark:border-gray-700 rounded-xl">
                <div class="flex items-center justify-between gap-4">
                    <Link :href="baseUrl" class="btn-text">
                        {{ t('admin.common.cancel') }}
                    </Link>
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="editForm.processing"
                        @click="submitUpdate"
                    >
                        {{ editForm.processing ? t('admin.db_table.updating') : t('admin.db_table.update_record') }}
                    </button>
                </div>
            </div>
        </div>
    </AdminLayout>
</template>

