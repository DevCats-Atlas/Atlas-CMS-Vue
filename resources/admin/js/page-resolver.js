import pages from 'virtual:atlas-admin-pages';

/** Resolve an Inertia page from the registry supplied by the atlasPages Vite plugin. */
export async function resolvePage(name) {
    const normalizedName = name.replace(/\\/g, '/');
    const loader = Object.hasOwn(pages, normalizedName) ? pages[normalizedName] : null;
    if (!loader) throw new Error(`Page not found: ${name}`);
    const module = await loader();
    return module.default;
}
