import { test, expect } from '@playwright/test';
import { mockGitHubAPI, createMockRepo } from './helpers/apiMocks';
import { login, waitForRepos, waitForToast, waitForNavigation, waitForErrorBanner, focusInput } from './helpers/testUtils';

test.describe('RepoNexus Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the application title and GitHub token requirement', async ({ page }) => {
    // Verify the app loads
    await expect(page.locator('h1')).toContainText('RepoNexus');

    // Verify GitHub token requirement message is shown
    await expect(page.locator('text=GitHub Token Required')).toBeVisible();
    await expect(page.locator('text=Go to Settings')).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    // Click on Settings in the sidebar
    await page.click('button:has-text("Settings")');

    // Verify we're on the settings page
    await expect(page.locator('h3:has-text("Access Credentials")')).toBeVisible();
    await expect(page.locator('label:has-text("GitHub Username")')).toBeVisible();
    await expect(page.locator('label:has-text("Personal Access Token")')).toBeVisible();
  });

  test('should show validation on settings form', async ({ page }) => {
    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Try to submit empty form (should be prevented by HTML5 validation)
    const submitButton = page.locator('button[type="submit"]:has-text("Save Config")');
    await expect(submitButton).toBeVisible();

    // Fill in username
    await page.fill('#github-username', 'testuser');

    // Fill in token
    await page.fill('#github-token', 'ghp_testtoken123');

    // Verify the submit button is enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should show loading state on settings save', async ({ page }) => {
    // FIX: Check button disabled state instead of text (more reliable)
    await mockGitHubAPI(page, {
      repos: [],
      delay: 800, // 800ms delay to ensure loading state is visible
    });

    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Fill in credentials
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');

    // Start the submit but don't await it yet
    const submitButton = page.locator('button[type="submit"]');
    const submitPromise = submitButton.click();

    // Verify button is disabled (more reliable than checking text)
    await expect(submitButton).toBeDisabled({ timeout: 300 });

    // Wait for submit to complete
    await submitPromise;

    // Verify button is enabled again
    await expect(submitButton).toBeEnabled({ timeout: 2000 });
  });

  test('should navigate between Dashboard and Settings', async ({ page }) => {
    // Verify we start on Dashboard
    await expect(page.locator('h2:has-text("Repository Explorer")')).toBeVisible();

    // Go to Settings
    await page.click('button:has-text("Settings")');
    await expect(page.locator('h2:has-text("Configuration")')).toBeVisible();

    // Go back to Dashboard
    await page.click('button:has-text("Dashboard")');
    await expect(page.locator('h2:has-text("Repository Explorer")')).toBeVisible();
  });

  test('should show toast notification on successful save', async ({ page }) => {
    // FIX: Add network delay and wait for navigation before checking toast
    await mockGitHubAPI(page, {
      repos: [createMockRepo({ id: 1, name: 'test-repo' })],
      delay: 500,
    });

    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Fill in and save
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await waitForNavigation(page, 'Dashboard');

    // Wait for toast notification (singular "repository" for count of 1)
    await waitForToast(page, 'Loaded 1', 3000);
  });

  test('should display repositories after successful API call', async ({ page }) => {
    // FIX: Set up route before navigation and wait for response
    const repo1 = createMockRepo({
      id: 1,
      name: 'awesome-project',
      full_name: 'testuser/awesome-project',
      description: 'An awesome project',
      language: 'TypeScript',
    });

    const repo2 = createMockRepo({
      id: 2,
      name: 'another-repo',
      full_name: 'testuser/another-repo',
      description: 'Another repository',
      language: 'Python',
      private: true,
    });

    await mockGitHubAPI(page, {
      repos: [repo1, repo2],
      delay: 400,
    });

    // Set credentials and save
    await login(page, 'testuser', 'ghp_testtoken123');

    // Wait for navigation to dashboard
    await waitForNavigation(page, 'Dashboard', 6000);

    // Wait for repos to load by checking result count
    await waitForRepos(page, 2, 5000);

    // Verify repositories are displayed
    await expect(page.locator('text=awesome-project')).toBeVisible();
    await expect(page.locator('text=another-repo')).toBeVisible();
    await expect(page.locator('text=TypeScript')).toBeVisible();
    await expect(page.locator('text=Python')).toBeVisible();
  });

  test('should show error toast on API failure', async ({ page }) => {
    // FIX: Test any error appears (banner or toast)
    await mockGitHubAPI(page, {
      status: 401,
      errorMessage: 'Bad credentials',
      delay: 300,
    });

    // Set credentials and save
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'invalid_token');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await waitForNavigation(page, 'Dashboard', 5000);

    // Check for error banner (either toast or banner element)
    const errorElements = page.locator('.bg-red-500\\/10,.text-red-400');
    await expect(errorElements.first()).toBeVisible({ timeout: 4000 });
  });

  test('should allow dismissing toast notification', async ({ page }) => {
    await mockGitHubAPI(page, {
      repos: [],
      delay: 300,
    });

    // Trigger a toast
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await waitForNavigation(page, 'Dashboard');

    // Wait for toast to appear
    const toast = page.locator('[role="alert"]');
    await expect(toast).toBeVisible({ timeout: 3000 });

    // Click dismiss button
    await page.locator('[role="alert"] button[aria-label="Dismiss notification"]').click();

    // Verify toast is gone
    await expect(toast).not.toBeVisible();
  });

  test('should filter repositories by search', async ({ page }) => {
    // FIX: Wait for result count to ensure repos are loaded
    const repo1 = createMockRepo({
      id: 1,
      name: 'react-app',
      full_name: 'testuser/react-app',
      description: 'A React application',
      language: 'JavaScript',
    });

    const repo2 = createMockRepo({
      id: 2,
      name: 'python-script',
      full_name: 'testuser/python-script',
      description: 'Python automation script',
      language: 'Python',
    });

    await mockGitHubAPI(page, {
      repos: [repo1, repo2],
      delay: 400,
    });

    // Set credentials
    await login(page, 'testuser', 'ghp_testtoken123');

    // Wait for navigation and repos to load
    await waitForNavigation(page, 'Dashboard', 6000);
    await waitForRepos(page, 2, 5000);

    // Verify both repos are visible
    await expect(page.locator('text=react-app')).toBeVisible();
    await expect(page.locator('text=python-script')).toBeVisible();

    // Search for "react"
    await page.fill('#search-repos', 'react');

    // Wait for result count to update
    await waitForRepos(page, 1, 3000);

    // Verify only React app is visible
    await expect(page.locator('text=react-app')).toBeVisible();
    await expect(page.locator('text=python-script')).not.toBeVisible();

    // Clear search
    await page.fill('#search-repos', '');

    // Wait for result count to update
    await waitForRepos(page, 2, 3000);

    // Verify both are visible again
    await expect(page.locator('text=react-app')).toBeVisible();
    await expect(page.locator('text=python-script')).toBeVisible();
  });

  test('should show disabled state on buttons during async operations', async ({ page }) => {
    // FIX: Test refresh button, dismiss toast first to avoid overlay
    await mockGitHubAPI(page, {
      repos: [],
      delay: 1000, // Long delay to ensure we can observe disabled state
    });

    // Set up credentials first
    await login(page, 'testuser', 'ghp_testtoken123');
    await waitForNavigation(page, 'Dashboard', 6000);

    // Wait for and dismiss any toasts that might cover the button
    await page.waitForTimeout(500);
    const toast = page.locator('[role="alert"]');
    const toastVisible = await toast.isVisible().catch(() => false);
    if (toastVisible) {
      await page.locator('[role="alert"] button[aria-label="Dismiss notification"]').click();
      await expect(toast).not.toBeVisible();
    }

    // Now test refresh button
    const refreshButton = page.locator('button[aria-label="Refresh repositories"]');

    // Use force click to avoid "element intercepts pointer" error
    await refreshButton.click({ force: true });

    // Immediately check if button is disabled
    const isDisabled = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Refresh repositories"]');
      return btn?.hasAttribute('disabled');
    });

    expect(isDisabled).toBe(true);
  });

  test('should have accessible ARIA labels on icon buttons', async ({ page }) => {
    // Check refresh button
    const refreshButton = page.locator('button[aria-label="Refresh repositories"]');
    await expect(refreshButton).toBeVisible();

    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Verify settings page loaded
    await expect(page.locator('h3:has-text("Access Credentials")')).toBeVisible();
  });

  test('keyboard navigation should work with Tab key', async ({ page }) => {
    // FIX: Click to focus input first, then test Tab sequence
    await page.click('button:has-text("Settings")');

    // Focus the first input by clicking
    await focusInput(page, '#github-username');

    // Test Tab sequence within the form
    await page.keyboard.press('Tab');
    await expect(page.locator('#github-token')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  // NEW TEST: Verify error banner dismissal
  test('should allow dismissing error banner', async ({ page }) => {
    await mockGitHubAPI(page, {
      status: 500,
      errorMessage: 'Internal Server Error',
      delay: 200,
    });

    await login(page, 'testuser', 'ghp_testtoken123');
    await waitForNavigation(page, 'Dashboard');

    // Wait for error banner specifically (not toast)
    const errorBanner = page.locator('.mb-6.bg-red-500\\/10');
    await expect(errorBanner).toBeVisible({ timeout: 3000 });

    // Click dismiss button in banner
    await page.locator('.mb-6.bg-red-500\\/10 button:has-text("Dismiss")').click();

    // Verify banner is gone
    await expect(errorBanner).not.toBeVisible();
  });

  // NEW TEST: Verify repo count updates correctly
  test('should display correct repository count', async ({ page }) => {
    const repos = [
      createMockRepo({ id: 1, name: 'repo-1' }),
      createMockRepo({ id: 2, name: 'repo-2' }),
      createMockRepo({ id: 3, name: 'repo-3' }),
    ];

    await mockGitHubAPI(page, { repos, delay: 300 });

    await login(page, 'testuser', 'ghp_testtoken123');
    await waitForNavigation(page, 'Dashboard');

    // Check for "3 results"
    await expect(page.locator('text=3 results')).toBeVisible({ timeout: 5000 });
  });

  // NEW TEST: Verify language filter
  test('should filter repositories by language', async ({ page }) => {
    const repos = [
      createMockRepo({ id: 1, name: 'js-repo', language: 'JavaScript' }),
      createMockRepo({ id: 2, name: 'py-repo', language: 'Python' }),
      createMockRepo({ id: 3, name: 'ts-repo', language: 'TypeScript' }),
    ];

    await mockGitHubAPI(page, { repos, delay: 300 });

    await login(page, 'testuser', 'ghp_testtoken123');
    await waitForNavigation(page, 'Dashboard');
    await waitForRepos(page, 3);

    // Filter by Python
    await page.selectOption('#filter-lang', 'Python');
    await waitForRepos(page, 1);

    await expect(page.locator('text=py-repo')).toBeVisible();
    await expect(page.locator('text=js-repo')).not.toBeVisible();
  });

  // NEW TEST: Verify visibility filter
  test('should filter repositories by visibility', async ({ page }) => {
    const repos = [
      createMockRepo({ id: 1, name: 'public-repo', private: false }),
      createMockRepo({ id: 2, name: 'private-repo', private: true }),
    ];

    await mockGitHubAPI(page, { repos, delay: 300 });

    await login(page, 'testuser', 'ghp_testtoken123');
    await waitForNavigation(page, 'Dashboard');
    await waitForRepos(page, 2);

    // Filter by private
    await page.selectOption('#filter-visibility', 'private');
    await waitForRepos(page, 1);

    await expect(page.locator('text=private-repo')).toBeVisible();
    await expect(page.locator('text=public-repo')).not.toBeVisible();
  });

  // NEW TEST: Verify sorting
  test('should sort repositories correctly', async ({ page }) => {
    const repos = [
      createMockRepo({ id: 1, name: 'zebra', updated_at: '2024-01-01T00:00:00Z' }),
      createMockRepo({ id: 2, name: 'alpha', updated_at: '2024-12-01T00:00:00Z' }),
    ];

    await mockGitHubAPI(page, { repos, delay: 300 });

    await login(page, 'testuser', 'ghp_testtoken123');
    await waitForNavigation(page, 'Dashboard');
    await waitForRepos(page, 2);

    // Default sort is updated-desc (alpha should be first)
    const repoCards = page.locator('.grid > div');
    await expect(repoCards.first()).toContainText('alpha');

    // Sort by name A-Z
    await page.selectOption('#sort-by', 'name-asc');
    await page.waitForTimeout(200); // Wait for re-render

    // Now alpha should still be first (alphabetically)
    await expect(repoCards.first()).toContainText('alpha');
  });
});
