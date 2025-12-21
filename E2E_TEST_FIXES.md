# E2E Test Failures - Mitigation Plan

## Executive Summary

7 out of 13 E2E tests are failing due to timing and state management issues. All failures are related to:
1. **Async operations completing too fast** (toasts/loading states disappear before assertions)
2. **Navigation clearing state** (toasts dismissed when navigating to dashboard)
3. **API route interception timing** (mocks may not be registered before fetch)
4. **Focus state transitions** (Tab key navigation has intermediate states)

**Root Cause**: Tests are making assertions on transient UI states that change faster than the test can observe them.

**Impact**: Core functionality works (6 tests pass), but async feedback mechanisms need better test strategies.

---

## Test Failure Analysis & Mitigation Strategies

### 1. ❌ should show loading state on settings save

**Current Test**:
```typescript
await page.click('button[type="submit"]:has-text("Save Config")');
await expect(page.locator('button:has-text("Saving...")')).toBeVisible({ timeout: 1000 });
```

**Root Cause**:
- `handleSaveSettings` completes instantly with mocked API
- "Saving..." state only visible for ~50-100ms
- Assertion happens after state already cleared

**Mitigation Strategy**:

**Option A: Network Delay (Recommended)**
Add artificial delay to mock response to simulate real network conditions:

```typescript
await page.route('https://api.github.com/user/repos*', async route => {
  await page.waitForTimeout(500); // Simulate 500ms network latency
  route.fulfill({
    status: 200,
    body: JSON.stringify([]),
  });
});
```

**Option B: Immediate Assertion**
Assert loading state exists immediately after click, before any await:

```typescript
const submitButton = page.locator('button[type="submit"]');
const submitPromise = submitButton.click();
// Assert loading state synchronously
await expect(page.locator('button:has-text("Saving...")')).toBeVisible({ timeout: 100 });
await submitPromise; // Wait for click to complete
```

**Option C: State Inspection**
Use Playwright's waitFor with custom predicate:

```typescript
await page.click('button[type="submit"]');
await page.waitForFunction(() => {
  const btn = document.querySelector('button[type="submit"]');
  return btn?.textContent?.includes('Saving...') || btn?.disabled;
}, { timeout: 500 });
```

**Recommended Fix**: Option A - Add 500ms delay to all API mocks for realistic testing

---

### 2. ❌ should show toast notification on successful save

**Current Test**:
```typescript
await page.click('button[type="submit"]:has-text("Save Config")');
await expect(page.locator('[role="alert"]:has-text("Loaded 1 repositories")')).toBeVisible({ timeout: 5000 });
```

**Root Cause**:
- `handleSaveSettings` calls `setView(View.DASHBOARD)` before toast appears
- Navigation to dashboard may unmount/remount components
- Toast state might be cleared during navigation
- API completes too fast, toast appears and auto-dismisses before assertion

**Mitigation Strategy**:

**Option A: Wait for Navigation First (Recommended)**
```typescript
await page.click('button[type="submit"]');

// Wait for navigation to dashboard
await expect(page.locator('h2:has-text("Repository Explorer")')).toBeVisible();

// Then wait for toast
await expect(page.locator('[role="alert"]:has-text("Loaded 1 repositories")')).toBeVisible({ timeout: 2000 });
```

**Option B: Add Network Delay**
Same as Test 1 - add 500ms delay to API mock

**Option C: Increase Auto-Dismiss Timeout for Tests**
Modify App.tsx to use longer toast timeout in test environment:

```typescript
// In App.tsx
const toastTimeout = process.env.NODE_ENV === 'test' ? 10000 : 4000;

useEffect(() => {
  if (toast) {
    const timer = setTimeout(() => setToast(null), toastTimeout);
    return () => clearTimeout(timer);
  }
}, [toast]);
```

**Option D: Test Toast Count Instead of Specific Message**
```typescript
await page.click('button[type="submit"]');
await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
// Toast exists, content verification is secondary
```

**Recommended Fix**: Option A + Network delay (combine strategies)

---

### 3. ❌ should display repositories after successful API call

**Current Test**:
```typescript
await page.click('button[type="submit"]');
await expect(page.locator('h2:has-text("Repository Explorer")')).toBeVisible({ timeout: 5000 });
await expect(page.locator('text=awesome-project')).toBeVisible();
```

**Root Cause**:
- API route mock might not be intercepted
- Route handler might not be registered before fetch is triggered
- Repos state might not be set properly from mock data

**Mitigation Strategy**:

