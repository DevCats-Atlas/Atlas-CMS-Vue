import path from 'node:path';
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';

const pagesModuleId = 'virtual:atlas-admin-pages';
const interfacesModuleId = 'virtual:atlas-admin-interfaces';

function vueFiles(directory, ancestors = new Set()) {
    if (!existsSync(directory)) return [];
    const realDirectory = realpathSync(directory);
    if (ancestors.has(realDirectory)) return [];
    const nextAncestors = new Set([...ancestors, realDirectory]);
    return readdirSync(directory, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name, 'en'))
        .flatMap(entry => {
            const file = path.join(directory, entry.name);
            const stats = entry.isSymbolicLink() ? statSync(file) : entry;
            if (stats.isDirectory()) return vueFiles(file, nextAncestors);
            return stats.isFile() && entry.name.endsWith('.vue') ? [file] : [];
        });
}

/** One virtual module mapping `Relative/Name` to a lazy import; the first root containing a name wins. */
function registry(moduleId, roots) {
    const contains = file => file.endsWith('.vue') && roots.some(root => {
        const relative = path.relative(root, file);
        return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    });

    return {
        moduleId,
        resolvedId: `\0${moduleId}`,
        roots,
        contains,
        source() {
            const entries = new Map();
            for (const root of roots) {
                for (const file of vueFiles(root)) {
                    const name = path.relative(root, file).split(path.sep).join('/').slice(0, -4);
                    if (!entries.has(name)) entries.set(name, file);
                }
            }
            const lines = [...entries].map(([name, file]) =>
                `[${JSON.stringify(name)}, () => import(${JSON.stringify(file.split(path.sep).join('/'))})]`
            );
            return `export default Object.fromEntries([${lines.join(',\n')}]);`;
        },
    };
}

const unique = paths => [...new Set(paths)];

/**
 * Build lazy admin page and custom field interface registries from the consumer and selected package directories.
 * Without `interfaceRoots`, each page root `…/admin/Pages` contributes `…/admin/Custom/Interfaces`.
 */
export function atlasPages({ projectRoot, pageRoots = [], interfaceRoots = null }) {
    const resolve = root => path.resolve(projectRoot, root);
    const packageInterfaceRoots = interfaceRoots
        ?? pageRoots.map(root => path.join(path.dirname(resolve(root)), 'Custom/Interfaces'));
    const registries = [
        registry(pagesModuleId, unique([resolve('resources/admin/Pages'), ...pageRoots.map(resolve)])),
        registry(interfacesModuleId, unique([resolve('resources/admin/Custom/Interfaces'), ...packageInterfaceRoots.map(resolve)])),
    ];

    return {
        name: 'atlas-admin-pages',
        resolveId(id) {
            return registries.find(entry => entry.moduleId === id)?.resolvedId;
        },
        load(id) {
            return registries.find(entry => entry.resolvedId === id)?.source();
        },
        configureServer(server) {
            // Selected sources can be outside the consumer (environment/file overrides).
            const roots = registries.flatMap(entry => entry.roots);
            server.config.server.fs.allow.push(...roots);
            server.watcher.add(roots);
            const refresh = file => {
                const changed = registries.filter(entry => entry.contains(file));
                if (changed.length === 0) return;
                const graph = server.environments.client.moduleGraph;
                for (const entry of changed) {
                    const module = graph.getModuleById(entry.resolvedId);
                    if (module) graph.invalidateModule(module);
                }
                server.ws.send({ type: 'full-reload' });
            };
            server.watcher.on('add', refresh);
            server.watcher.on('unlink', refresh);
        },
    };
}
