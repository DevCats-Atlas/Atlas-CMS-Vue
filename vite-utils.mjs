/**
 * Vite Utilities for AtlasCMS-Vue
 * 
 * Provides package resolution and loading utilities for Vite configuration.
 * Automatically discovers packages from package.json dependencies.
 */

import path from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve package path with fallback strategies
 * @param {string} npmPackage - npm package name (e.g., '@devcats/atlas-cms-vue')
 * @param {string} packagePathFromJson - Path from package.json (e.g., 'file:./packages/AtlasCMS-Vue')
 * @param {string} envVar - Environment variable name (e.g., 'ATLASCMSVUE_PATH')
 * @param {string} projectRoot - Path to project root directory
 * @returns {string} Resolved package path
 */
export function resolvePackage(npmPackage, packagePathFromJson, envVar, projectRoot) {
    // Priority 1: Environment variable (for CI/CD or custom setups)
    if (process.env[envVar]) {
        const envPath = path.resolve(projectRoot, process.env[envVar]);
        if (existsSync(envPath) && existsSync(path.join(envPath, 'resources'))) {
            return envPath;
        }
    }

    // Priority 2: Path from package.json (for local development with file: protocol)
    if (packagePathFromJson && packagePathFromJson.startsWith('file:')) {
        const localPath = packagePathFromJson.replace(/^file:/, '');
        const localDevPath = path.resolve(projectRoot, localPath);
        if (existsSync(localDevPath) && existsSync(path.join(localDevPath, 'resources'))) {
            return localDevPath;
        }
    }

    // Priority 3: npm package in node_modules
    const nodeModulesPath = path.resolve(projectRoot, `node_modules/${npmPackage}`);
    if (existsSync(nodeModulesPath) && existsSync(path.join(nodeModulesPath, 'resources'))) {
        return nodeModulesPath;
    }

    // Not found - provide helpful error
    throw new Error(
        `\n❌ Package not found: ${npmPackage}\n\n` +
        `Installation options:\n` +
        `  1. npm install ${npmPackage}\n` +
        `  2. Add to package.json: "${npmPackage}": "file:./packages/${npmPackage.replace('@devcats/', '')}"\n` +
        `  3. export ${envVar}=/path/to/package\n\n` +
        `Expected locations:\n` +
        `  • node_modules/${npmPackage}\n` +
        (packagePathFromJson ? `  • ${packagePathFromJson.replace(/^file:/, '')}\n` : '')
    );
}

/**
 * Load package Vite config
 * @param {string} packagePath - Resolved path to package
 * @returns {Object|null} Package config or null if not found
 */
export async function loadPackageConfig(packagePath) {
    try {
        const configPath = path.join(packagePath, 'vite.config.mjs');
        if (existsSync(configPath)) {
            const config = await import(configPath);
            return config.default || config;
        }
    } catch (error) {
        // Config file not found or invalid - return null
        return null;
    }
    return null;
}

/**
 * Get Vue packages from root package.json
 * @param {string} projectRoot - Path to project root directory
 * @returns {Array<{name: string, path: string}>} Array of package names and their paths from package.json
 */
export function getVuePackagesFromPackageJson(projectRoot) {
    try {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        if (!existsSync(packageJsonPath)) {
            return [];
        }

        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };

        // Filter for @devcats/*-vue packages
        const vuePackages = Object.entries(allDeps)
            .filter(([name]) => name.startsWith('@devcats/') && name.includes('-vue'))
            .map(([name, version]) => ({
                name,
                path: version, // This will be the version or file: path
            }));

        return vuePackages;
    } catch (error) {
        console.warn('⚠️  Could not read package.json:', error.message);
        return [];
    }
}

/**
 * Load all Vue packages and their configurations
 * @param {string} projectRoot - Path to project root directory
 * @returns {Object} Object with inputs and aliases
 */
export async function loadAllPackages(projectRoot) {
    const inputs = [];
    const aliases = {};

    // Get packages from package.json
    const vuePackages = getVuePackagesFromPackageJson(projectRoot);

    if (vuePackages.length === 0) {
        console.warn('⚠️  No @devcats/*-vue packages found in package.json');
    }

    // Load each package
    for (const pkg of vuePackages) {
        const envVar = `${pkg.name.replace('@devcats/', '').replace(/-/g, '_').toUpperCase()}_PATH`;
        
        try {
            const packagePath = resolvePackage(
                pkg.name,
                pkg.path,
                envVar,
                projectRoot
            );

            const packageConfig = await loadPackageConfig(packagePath);
            if (packageConfig) {
                // Add resources
                packageConfig.resources.forEach(resource => {
                    inputs.push(path.join(packagePath, resource.file));
                });

                // Add aliases
                Object.entries(packageConfig.aliases).forEach(([aliasName, aliasPath]) => {
                    const absoluteAlias = path.isAbsolute(aliasPath)
                        ? aliasPath
                        : path.join(packagePath, aliasPath);
                    aliases[aliasName] = absoluteAlias;
                });
            } else {
                console.warn(`⚠️  No vite.config.mjs found for ${pkg.name}, skipping...`);
            }
        } catch (error) {
            // Skip optional packages, but warn
            if (pkg.name === '@devcats/atlas-cms-vue') {
                // AtlasCMS-Vue is required
                console.error(`⚠️  ${pkg.name}:`, error.message);
                throw error;
            } else {
                // Other packages are optional
                console.warn(`⚠️  ${pkg.name} not found (optional):`, error.message.split('\n')[0]);
            }
        }
    }

    // Project root aliases
    aliases['@packages'] = path.resolve(projectRoot, 'packages');
    aliases['@vendor'] = path.resolve(projectRoot, 'vendor');

    return { inputs, aliases };
}

