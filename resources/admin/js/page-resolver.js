/**
 * Page Resolver for Inertia.js
 * 
 * Resolves Vue page components from main CMS and all packages.
 * Supports packages from multiple locations:
 * - packages/{PackageName}/resources/admin/Pages/ (local development)
 * - node_modules/@devcats/*-vue/resources/admin/Pages/ (npm packages - stable/production)
 * - vendor/{vendor}/{package}/resources/admin/Pages/ (Composer packages)
 * All packages following this convention are automatically discovered.
 * 
 * Note: Vite's import.meta.glob requires static string patterns (not template literals),
 * so we use fixed relative paths. The file structure convention ensures these paths work:
 * - File location: packages/{PackageName}/resources/admin/js/page-resolver.js
 * - To packages/: ../../../../ (4 levels up)
 * - To node_modules/: ../../../../../node_modules/ (5 levels up)
 * - To vendor/: ../../../../../vendor/ (5 levels up)
 */

// Load main CMS pages (relative to current file)
const cmsPages = import.meta.glob('../Pages/**/*.vue');

// Auto-discover all Vue packages in local packages/ directory (development)
// Static path: ../../../../*-Vue/resources/admin/Pages/**/*.vue
// This works because the file is always at: packages/{Package}/resources/admin/js/
const localVuePackagePages = import.meta.glob('../../../../*-Vue/resources/admin/Pages/**/*.vue', { 
    eager: false 
}) || {};

// Also check for other Atlas packages in local packages/ that might have admin Pages
// Static path: ../../../../Atlas*/resources/admin/Pages/**/*.vue
const localAtlasPackagePages = import.meta.glob('../../../../Atlas*/resources/admin/Pages/**/*.vue', { 
    eager: false 
}) || {};

// Auto-discover all Vue packages in node_modules (stable/production npm packages)
// Static path: ../../../../../node_modules/@devcats/*-vue/resources/admin/Pages/**/*.vue
// npm packages are typically installed as @devcats/atlas-cms-vue, @devcats/atlas-shop-vue, etc.
const npmVuePackagePages = import.meta.glob('../../../../../node_modules/@devcats/*-vue/resources/admin/Pages/**/*.vue', { 
    eager: false 
}) || {};

// Merge all local package pages (deduplicate)
const localPackagePages = {
    ...localVuePackagePages,
    ...localAtlasPackagePages,
};

// Auto-discover all package pages from Composer vendor directory
// Static path: ../../../../../vendor/*/*/resources/admin/Pages/**/*.vue
// Vendor is at project root, one level up from packages
const vendorPackagePages = import.meta.glob('../../../../../vendor/*/*/resources/admin/Pages/**/*.vue', { 
    eager: false 
}) || {};

// Merge all package pages into a single object
// Priority: local packages (development) > npm packages (production) > vendor packages
const allPackagePages = {
    ...localPackagePages,      // Development packages in packages/
    ...npmVuePackagePages,     // Stable npm packages in node_modules
    ...vendorPackagePages,     // Composer packages in vendor/
};

/**
 * Find matching package page by name
 * @param {string[]} packageKeys - All package page keys from glob
 * @param {string} pageName - Page name to find
 * @returns {string|null} Matching key or null
 */
function findMatchingPackagePage(packageKeys, pageName) {
    const normalizedName = pageName.replace(/\\/g, '/');
    
    return packageKeys.find(key => {
        const normalizedKey = key.replace(/\\/g, '/');
        return normalizedKey.endsWith(`/${normalizedName}.vue`);
    }) || null;
}

/**
 * Resolve a page component by name
 * @param {string} name - Page name (e.g., "Admin/Orders/Index")
 * @returns {Promise<Component>} Vue component
 */
export async function resolvePage(name) {
    // 1. Try main CMS pages first
    let loader = cmsPages[`../Pages/${name}.vue`];
    
    if (loader) {
        const module = await loader();
        return module.default;
    }
    
    // 2. Try to find in package pages
    if (allPackagePages) {
        const packageKeys = Object.keys(allPackagePages);
        if (packageKeys.length > 0) {
            // Find matching package page by filename
            const matchingKey = findMatchingPackagePage(packageKeys, name);
            if (matchingKey) {
                loader = allPackagePages[matchingKey];
            }
        }
        
        if (loader) {
            const module = await loader();
            return module.default;
        }
    }
    
    // Debug: Log available keys if page not found (only in dev)
    if (import.meta.env.DEV) {
        console.error(`Page not found: ${name}`);
        console.log('Available CMS pages:', Object.keys(cmsPages).slice(0, 5));
        console.log('Available package pages:', Object.keys(allPackagePages).slice(0, 10));
    }
    
    throw new Error(`Page not found: ${name}`);
}
