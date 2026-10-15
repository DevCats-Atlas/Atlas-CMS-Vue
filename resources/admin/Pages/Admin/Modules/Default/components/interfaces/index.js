import TextInterface from './TextInterface.vue';
import TextareaInterface from './TextareaInterface.vue';
import WysiwygInterface from './WysiwygInterface.vue';
import FileInterface from './FileInterface.vue';
import DateInterface from './DateInterface.vue';
import SelectInterface from './SelectInterface.vue';
import CheckboxInterface from './CheckboxInterface.vue';
import ChildrenInterface from './ChildrenInterface.vue';
import CategoriesInterface from './CategoriesInterface.vue';
import ProductAttributesInterface from './ProductAttributesInterface.vue';
import UnknownInterface from './UnknownInterface.vue';
import { defineAsyncComponent } from 'vue';
import customInterfaces from 'virtual:atlas-admin-interfaces';

const interfaceComponents = {
    text: TextInterface,
    textarea: TextareaInterface,
    wysiwyg: WysiwygInterface,
    file: FileInterface,
    date: DateInterface,
    datetime: DateInterface, // datetime also uses DateInterface component
    'datetime-local': DateInterface, // datetime-local also uses DateInterface component
    select: SelectInterface,
    checkbox: CheckboxInterface,
    children: ChildrenInterface,
    categories: CategoriesInterface,
    'product_attributes': ProductAttributesInterface,
};

// Custom interfaces come from the atlasPages() registry: host resources/admin/Custom/Interfaces first,
// then AtlasCMS-Vue and other declared Vue packages. Keys are interface paths such as "Posts/Analytics".
const customInterfaceCache = new Map();

/**
 * Resolve interface component by type and optional config.
 *
 * @param {string} type - The interface type
 * @param {Object|null} config - Optional field config containing interface_path for custom types
 * @returns {Object} Vue component
 */
export const resolveInterfaceComponent = (type, config = null) => {
    if (interfaceComponents[type]) {
        return interfaceComponents[type];
    }

    if (type !== 'custom') {
        return UnknownInterface;
    }

    if (!config?.interface_path) {
        console.warn('Custom interface type requires interface_path in config', { type, config });
        return UnknownInterface;
    }

    const name = config.interface_path.replace(/\\/g, '/').replace(/^\/+|\.vue$/g, '');
    const loader = Object.hasOwn(customInterfaces, name) ? customInterfaces[name] : null;
    if (!loader) {
        console.warn(`Custom interface not found: ${name}`, { available: Object.keys(customInterfaces) });
        return UnknownInterface;
    }

    if (!customInterfaceCache.has(name)) {
        customInterfaceCache.set(name, defineAsyncComponent(() =>
            loader()
                .then(module => module.default ?? module)
                .catch(error => {
                    console.error(`Failed to load custom interface: ${name}`, error);
                    return UnknownInterface;
                })
        ));
    }

    return customInterfaceCache.get(name);
};

export { interfaceComponents, UnknownInterface };

export default interfaceComponents;
