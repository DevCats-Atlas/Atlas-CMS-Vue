/**
 * Translation composable for accessing translations shared via Inertia
 * 
 * Usage:
 *   const { t } = useTranslation();
 *   const message = t('admin.common.save');
 *   const validation = t('admin.validation.required', { field: 'Title' });
 */

import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

export function useTranslation() {
    const page = usePage();
    
    const translations = computed(() => {
        return page.props.translations || {};
    });
    
    /**
     * Translate a key with optional parameters
     * 
     * @param {string} key - Translation key (dot notation, e.g., 'admin.common.save')
     * @param {object} params - Parameters to replace in translation (e.g., { field: 'Title' })
     * @returns {string} Translated string or key if translation not found
     */
    const t = (key, params = {}) => {
        if (!key || typeof key !== 'string') {
            return key;
        }
        
        const keys = key.split('.');
        let value = translations.value;
        
        // Navigate nested object (e.g., 'admin.common.save' -> translations.admin.common.save)
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                // Fallback to key if translation not found (only warn in development)
                if (import.meta.env.DEV) {
                    console.warn(`[Translation] Missing key: ${key}`);
                }
                return key;
            }
        }
        
        // If value is not a string, return it as-is or fallback to key
        if (typeof value !== 'string') {
            return key;
        }
        
        // Replace parameters in format :paramName or {paramName}
        if (Object.keys(params).length > 0) {
            // Laravel style :param
            value = value.replace(/:(\w+)/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? String(params[paramKey]) : match;
            });
            
            // Also support {param} style
            value = value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                return params[paramKey] !== undefined ? String(params[paramKey]) : match;
            });
        }
        
        return value;
    };
    
    return { t, translations };
}

