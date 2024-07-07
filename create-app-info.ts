import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

interface Package {
    name: string;
    version: string;
    description: string;
    author: string;
    homepage: string;
    license: string;
    dependencies: Record<string, string>;
}

interface ApplicationInfo {
    name: string;
    version: string;
    description: string;
    author: string;
    homepage: string;
    license: string;
    libraries: Library[];
}

interface Library {
    name: string;
    version: string;
    description: string;
    license: string;
    homepage: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

await main();

async function main(): Promise<void> {
    const project: Package = await read(resolve(__dirname, 'package.json'));
    const file = resolve(__dirname, 'projects/aas-server/app-info.json');
    const appInfo = await read<ApplicationInfo>(file);

    appInfo.name = project.name;
    appInfo.version = project.version;
    appInfo.description = project.description;
    appInfo.author = project.author;
    appInfo.homepage = project.homepage;
    appInfo.license = project.license;
    appInfo.libraries = await readLibrariesAsync(project);

    await write(file, appInfo);
}

async function read<T>(file: string): Promise<T> {
    return JSON.parse((await readFile(file)).toString());
}

function write(file: string, data: object): Promise<void> {
    return writeFile(file, JSON.stringify(data, undefined, 2));
}

async function readLibrariesAsync(project: Package): Promise<Library[]> {
    const libraries: Library[] = [];
    const nodeModulesFolder = join(__dirname, 'node_modules');
    if (existsSync(nodeModulesFolder)) {
        for (const name in project.dependencies) {
            const packageFile = join(nodeModulesFolder, name, 'package.json');
            if (existsSync(packageFile)) {
                try {
                    const pkg = JSON.parse((await readFile(packageFile)).toString());
                    libraries.push({
                        name: pkg.name,
                        version: pkg.version,
                        description: pkg.description,
                        license: pkg.license,
                        homepage: pkg.homepage,
                    });
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }

    return libraries;
}