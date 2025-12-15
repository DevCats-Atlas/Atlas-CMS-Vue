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

// Pre-load all custom interfaces using glob pattern
// This allows Vite to properly bundle and code-split custom interfaces
// Using relative path from interfaces directory
const customInterfaces = import.meta.glob('../../../../../../Custom/Interfaces/**/*.vue', { eager: false });

/**
 * Resolve interface component by type and optional config.
 * For custom interfaces, dynamically imports from Custom/Interfaces directory.
 * 
 * @param {string} type - The interface type
 * @param {Object|null} config - Optional field config containing interface_path for custom types
 * @returns {Object} Vue component
 */
export const resolveInterfaceComponent = (type, config = null) => {
    // Handle built-in interface types
    if (interfaceComponents[type]) {
        return interfaceComponents[type];
    }

    // Handle custom interface type
    if (type === 'custom') {
        if (!config?.interface_path) {
            console.warn('Custom interface type requires interface_path in config', { type, config });
            return UnknownInterface;
        }

        try {
            // Convert path like "Posts/Analytics" to match glob pattern
            // The glob pattern is: ../../../../../../Custom/Interfaces/**/*.vue
            // So the lookup path should be: ../../../../../../Custom/Interfaces/Posts/Analytics.vue
            const customPath = config.interface_path.replace(/\\/g, '/');
            const interfacePath = `../../../../../../Custom/Interfaces/${customPath}.vue`;
            
            // Check if the custom interface exists in our glob
            if (customInterfaces[interfacePath]) {
                // Return async component that will load the custom interface
                return defineAsyncComponent(() => 
                    customInterfaces[interfacePath]()
                        .then(module => {
                            const component = module.default || module;
                            if (!component) {
                                throw new Error('Custom interface component does not have a default export');
                            }
                            return component;
                        })
                        .catch((error) => {
                            console.error(`Failed to load custom interface: ${interfacePath}`, error);
                            console.error('Config:', config);
                            console.error('Custom path:', customPath);
                            return UnknownInterface;
                        })
                );
            } else {
                console.warn(`Custom interface not found: ${interfacePath}`);
                console.log('Available custom interfaces:', Object.keys(customInterfaces));
                console.log('Config:', config);
                return UnknownInterface;
            }
        } catch (error) {
            console.error(`Error resolving custom interface: ${config.interface_path}`, error);
            console.error('Config:', config);
            return UnknownInterface;
        }
    }

    // Fallback to unknown interface
    return UnknownInterface;
};

export { interfaceComponents, UnknownInterface };

export default interfaceComponents;