**Option A: Verify Route Registration (Recommended)**
```typescript
// Set up route BEFORE navigating to settings
await page.route('https://api.github.com/user/repos*', route => {
  console.log('Mock API called'); // Debug log
  route.fulfill({
    status: 200,
    body: JSON.stringify([...repos]),
  });
});

// Wait for route to be registered
await page.waitForTimeout(100);

// Then proceed with test
await page.click('button:has-text("Settings")');
```

**Option B: Wait for Network Idle**
```typescript
await page.click('button[type="submit"]');
await page.waitForLoadState('networkidle');
await expect(page.locator('text=awesome-project')).toBeVisible();
```

**Option C: Wait for Specific Network Request**
```typescript
const responsePromise = page.waitForResponse('https://api.github.com/user/repos*');
await page.click('button[type="submit"]');
await responsePromise;
await expect(page.locator('text=awesome-project')).toBeVisible();
```

**Option D: Increase Timeout and Add Explicit Wait**
```typescript
await page.click('button[type="submit"]');
await expect(page.locator('h2:has-text("Repository Explorer")')).toBeVisible({ timeout: 5000 });

// Wait for grid to render
await page.waitForSelector('.grid', { state: 'visible' });

// Wait for specific repo
await expect(page.locator('text=awesome-project')).toBeVisible({ timeout: 3000 });
```

**Recommended Fix**: Option A + Option C (verify route + wait for response)

---

### 4. ❌ should show error toast on API failure

**Current Test**:
```typescript
await page.route('https://api.github.com/user/repos*', route => {
  route.fulfill({ status: 401, body: JSON.stringify({ message: 'Bad credentials' }) });
});
await page.click('button[type="submit"]');
await expect(page.locator('[role="alert"]:has-text("Bad credentials")')).toBeVisible({ timeout: 5000 });
```

**Root Cause**:
- Same as Test 2 - navigation clears toast
- Error handling in fetchRepos might not properly extract message
- Toast auto-dismisses too quickly

**Mitigation Strategy**:

**Option A: Check Error Banner Instead**
The app shows error in both toast AND error banner. Test the persistent error banner:

```typescript
await page.click('button[type="submit"]');
await expect(page.locator('.bg-red-500\\/10:has-text("Bad credentials")')).toBeVisible({ timeout: 5000 });
```

**Option B: Intercept Error Early**
```typescript
const errorPromise = page.waitForResponse(resp =>
  resp.url().includes('user/repos') && resp.status() === 401
);
await page.click('button[type="submit"]');
await errorPromise;

// Immediately check for toast
await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 1000 });
```

**Option C: Add Network Delay**
```typescript
await page.route('https://api.github.com/user/repos*', async route => {
  await page.waitForTimeout(300);
  route.fulfill({ status: 401, body: JSON.stringify({ message: 'Bad credentials' }) });
});
```

**Recommended Fix**: Option A (test persistent error banner) + Option C (network delay)

---

### 5. ❌ should filter repositories by search

**Current Test**:
```typescript
await page.click('button[type="submit"]');
await expect(page.locator('text=react-app')).toBeVisible({ timeout: 5000 });
await expect(page.locator('text=python-script')).toBeVisible();
await page.fill('#search-repos', 'react');
```

**Root Cause**:
- Same as Test 3 - repos not loading from mock
- Search filter renders immediately but repos array is empty

**Mitigation Strategy**:

**Option A: Wait for Specific Count (Recommended)**
```typescript
await page.click('button[type="submit"]');

// Wait for result count to update
await expect(page.locator('text=/2 results?/')).toBeVisible({ timeout: 5000 });

// Now repos are loaded, wait for specific repos
await expect(page.locator('text=react-app')).toBeVisible();
await expect(page.locator('text=python-script')).toBeVisible();

// Now search
await page.fill('#search-repos', 'react');
await expect(page.locator('text=/1 results?/')).toBeVisible();
```

**Option B: Wait for Grid to Populate**
```typescript
await page.click('button[type="submit"]');

// Wait for grid container to have children
await page.waitForFunction(() => {
  const grid = document.querySelector('.grid');
  return grid && grid.children.length >= 2;
}, { timeout: 5000 });

// Now test filter
await page.fill('#search-repos', 'react');
```

**Option C: Use Data Attributes for Testing**
Add test IDs to repos in App.tsx:

```typescript
<div key={repo.id} data-testid={`repo-${repo.id}`} className="...">
```

Then test:
```typescript
await expect(page.locator('[data-testid="repo-1"]')).toBeVisible();
await expect(page.locator('[data-testid="repo-2"]')).toBeVisible();
```

**Recommended Fix**: Option A (wait for result count) - most reliable

---

### 6. ❌ should show disabled state on buttons during async operations

**Current Test**:
```typescript
const submitButton = page.locator('button[type="submit"]');
await submitButton.click();
await expect(submitButton).toBeDisabled({ timeout: 500 });
```

