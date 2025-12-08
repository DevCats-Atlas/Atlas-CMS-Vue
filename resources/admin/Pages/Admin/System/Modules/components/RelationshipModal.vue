<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
    open: {
        type: Boolean,
        default: false,
    },
    relationship: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(['close', 'save']);

const formData = ref({
    related_table: '',
    type: 'hasMany',
    local_key: 'id',
    foreign_key: '',
    name: '',
    owner_key: 'id',
    pivot_table: '',
    related_key: '',
    display_columns: '',
});

// Initialize form when relationship changes or modal opens
watch([() => props.open, () => props.relationship], () => {
    if (props.open) {
        if (props.relationship) {
            // Edit mode - populate with existing data
            formData.value = {
                related_table: props.relationship.related_table || '',
                type: props.relationship.type || 'hasMany',
                local_key: props.relationship.local_key || 'id',
                foreign_key: props.relationship.foreign_key || '',
                name: props.relationship.name || '',
                owner_key: props.relationship.owner_key || 'id',
                pivot_table: props.relationship.pivot_table || '',
                related_key: props.relationship.related_key || '',
                display_columns: props.relationship.display_columns || '',
            };
        } else {
            // Create mode - reset to defaults
            formData.value = {
                related_table: '',
                type: 'hasMany',
                local_key: 'id',
                foreign_key: '',
                name: '',
                owner_key: 'id',
                pivot_table: '',
                related_key: '',
                display_columns: '',
            };
        }
    }
}, { immediate: true });

const isEditMode = computed(() => !!props.relationship);

const submit = () => {
    emit('save', { ...formData.value });
    emit('close');
};

const close = () => {
    emit('close');
};
</script>

<template>
    <div
        v-if="open"
        class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
        @click.self="close"
    >
        <div class="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[90vh]">
            <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ isEditMode ? 'Edit Relationship' : 'Create Relationship' }}
                </h3>
                <button
                    type="button"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    @click="close"
                >
                    ✕
                </button>
            </div>
            <div class="px-6 py-4 overflow-y-auto flex-1">
                <form @submit.prevent="submit" class="space-y-4">
                    <div class="grid gap-4 md:grid-cols-2">
                        <!-- 1. Related Table (First) -->
                        <div>
                            <label class="form-label">
                                <span v-if="formData.type === 'belongsToMany'">Final Related Table</span>
                                <span v-else>Related Table</span>
                                <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="formData.related_table"
                                type="text"
                                class="form-input"
                                placeholder="e.g., orders, users, venues_categories"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="formData.type === 'belongsToMany'">The final table you want to access (through the pivot table)</span>
                                <span v-else>The table this relationship connects to</span>
                            </p>
                        </div>
                        
                        <!-- 2. Type (Second) -->
                        <div>
                            <label class="form-label">Type <span class="text-red-500">*</span></label>
                            <select
                                v-model="formData.type"
                                class="form-select"
                                required
                            >
                                <option value="hasOne">hasOne</option>
                                <option value="hasMany">hasMany</option>
                                <option value="belongsTo">belongsTo</option>
                                <option value="belongsToMany">belongsToMany</option>
                            </select>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Relationship type
                            </p>
                        </div>
                        
                        <!-- 3. Local Key (Third) -->
                        <div v-if="formData.type === 'hasOne' || formData.type === 'hasMany'">
                            <label class="form-label">Local Key</label>
                            <input
                                v-model="formData.local_key"
                                type="text"
                                class="form-input"
                                placeholder="id"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Column in this table (default: id)
                            </p>
                        </div>
                        
                        <!-- 4. Foreign Key (Fourth) -->
                        <div>
                            <label class="form-label">Foreign Key <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.foreign_key"
                                type="text"
                                class="form-input"
                                placeholder="e.g., user_id"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                <span v-if="formData.type === 'belongsToMany'">Column in pivot table pointing to this table (e.g., venue_id in venues_categories_records)</span>
                                <span v-else-if="formData.type === 'belongsTo'">Column in this table pointing to related table</span>
                                <span v-else>Column in related table pointing to this table</span>
                            </p>
                        </div>
                        
                        <!-- 5. Name (Fifth, Optional) -->
                        <div>
                            <label class="form-label">Name <span class="text-gray-400 text-xs">(optional)</span></label>
                            <input
                                v-model="formData.name"
                                type="text"
                                class="form-input"
                                placeholder="Auto-generated if empty"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Relationship name (used in code). If empty, will be auto-generated from related table name.
                            </p>
                        </div>
                        
                        <!-- Additional fields based on type -->
                        <div v-if="formData.type === 'belongsTo'">
                            <label class="form-label">Owner Key</label>
                            <input
                                v-model="formData.owner_key"
                                type="text"
                                class="form-input"
                                placeholder="id"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Column in related table (default: id)
                            </p>
                        </div>
                        
                        <div v-if="formData.type === 'belongsToMany'">
                            <label class="form-label">Pivot Table (Intermediate) <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.pivot_table"
                                type="text"
                                class="form-input"
                                placeholder="e.g., venues_categories_records, user_roles"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                The intermediate/pivot table that connects this table to the final related table
                            </p>
                        </div>
                        
                        <div v-if="formData.type === 'belongsToMany'">
                            <label class="form-label">Related Key <span class="text-red-500">*</span></label>
                            <input
                                v-model="formData.related_key"
                                type="text"
                                class="form-input"
                                placeholder="e.g., category_id, role_id"
                                required
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Column in pivot table pointing to the final related table (e.g., category_id in venues_categories_records pointing to venues_categories)
                            </p>
                        </div>
                        
                        <!-- Display Columns Configuration -->
                        <div class="md:col-span-2">
                            <label class="form-label">Display Columns <span class="text-gray-400 text-xs">(optional)</span></label>
                            <input
                                v-model="formData.display_columns"
                                type="text"
                                class="form-input"
                                placeholder="e.g., title, name, email (comma-separated)"
                            />
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Comma-separated list of columns to display from the related table. If empty, will show title/name/label or ID.
                            </p>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" class="btn-text" @click="close">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.15s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

