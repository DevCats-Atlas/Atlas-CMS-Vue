import { computed, reactive } from 'vue';
import { useForm } from '@inertiajs/vue3';
import { createModels, normalizeParent } from '@/dbTable/formModel.js';
import { recordFormPayload } from '@/dbTable/recordTransport.js';

/**
 * Inertia form for DbTable create/edit pages.
 *
 * Interface components edit `models`; the payload is built from them at submit time.
 * When the parent selector is shown it owns the parent column instead of that field's input.
 */
export function useDbTableRecordForm(props, { recordId = null, parentId = null } = {}) {
    const usesParentSelector = props.hasDeepStructure && props.availableParents.length > 0;
    const fields = computed(() => (usesParentSelector
        ? props.fields.filter((field) => field.name !== props.parentColumn)
        : props.fields));

    const models = reactive(createModels(props.fields, { useDefault: recordId === null }));
    const form = useForm({
        ...(recordId !== null ? { record_id: recordId } : {}),
        ...(usesParentSelector ? { [props.parentColumn]: parentId ?? null } : {}),
    });

    const submit = (url, { method = 'post', ...options } = {}) => {
        form.transform((data) => {
            const payload = recordFormPayload(fields.value, models, data, method);
            if (usesParentSelector) {
                payload[props.parentColumn] = normalizeParent(data[props.parentColumn]);
            }

            return payload;
        }).post(url, { preserveScroll: true, forceFormData: method === 'put', ...options });
    };

    return { form, models, fields, usesParentSelector, submit };
}