**Root Cause**:
- After click, button is in DOM but re-renders on navigation
- Navigation to Dashboard causes Settings form to unmount
- Button is no longer in DOM, causing "element(s) not found"

**Mitigation Strategy**:

**Option A: Assert Before Navigation (Recommended)**
```typescript
// Add delay to API to keep button disabled longer
await page.route('https://api.github.com/user/repos*', async route => {
  await page.waitForTimeout(1000);
  route.fulfill({ status: 200, body: JSON.stringify([]) });
});

const submitButton = page.locator('button[type="submit"]');

// Start click but don't await
const clickPromise = submitButton.click();

// Immediately check disabled state
await expect(submitButton).toBeDisabled({ timeout: 200 });

// Wait for operation to complete
await clickPromise;
```

**Option B: Test Refresh Button Instead**
Refresh button stays in DOM during loading:

```typescript
await page.route('https://api.github.com/user/repos*', async route => {
  await page.waitForTimeout(800);
  route.fulfill({ status: 200, body: JSON.stringify([]) });
});

const refreshButton = page.locator('button[aria-label="Refresh repositories"]');
const clickPromise = refreshButton.click();

// Button should be disabled
await expect(refreshButton).toBeDisabled({ timeout: 200 });

// Wait for completion
await clickPromise;
```

**Option C: Check for Disabled Attribute Immediately**
```typescript
const submitButton = page.locator('button[type="submit"]');
await submitButton.click();

// Use evaluate to check disabled synchronously
const isDisabled = await page.evaluate(() => {
  const btn = document.querySelector('button[type="submit"]');
  return btn?.hasAttribute('disabled');
});

expect(isDisabled).toBe(true);
```

**Recommended Fix**: Option B (test refresh button) - stays in DOM

---

### 7. ❌ keyboard navigation should work with Tab key

**Current Test**:
```typescript
await page.click('button:has-text("Settings")');
await page.keyboard.press('Tab');
await expect(page.locator('#github-username')).toBeFocused();
```

**Root Cause**:
- After clicking Settings, focus is on Settings button
- First Tab moves focus to next interactive element (could be Cancel button, form label, etc.)
- Need to account for focus order: Settings button → ... → username input

**Mitigation Strategy**:

**Option A: Click Input to Focus (Recommended)**
```typescript
await page.click('button:has-text("Settings")');

// Click into the form to establish focus context
await page.click('#github-username');
await expect(page.locator('#github-username')).toBeFocused();

// Now test Tab navigation within form
await page.keyboard.press('Tab');
await expect(page.locator('#github-token')).toBeFocused();

await page.keyboard.press('Tab');
await expect(page.locator('button[type="submit"]')).toBeFocused();
```

**Option B: Focus First Input Explicitly**
```typescript
await page.click('button:has-text("Settings")');

// Focus the first input
await page.locator('#github-username').focus();
await expect(page.locator('#github-username')).toBeFocused();

// Test Tab sequence
await page.keyboard.press('Tab');
await expect(page.locator('#github-token')).toBeFocused();
```

**Option C: Test Complete Tab Sequence**
```typescript
await page.click('button:has-text("Settings")');

// Tab from Settings button through all focusable elements
const focusSequence = [
  'button:has-text("Dashboard")',  // First sidebar button
  'button:has-text("Settings")',   // Already focused
  // ... other sidebar elements
  '#github-username',              // First form input
];

// Tab until we reach username
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.id);
  if (focused === 'github-username') break;
}

await expect(page.locator('#github-username')).toBeFocused();
```

**Option D: Skip to Form Content**
```typescript
await page.click('button:has-text("Settings")');

// Use accesskey or direct focus
await page.evaluate(() => {
  document.querySelector('#github-username')?.focus();
});

// Verify focus
await expect(page.locator('#github-username')).toBeFocused();

// Test Tab within form
await page.keyboard.press('Tab');
await expect(page.locator('#github-token')).toBeFocused();
```

**Recommended Fix**: Option A (click to focus) - most realistic user behavior

---

## Implementation Plan

### Phase 1: Network Delay Infrastructure (30 min)

**Create test helper for consistent API mocking:**

```typescript
// e2e/helpers/apiMocks.ts
export async function mockGitHubAPI(
  page: Page,
  options: {
    repos?: any[];
    delay?: number;
    status?: number;
    errorMessage?: string;
  } = {}
) {
  const {
    repos = [],
    delay = 500,
    status = 200,
    errorMessage
  } = options;

  await page.route('https://api.github.com/user/repos*', async route => {
    // Add realistic network delay
    if (delay > 0) {
      await page.waitForTimeout(delay);
    }

    // Handle error responses
    if (status !== 200) {
      route.fulfill({
        status,
        body: JSON.stringify({ message: errorMessage || 'API Error' }),
      });
      return;
    }

    // Handle success responses
    route.fulfill({
      status: 200,
      body: JSON.stringify(repos),
    });
  });

  // Allow route to register
  await page.waitForTimeout(50);
}
```

