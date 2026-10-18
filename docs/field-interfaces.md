# Field interfaces

A field interface is the editor of one custom field in an Items form: the module edit page, inline child forms and the Users form. The field's type picks it; type `custom` picks a Vue component by path.

## Built-in interfaces

`Pages/Admin/Modules/Default/components/interfaces/index.js` registers them:

| Type | Component | Stores |
| --- | --- | --- |
| `text`, `textarea`, `wysiwyg` | `TextInterface`, `TextareaInterface`, `WysiwygInterface` | A string; WYSIWYG stores HTML |
| `date`, `datetime`, `datetime-local` | `DateInterface` | A date string |
| `checkbox` | `CheckboxInterface` | `'1'` or `'0'` |
| `select` | `SelectInterface` | The selected value; options come from the field's `options` |
| `file` | `FileInterface` | An upload path on the upload disk |
| `children` | `ChildrenInterface` | Nothing: lists or galleries of child Items with their own forms |
| `categories` | `CategoriesInterface` | Nothing: typed relationships to Items under a root |
| `custom` | Your component, by `interface_path` | What the component writes |

An unknown type, or a `custom` path that does not resolve, renders `UnknownInterface` and logs a warning in the browser console.

## The contract

The form renders the interface with three props:

| Prop | Contents |
| --- | --- |
| `field` | `{ id, title, node, type, multilanguage, config, options, values }`. `config` holds the settings from **System → Item Types** (`interface_path`, `hide_title`, `root_id`, `relationship`, …); `values` the stored `default` and `translations`, and for files `default_url` / `translations_url` |
| `model` | The value the form submits: `{ default, translations }`. A multilanguage field writes `model.translations[slug]` per language; any other field writes `model.default`. File fields also have `delete_default` and `delete_translations_{slug}` flags |
| `parentItemId` | The Item being edited; `null` in a create form |

- Write into `model`; the form sends it as `custom_fields[{field.id}]` with the rest of the form.
- The form starts `model.default` from the stored value (`''` when empty) and `model.translations` from the stored translations. Languages you do not write keep their stored values.
- Translation keys are language slugs. Items forms receive the content languages as the page prop `languages` (`id`, `title`, `slug`, `code`, `is_default`); read them with `usePage()`.
- The server stores strings: booleans become `'1'` / `'0'`, arrays and objects JSON, an empty or whitespace-only value clears the field ([saving Items](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/modules.md#saving-items)).
- Custom fields have no server-side validation rules. Guide the editor in the interface, and validate on the server in a [custom controller](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/modules.md#request-dispatch) when a value must be enforced.
- Respect `field.config.hide_title`, use `.form-label` / `.form-input` with dark variants, and keep the component self-contained: it renders inside the page's form, so it must not submit anything itself.

## Writing a custom interface

Example: a meta description editor that counts characters, for the field from the [add a field recipe](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/docs/recipes/add-a-field.md).

`resources/admin/Custom/Interfaces/Seo/MetaDescription.vue`:

```vue
<script setup>
import { computed } from 'vue';
import { usePage } from '@inertiajs/vue3';

const props = defineProps({
    field: { type: Object, required: true },
    model: { type: Object, required: true },
    parentItemId: { type: Number, default: null },
});

const LIMIT = 160;

const page = usePage();

// One editor per content language for a multilanguage field, else one for the default value
const editors = computed(() => {
    const languages = props.field.multilanguage ? page.props.languages ?? [] : [];

    return languages.length
        ? languages.map((language) => ({ key: language.slug, label: `${props.field.title} (${language.title})` }))
        : [{ key: null, label: props.field.title }];
});

const valueOf = (key) => (key === null ? props.model.default : props.model.translations?.[key]) ?? '';

function update(key, value) {
    if (key === null) {
        props.model.default = value;
    } else {
        props.model.translations = { ...props.model.translations, [key]: value };
    }
}
</script>

<template>
    <div class="space-y-4">
        <div v-for="editor in editors" :key="editor.key ?? 'default'" class="space-y-1">
            <label v-if="!field.config?.hide_title" class="form-label">{{ editor.label }}</label>
            <textarea
                :value="valueOf(editor.key)"
                rows="3"
                class="form-input"
                :class="{ 'form-input-error': valueOf(editor.key).length > LIMIT }"
                @input="update(editor.key, $event.target.value)"
            />
            <p
                class="text-xs"
                :class="valueOf(editor.key).length > LIMIT ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'"
            >
                {{ valueOf(editor.key).length }} / {{ LIMIT }}
            </p>
        </div>
    </div>
</template>
```

Then point a field at it with the interface path, the file's path under `Custom/Interfaces/` without `.vue`:

- in **System → Item Types**: interface **Custom**, **Interface Path** `Seo/MetaDescription`, keeping the node `meta_description` and **Multilanguage**;
- or in code with [`ContentStructure`](https://github.com/DevCats-Atlas/Atlas-CMS/blob/main/docs/structure.md#types-and-fields):

```php
$tab->custom('meta_description', 'Meta description', 'Seo/MetaDescription')->multilingual();
```

`atlasPages()` collects interfaces into `virtual:atlas-admin-interfaces` with the same priority as pages: host `resources/admin/Custom/Interfaces/`, this package, then other declared Vue packages ([page resolution](pages.md#page-resolution)). A package ships interfaces in its own `resources/admin/Custom/Interfaces/`, as AtlasShop-Vue does with `Shop/ProductAttributes`. Components load lazily, on the first form that needs them. The host's `Custom/Interfaces/Example.vue` shows the minimal contract.

[Docs tests](https://github.com/DevCats-Atlas/Development-Atlas-CMS-Full/blob/main/tests/Frontend/docsExamples.test.mjs) mount this example and check what it writes.
