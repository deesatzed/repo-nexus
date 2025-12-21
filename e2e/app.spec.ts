import { test, expect } from '@playwright/test';

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
    // Mock the GitHub API to avoid real API calls
    await page.route('https://api.github.com/user/repos*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Fill in credentials
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');

    // Click save
    await page.click('button[type="submit"]:has-text("Save Config")');

    // Verify loading state appears
    await expect(page.locator('button:has-text("Saving...")')).toBeVisible({ timeout: 1000 });
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
    // Mock the GitHub API
    await page.route('https://api.github.com/user/repos*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 1,
            name: 'test-repo',
            full_name: 'testuser/test-repo',
            description: 'Test repository',
            language: 'JavaScript',
            private: false,
            updated_at: new Date().toISOString(),
            default_branch: 'main'
          }
        ]),
      });
    });

    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Fill in and save
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');
    await page.click('button[type="submit"]:has-text("Save Config")');

    // Wait for toast notification
    await expect(page.locator('[role="alert"]:has-text("Loaded 1 repositories")')).toBeVisible({ timeout: 5000 });
  });

  test('should display repositories after successful API call', async ({ page }) => {
    // Mock the GitHub API
    await page.route('https://api.github.com/user/repos*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 1,
            name: 'awesome-project',
            full_name: 'testuser/awesome-project',
            description: 'An awesome project',
            language: 'TypeScript',
            private: false,
            updated_at: new Date().toISOString(),
            default_branch: 'main'
          },
          {
            id: 2,
            name: 'another-repo',
            full_name: 'testuser/another-repo',
            description: 'Another repository',
            language: 'Python',
            private: true,
            updated_at: new Date().toISOString(),
            default_branch: 'main'
          }
        ]),
      });
    });

    // Set credentials and save
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(page.locator('h2:has-text("Repository Explorer")')).toBeVisible({ timeout: 5000 });

    // Verify repositories are displayed
    await expect(page.locator('text=awesome-project')).toBeVisible();
    await expect(page.locator('text=another-repo')).toBeVisible();
    await expect(page.locator('text=TypeScript')).toBeVisible();
    await expect(page.locator('text=Python')).toBeVisible();
  });

  test('should show error toast on API failure', async ({ page }) => {
    // Mock the GitHub API to return an error
    await page.route('https://api.github.com/user/repos*', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({
          message: 'Bad credentials'
        }),
      });
    });

    // Set credentials and save
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'invalid_token');
    await page.click('button[type="submit"]');

    // Wait for error toast
    await expect(page.locator('[role="alert"]:has-text("Bad credentials")')).toBeVisible({ timeout: 5000 });
  });

  test('should allow dismissing toast notification', async ({ page }) => {
    // Mock the GitHub API
    await page.route('https://api.github.com/user/repos*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    });

    // Trigger a toast
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');
    await page.click('button[type="submit"]');

    // Wait for toast to appear
    const toast = page.locator('[role="alert"]');
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Click dismiss button
    await page.locator('[role="alert"] button[aria-label="Dismiss notification"]').click();

    // Verify toast is gone
    await expect(toast).not.toBeVisible();
  });

  test('should filter repositories by search', async ({ page }) => {
    // Mock the GitHub API
    await page.route('https://api.github.com/user/repos*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 1,
            name: 'react-app',
            full_name: 'testuser/react-app',
            description: 'A React application',
            language: 'JavaScript',
            private: false,
            updated_at: new Date().toISOString(),
            default_branch: 'main'
          },
          {
            id: 2,
            name: 'python-script',
            full_name: 'testuser/python-script',
            description: 'Python automation script',
            language: 'Python',
            private: false,
            updated_at: new Date().toISOString(),
            default_branch: 'main'
          }
        ]),
      });
    });

    // Set credentials
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');
    await page.click('button[type="submit"]');

    // Wait for repos to load
    await expect(page.locator('text=react-app')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=python-script')).toBeVisible();

    // Search for "react"
    await page.fill('#search-repos', 'react');

    // Verify only React app is visible
    await expect(page.locator('text=react-app')).toBeVisible();
    await expect(page.locator('text=python-script')).not.toBeVisible();

    // Clear search
    await page.fill('#search-repos', '');

    // Verify both are visible again
    await expect(page.locator('text=react-app')).toBeVisible();
    await expect(page.locator('text=python-script')).toBeVisible();
  });

  test('should show disabled state on buttons during async operations', async ({ page }) => {
    // Mock the GitHub API with a delay
    await page.route('https://api.github.com/user/repos*', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify([]),
        });
      }, 1000);
    });

    // Navigate to settings
    await page.click('button:has-text("Settings")');
    await page.fill('#github-username', 'testuser');
    await page.fill('#github-token', 'ghp_testtoken123');

    // Click save
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Verify button is disabled during operation
    await expect(submitButton).toBeDisabled({ timeout: 500 });
  });

  test('should have accessible ARIA labels on icon buttons', async ({ page }) => {
    // Check refresh button
    const refreshButton = page.locator('button[aria-label="Refresh repositories"]');
    await expect(refreshButton).toBeVisible();

    // Navigate to settings to get tokens set
    await page.click('button:has-text("Settings")');
  });

  test('keyboard navigation should work with Tab key', async ({ page }) => {
    // Navigate to settings
    await page.click('button:has-text("Settings")');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('#github-username')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#github-token')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });
});