### Phase 2: Update Test Suite (60 min)

**Fix each test using recommended strategies:**

1. **Test 1 & 2**: Add network delay helper
2. **Test 3 & 5**: Wait for result count before assertions
3. **Test 4**: Test error banner instead of toast
4. **Test 6**: Test refresh button with delay
5. **Test 7**: Click to focus input first

### Phase 3: Add Test Utilities (30 min)

**Create reusable test helpers:**

```typescript
// e2e/helpers/testUtils.ts

export async function login(page: Page, username: string, token: string) {
  await page.click('button:has-text("Settings")');
  await page.fill('#github-username', username);
  await page.fill('#github-token', token);
  await page.click('button[type="submit"]');
}

export async function waitForRepos(page: Page, count: number) {
  const pattern = new RegExp(`${count} results?`);
  await expect(page.locator(`text=${pattern}`)).toBeVisible({ timeout: 5000 });
}

export async function waitForToast(page: Page, message?: string) {
  const selector = message
    ? `[role="alert"]:has-text("${message}")`
    : '[role="alert"]';
  await expect(page.locator(selector)).toBeVisible({ timeout: 2000 });
}
```

### Phase 4: Refactor Tests (60 min)

Apply fixes to all 7 failing tests with new helpers

### Phase 5: Add Missing Coverage (90 min)

**Add new tests:**
1. Modal interactions (ESC key, focus trap)
2. Repository analysis flow
3. Delete repository with confirmation
4. Cache behavior
5. Sort and filter combinations

---

## Success Criteria

- ✅ All 13 existing tests pass
- ✅ Test execution time < 30 seconds
- ✅ No flaky tests (100% pass rate over 5 runs)
- ✅ Code coverage > 80% for interactive features
- ✅ Tests run reliably in CI/CD

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Network Delay Infrastructure | 30 min | API mock helper |
| 2. Update Test Suite | 60 min | 7 tests fixed |
| 3. Add Test Utilities | 30 min | Helper functions |
| 4. Refactor Tests | 60 min | Clean test code |
| 5. Add Missing Coverage | 90 min | 5+ new tests |
| **Total** | **4.5 hours** | **18+ passing tests** |

---

## Risk Mitigation

### Risk 1: Timing Issues Persist
**Mitigation**: Increase network delays to 800-1000ms if 500ms insufficient

### Risk 2: Route Interception Fails
**Mitigation**: Use `page.waitForResponse()` to verify mocks are called

### Risk 3: Flaky Tests in CI
**Mitigation**: Add `retries: 2` in playwright.config.ts for CI environment

### Risk 4: Test Execution Too Slow
**Mitigation**: Reduce network delays in passing tests, keep delays only where needed

---

## Alternative Approach: Component Testing

If E2E timing issues persist, consider:

**Vitest + React Testing Library** for component-level tests:
- Faster execution (no browser startup)
- Direct state manipulation (no timing issues)
- Better for testing React-specific behavior
- Complement E2E with unit/integration tests

**When to use each:**
- **E2E**: Critical user flows, integration testing
- **Component Tests**: Async state, edge cases, error handling
- **Unit Tests**: Pure functions, utilities, services

---

## Next Steps

1. **Implement Phase 1** (API mock helper)
2. **Fix Test 6 first** (simplest - test refresh button)
3. **Fix Test 7** (second simplest - click to focus)
4. **Fix Tests 1-5** (use API helper with delays)
5. **Validate** (run tests 5 times, verify 100% pass rate)
6. **Document** (update test README with patterns)

---

## Appendix: Quick Reference

### Common Wait Patterns

```typescript
// Wait for element
await expect(page.locator('...')).toBeVisible({ timeout: 5000 });

// Wait for network
await page.waitForLoadState('networkidle');
await page.waitForResponse('https://api.github.com/...');

// Wait for state change
await page.waitForFunction(() => condition, { timeout: 5000 });

// Wait for element count
await page.waitForSelector('.item:nth-child(3)');
```

### Debugging Failed Tests

```typescript
// Take screenshot
await page.screenshot({ path: 'debug.png', fullPage: true });

// Log page HTML
console.log(await page.content());

// Log specific element
const element = page.locator('...');
console.log(await element.innerHTML());

// Pause test execution
await page.pause();
```
