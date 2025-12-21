import { Page, expect } from '@playwright/test';

/**
 * Login helper - navigate to settings and save credentials
 */
export async function login(page: Page, username: string, token: string) {
  await page.click('button:has-text("Settings")');
  await page.fill('#github-username', username);
  await page.fill('#github-token', token);
  await page.click('button[type="submit"]');
}

/**
 * Wait for repositories to load by checking grid children
 */
export async function waitForRepos(page: Page, count: number, timeout: number = 5000) {
  // Wait for grid to populate with the expected number of repos
  await page.waitForFunction(
    (expectedCount) => {
      const grid = document.querySelector('.grid');
      if (!grid) return false;
      // Count direct children that are repo cards (have bg- class)
      const repoCards = grid.querySelectorAll(':scope > div[class*="bg-"]');
      return repoCards.length === expectedCount;
    },
    count,
    { timeout }
  );
}

/**
 * Wait for toast notification to appear
 */
export async function waitForToast(page: Page, message?: string, timeout: number = 2000) {
  const selector = message
    ? `[role="alert"]:has-text("${message}")`
    : '[role="alert"]';
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, viewName: string, timeout: number = 5000) {
  const headerText = viewName === 'Dashboard' ? 'Repository Explorer' : 'Configuration';
  await expect(page.locator(`h2:has-text("${headerText}")`)).toBeVisible({ timeout });
}

/**
 * Dismiss toast notification if visible
 */
export async function dismissToast(page: Page) {
  const toast = page.locator('[role="alert"]');
  const isVisible = await toast.isVisible().catch(() => false);

  if (isVisible) {
    await page.locator('[role="alert"] button[aria-label="Dismiss notification"]').click();
    await expect(toast).not.toBeVisible();
  }
}

/**
 * Wait for error banner to appear
 */
export async function waitForErrorBanner(page: Page, message?: string, timeout: number = 3000) {
  const selector = message
    ? `.bg-red-500\\/10:has-text("${message}")`
    : '.bg-red-500\\/10';
  await expect(page.locator(selector)).toBeVisible({ timeout });
}

/**
 * Wait for loading state to complete
 */
export async function waitForLoadingComplete(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    return spinners.length === 0;
  }, { timeout: 10000 });
}

/**
 * Get the count of visible repositories
 */
export async function getVisibleRepoCount(page: Page): Promise<number> {
  return await page.locator('.grid > div[class*="bg-"]').count();
}

/**
 * Focus an input and verify it's focused
 */
export async function focusInput(page: Page, selector: string) {
  await page.locator(selector).click();
  await expect(page.locator(selector)).toBeFocused();
}
