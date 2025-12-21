import { Page } from '@playwright/test';

export interface MockGitHubAPIOptions {
  repos?: any[];
  delay?: number;
  status?: number;
  errorMessage?: string;
}

/**
 * Mock GitHub API with realistic network delays for testing
 */
export async function mockGitHubAPI(
  page: Page,
  options: MockGitHubAPIOptions = {}
) {
  const {
    repos = [],
    delay = 500,
    status = 200,
    errorMessage
  } = options;

  await page.route('https://api.github.com/user/repos*', async route => {
    // Add realistic network delay to prevent timing issues
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // Handle error responses
    if (status !== 200) {
      await route.fulfill({
        status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: errorMessage || 'API Error' }),
      });
      return;
    }

    // Handle success responses
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repos),
    });
  });

  // Allow route to register before proceeding
  await page.waitForTimeout(50);
}

/**
 * Create mock repository data for testing
 */
export function createMockRepo(overrides: Partial<any> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    name: 'test-repo',
    full_name: 'testuser/test-repo',
    description: 'Test repository',
    language: 'JavaScript',
    private: false,
    updated_at: new Date().toISOString(),
    default_branch: 'main',
    ...overrides
  };
}

/**
 * Mock README API endpoint
 */
export async function mockReadmeAPI(
  page: Page,
  repoFullName: string,
  content: string = 'Test README content',
  delay: number = 300
) {
  await page.route(`https://api.github.com/repos/${repoFullName}/readme`, async route => {
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    const base64Content = Buffer.from(content).toString('base64');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64'
      }),
    });
  });

  await page.waitForTimeout(50);
}
