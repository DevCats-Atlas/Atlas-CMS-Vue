/**
 * AtlasCMS-Vue Vite Configuration
 * 
 * This file exports the package's Vite configuration including:
 * - Resource files (CSS, JS) to include in the build
 * - Path aliases for imports
 * 
 * This config is automatically loaded by the root vite.config.js
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
    // Resource files to include in Vite build
    resources: [
        { type: 'css', file: 'resources/admin/css/app.css', context: 'admin' },
        { type: 'js', file: 'resources/admin/js/app.js', context: 'admin' },
        { type: 'js', file: 'resources/admin/js/page-resolver.js', context: 'admin' },
    ],
    
    // Path aliases for this package
    aliases: {
        '@atlas-cms/admin': path.resolve(__dirname, 'resources/admin'),
        '@admin': path.resolve(__dirname, 'resources/admin'), // Legacy alias
        '@': path.resolve(__dirname, 'resources/admin/js'),
    },
};

