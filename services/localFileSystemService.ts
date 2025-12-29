
import { GithubRepo } from '../types';

export class LocalFileSystemService {
    async scanForRepos(directoryHandle: FileSystemDirectoryHandle, path: string = ''): Promise<GithubRepo[]> {
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
            const repo = await this.extractRepoMetadata(directoryHandle, path || directoryHandle.name);
            repos.push(repo);
            // Usually we don't scan inside a git repo for other git repos, 
            // but some monorepos might have them. For now, let's stop here for this branch.
            return repos;
        }

        // If not a git repo, recurse into subdirectories
        for await (const entry of (directoryHandle as any).values()) {
            if (entry.kind === 'directory') {
                const subRepos = await this.scanForRepos(entry, path ? `${path}/${entry.name}` : entry.name);
                repos.push(...subRepos);
            }
        }

        return repos;
    }

    private async extractRepoMetadata(handle: FileSystemDirectoryHandle, path: string): Promise<GithubRepo> {
        let description = '';
        let language = 'Unknown';
        let readmeContent = '';

        try {
            const readmeHandle = await handle.getFileHandle('README.md');
            const file = await readmeHandle.getFile();
            readmeContent = await file.text();
            // Extract first paragraph of readme as description if not found elsewhere
            description = readmeContent.split('\n').find(l => l.trim() && !l.startsWith('#'))?.substring(0, 160) || '';
        } catch {
            // No README
        }

        try {
            const pkgHandle = await handle.getFileHandle('package.json');
            const file = await pkgHandle.getFile();
            const pkg = JSON.parse(await file.text());
            if (!description) description = pkg.description || '';
            language = 'JavaScript/TypeScript';
        } catch {
            // No package.json
        }

        return {
            id: Math.floor(Math.random() * 1000000), // Random ID for local repos
            name: handle.name,
            full_name: `local/${path}`,
            description: description || 'Local repository',
            private: true,
            html_url: '',
            language: language,
            updated_at: new Date().toISOString(),
            readme_content: readmeContent,
            default_branch: 'main',
            isLocal: true,
            localPath: path
        };
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
