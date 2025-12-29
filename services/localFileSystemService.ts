
import { GithubRepo } from '../types';

export class LocalFileSystemService {
    async scanForRepos(directoryHandle: FileSystemDirectoryHandle, path: string = ''): Promise<GithubRepo[]> {
        console.log(`Scanning folder: ${directoryHandle.name} (path: ${path})`);

        const repos: GithubRepo[] = [];

        // Check if this directory is a git repo
        let isGit = false;
        try {
            await directoryHandle.getDirectoryHandle('.git');
            isGit = true;
        } catch {
            // Not a git repo directly
        }

        if (isGit) {
            console.log(`✅ Found Git Repo at: ${path || directoryHandle.name}`);
            const repo = await this.extractRepoMetadata(directoryHandle, path || directoryHandle.name);
            repos.push(repo);
            return repos;
        }

        // If not a git repo, recurse into subdirectories
        try {
            for await (const entry of (directoryHandle as any).values()) {
                if (entry.kind === 'directory') {
                    // Skip common noise folders and hidden folders (except we already checked for .git)
                    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build' || entry.name.startsWith('.')) {
                        continue;
                    }

                    try {
                        const subRepos = await this.scanForRepos(entry, path ? `${path}/${entry.name}` : entry.name);
                        repos.push(...subRepos);
                    } catch (subErr) {
                        console.warn(`Skipping directory ${entry.name} due to error:`, subErr);
                    }
                }
            }
        } catch (err) {
            console.error(`Failed to iterate directory ${directoryHandle.name}:`, err);
        }

        return repos;
    }

    private async extractRepoMetadata(handle: FileSystemDirectoryHandle, path: string): Promise<GithubRepo & { techSignature?: any }> {
        let description = '';
        let language = 'Unknown';
        let readmeContent = '';
        let techSignature: any = {
            detectedFiles: [],
            dependencies: [],
            buildSystem: 'unknown'
        };

        // 1. Try to read README
        try {
            const readmeHandle = await handle.getFileHandle('README.md');
            const file = await readmeHandle.getFile();
            readmeContent = await file.text();
            description = readmeContent.split('\n').find(l => l.trim() && !l.startsWith('#'))?.substring(0, 160) || '';
        } catch { /* No README */ }

        // 2. Forensic Scan for Config Files & Dependencies
        // Check for package.json (Node/JS)
        try {
            const pkgHandle = await handle.getFileHandle('package.json');
            techSignature.detectedFiles.push('package.json');
            techSignature.buildSystem = 'npm/yarn';
            language = 'TypeScript/JavaScript';

            const file = await pkgHandle.getFile();
            const text = await file.text();
            const pkg = JSON.parse(text);
            if (!description) description = pkg.description || '';

            // Extract top dependencies to catch conflicts/overlaps
            const rawDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            techSignature.dependencies = Object.keys(rawDeps).slice(0, 15); // Top 15 to save context
        } catch { /* Not a Node repo */ }

        // Check for other common configs (Python, Rust, Docker, etc)
        const commonConfigs = ['requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'Dockerfile', 'docker-compose.yml', 'tsconfig.json', 'vite.config.ts', 'next.config.js'];

        for (const configName of commonConfigs) {
            try {
                await handle.getFileHandle(configName);
                techSignature.detectedFiles.push(configName);
                if (configName.endsWith('.toml')) language = 'Rust/Python';
                if (configName.endsWith('.go')) language = 'Go';
                if (configName === 'requirements.txt') language = 'Python';
                if (configName === 'Dockerfile') techSignature.hasDocker = true;
            } catch { /* File doesn't exist */ }
        }

        return {
            id: Math.floor(Math.random() * 1000000),
            name: handle.name,
            full_name: `local/${path}`,
            description: description || 'Local repository',
            private: true,
            html_url: '',
            language: language,
            updated_at: new Date().toISOString(), // In a real app, we'd get file mtime, but FileSystemAccessAPI doesn't expose it easily for directories without iterating files
            readme_content: readmeContent,
            default_branch: 'main',
            isLocal: true,
            localPath: path,
            techSignature // Pass this new hard data along
        } as any;
    }

    async selectAndScan(): Promise<GithubRepo[]> {
        try {
            const handle = await (window as any).showDirectoryPicker();
            return await this.scanForRepos(handle);
        } catch (err) {
            console.error('Error selecting directory:', err);
            throw err;
        }
    }
}
