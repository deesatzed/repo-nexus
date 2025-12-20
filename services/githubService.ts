
import { GithubRepo } from '../types';

export class GithubService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async fetchUserRepos(username: string): Promise<GithubRepo[]> {
    const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async fetchRepoReadme(fullName: string): Promise<string> {
    const response = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3.raw',
      },
    });

    if (!response.ok) {
        if (response.status === 404) return "No README found.";
        throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    return response.text();
  }

  async deleteRepo(fullName: string): Promise<void> {
    const response = await fetch(`https://api.github.com/repos/${fullName}`, {
      method: 'DELETE',
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (response.status !== 204) {
      throw new Error(`Failed to delete repository. Status: ${response.statusText}. Note: Your token needs the 'delete_repo' scope.`);
    }
  }
}
