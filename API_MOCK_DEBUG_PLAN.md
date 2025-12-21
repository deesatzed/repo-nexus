# API Mock Debugging Plan - E2E Test Failures

## Executive Summary

**Problem**: 8 of 18 E2E tests are failing due to API route mocking not intercepting GitHub API requests. Repository data doesn't load despite mocks being configured.

**Impact**: 44% of tests failing, all data-driven tests blocked

**Goal**: Achieve 100% pass rate by resolving API mock interception timing issues

**Estimated Effort**: 2-4 hours of focused debugging

---

## Root Cause Hypothesis

All 8 failing tests share the same symptom: `waitForRepos()` times out because the repository grid remains empty (0 repos) despite mock returning data.

### Primary Hypotheses (Ordered by Likelihood)

1. **Route Handler Timing** (70% confidence)
   - Route handler registered but deregisters on page navigation
   - Navigation to Dashboard unmounts/remounts components, clearing mock context
   - API request fires before route handler is fully registered

2. **Route Pattern Mismatch** (20% confidence)
   - Mock pattern `https://api.github.com/user/repos*` doesn't match actual request
   - Query parameters or URL format differs from expected

3. **Request Sequence Issue** (10% confidence)
   - Application makes request during page load (before route registered)
   - Multiple simultaneous requests (only first intercepted)

### Evidence

**What Works**:
- ✅ Error state mocks (API errors intercepted correctly)
- ✅ Tests with no repo data dependency pass
- ✅ Route registration completes without errors

**What Fails**:
- ❌ Grid remains empty (0 repos)
- ❌ `waitForRepos()` times out after 5 seconds
- ❌ Success toast doesn't appear
- ❌ Repository count shows "0 results"

---

## Debugging Checklist

### Phase 1: Verify Mock is Called (30 minutes)

#### Step 1.1: Add Logging to Mock Function

**File**: `e2e/helpers/apiMocks.ts`

**Change**:
```typescript
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

  console.log('🔧 Registering GitHub API mock:', {
    repoCount: repos.length,
    delay,
    status,
    errorMessage
  });

  await page.route('https://api.github.com/user/repos*', async route => {
    console.log('🎯 Mock intercepted request:', route.request().url());
    console.log('   Method:', route.request().method());
    console.log('   Headers:', route.request().headers());

    if (delay > 0) {
      console.log(`   Applying ${delay}ms delay...`);
      await page.waitForTimeout(delay);
    }

    if (status !== 200) {
      console.log('   Returning error:', status, errorMessage);
      await route.fulfill({
        status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: errorMessage || 'API Error' }),
      });
      return;
    }

    console.log('   Returning success with', repos.length, 'repos');
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repos),
    });
  });

  await page.waitForTimeout(50);
  console.log('✅ Mock registration complete');
}
```

**Expected Output if Working**:
```
🔧 Registering GitHub API mock: { repoCount: 1, delay: 500, status: 200 }
✅ Mock registration complete
🎯 Mock intercepted request: https://api.github.com/user/repos?per_page=100
   Method: GET
   Headers: {...}
   Applying 500ms delay...
   Returning success with 1 repos
```

**Expected Output if Broken**:
```
🔧 Registering GitHub API mock: { repoCount: 1, delay: 500, status: 200 }
✅ Mock registration complete
(no intercept log - mock not triggered)
```

**Action**: Run test and check console output
```bash
npx playwright test --grep "should display repositories" --headed
```

---

#### Step 1.2: Listen for All Network Requests

**Test File**: `e2e/app.spec.ts`

**Add to test**:
```typescript
test('DEBUG: should display repositories after successful API call', async ({ page }) => {
  // Log ALL network requests
  page.on('request', request => {
    console.log('📤 Request:', request.method(), request.url());
  });

  page.on('response', response => {
    console.log('📥 Response:', response.status(), response.url());
  });

  await mockGitHubAPI(page, {
    repos: [
      createMockRepo({ id: 1, name: 'repo-1', language: 'TypeScript' }),
    ],
    delay: 500,
  });

  await login(page, 'testuser', 'ghp_testtoken123');
  await waitForNavigation(page, 'Dashboard');

  console.log('⏳ Waiting for repos...');
  await waitForRepos(page, 1, 10000);
});
```

**Expected Output**:
- Should show request to `https://api.github.com/user/repos*`
- Should show if mock intercepted (200) or failed (401/other)

**Decision Point**:
- ✅ If mock logs show intercept → Problem is in data handling (go to Phase 2)
- ❌ If mock logs don't show intercept → Problem is in route registration (go to Phase 3)

---

### Phase 2: Verify Response Data (30 minutes)

**If Phase 1 shows mock IS being called but data doesn't appear:**

#### Step 2.1: Capture Response Body

**Add to mock function**:
```typescript
await route.fulfill({
  status: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(repos),
});

console.log('📦 Sent response body:', JSON.stringify(repos, null, 2));
```

#### Step 2.2: Check Application Receives Data

**Add to test**:
```typescript
await login(page, 'testuser', 'ghp_testtoken123');
await waitForNavigation(page, 'Dashboard');

// Wait for response and log it
const response = await page.waitForResponse(
  response => response.url().includes('api.github.com/user/repos'),
  { timeout: 5000 }
);

const data = await response.json();
console.log('📦 Application received:', data);
console.log('   Repo count:', data.length);
```

**Decision Point**:
- ✅ If data received correctly → Problem is in UI rendering (check React state)
- ❌ If data empty/incorrect → Problem is in mock response format

---

### Phase 3: Fix Route Registration Timing (1-2 hours)

**If Phase 1 shows mock is NOT being called:**

#### Solution 3.1: Register Mock Earlier

**Problem**: Mock registered after navigation starts, too late to intercept

**Current Flow**:
```typescript
await mockGitHubAPI(page, {...});  // Register mock
await login(page, ...);             // Navigate to dashboard
// Request fires during navigation
```

**Fix**: Register mock before any navigation
```typescript
test('should display repositories after successful API call', async ({ page }) => {
  // Register mock BEFORE navigating to app
  await mockGitHubAPI(page, {
    repos: [createMockRepo({ id: 1, name: 'repo-1' })],
    delay: 500,
  });

  // THEN navigate
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // THEN login
  await login(page, 'testuser', 'ghp_testtoken123');
  await waitForNavigation(page, 'Dashboard');

  await waitForRepos(page, 1);
});
```

---

#### Solution 3.2: Use Route Continue Instead of Fulfill

**Problem**: Route fulfill might not persist through navigation

**Current**:
```typescript
await page.route('https://api.github.com/user/repos*', async route => {
  await route.fulfill({...});
});
```

**Try**:
```typescript
await page.route('**/*api.github.com/user/repos*', async route => {
  // More permissive pattern
  console.log('Intercepted:', route.request().url());

  await route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'  // Add CORS
    },
    body: JSON.stringify(repos),
  });
});
```

---

#### Solution 3.3: Increase Registration Wait Time

**Current**:
```typescript
await page.route(...);
await page.waitForTimeout(50);  // Too short?
```

**Try**:
```typescript
await page.route(...);
await page.waitForTimeout(200);  // Give it more time
await page.goto('/');
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(100);  // Additional buffer
```

---

#### Solution 3.4: Use Persistent Route Context

**Problem**: Route deregisters on navigation

**Advanced Fix**: Use `page.context().route()` instead of `page.route()`

```typescript
export async function mockGitHubAPI(
  page: Page,
  options: MockGitHubAPIOptions = {}
) {
  const context = page.context();

  await context.route('https://api.github.com/user/repos*', async route => {
    console.log('🎯 Context-level mock intercepted:', route.request().url());
    // ... rest of mock logic
  });
}
```

**Benefit**: Context-level routes persist across page navigations

---

### Phase 4: Alternative Approaches (1-2 hours)

**If route mocking remains unreliable:**

#### Alternative 4.1: Use Mock Service Worker (MSW)

**Install MSW**:
```bash
npm install -D msw@latest
```

**Create Mock Server**: `e2e/mocks/server.ts`
```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.github.com/user/repos', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'test-repo',
        full_name: 'testuser/test-repo',
        description: 'Test repository',
        language: 'JavaScript',
        private: false,
        updated_at: new Date().toISOString(),
        default_branch: 'main',
      }
    ]);
  }),
];

export const server = setupServer(...handlers);
```

**Setup in Tests**:
```typescript
import { server } from './mocks/server';

test.beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

test.afterEach(() => {
  server.resetHandlers();
});

test.afterAll(() => {
  server.close();
});
```

**Benefits**:
- Persistent across navigations
- More reliable interception
- Industry standard for API mocking

---

#### Alternative 4.2: Use waitForResponse Instead of waitForRepos

**Current**:
```typescript
await login(page, 'testuser', 'ghp_testtoken123');
await waitForNavigation(page, 'Dashboard');
await waitForRepos(page, 1);  // Times out
```

**Alternative**:
```typescript
await login(page, 'testuser', 'ghp_testtoken123');

// Wait for API call to complete
const response = await page.waitForResponse(
  response => response.url().includes('api.github.com/user/repos') && response.status() === 200,
  { timeout: 5000 }
);

// Verify response
const repos = await response.json();
expect(repos.length).toBe(1);

// Then check UI reflects data
await expect(page.locator('text=repo-1')).toBeVisible({ timeout: 2000 });
```

**Benefits**:
- Tests what actually happens (API call)
- Doesn't depend on UI rendering
- More specific failure messages

---

#### Alternative 4.3: Test with Real API (Development Mode)

**Create Test Fixture**: `.env.test`
```bash
GITHUB_TEST_TOKEN=ghp_real_token_with_read_only_access
GITHUB_TEST_USERNAME=testuser
```

**Update Test**:
```typescript
test('should display repositories after successful API call @real-api', async ({ page }) => {
  const token = process.env.GITHUB_TEST_TOKEN;
  const username = process.env.GITHUB_TEST_USERNAME;

  if (!token || !username) {
    test.skip();
  }

  await login(page, username, token);
  await waitForNavigation(page, 'Dashboard');

  // Wait for ANY repos to load (real data)
  await page.waitForFunction(
    () => {
      const grid = document.querySelector('.grid');
      if (!grid) return false;
      const repoCards = grid.querySelectorAll(':scope > div[class*="bg-"]');
      return repoCards.length > 0;
    },
    { timeout: 10000 }
  );

  const repoCount = await page.locator('.grid > div[class*="bg-"]').count();
  expect(repoCount).toBeGreaterThan(0);
});
```

**Run**:
```bash
GITHUB_TEST_TOKEN=ghp_... GITHUB_TEST_USERNAME=testuser npx playwright test --grep "@real-api"
```

**Benefits**:
- Tests actual integration
- No mocking complexity
- Validates real-world behavior

**Drawbacks**:
- Requires real API token
- Rate limits
- Data variability

---

## Recommended Debugging Sequence

### Step 1: Quick Verification (15 minutes)
1. Add logging to `mockGitHubAPI()` (Phase 1.1)
2. Add network listeners to test (Phase 1.2)
3. Run single failing test with `--headed` flag
4. Observe console output

**Decision**:
- If mock intercepts → Go to Step 2
- If mock doesn't intercept → Go to Step 3

### Step 2: Data Verification (15 minutes)
1. Add response body logging (Phase 2.1)
2. Add `waitForResponse()` to test (Phase 2.2)
3. Verify data received correctly

**Decision**:
- If data received → Problem is UI rendering (investigate React state)
- If data not received → Go to Step 3

### Step 3: Fix Route Timing (30-60 minutes)
1. Try Solution 3.1: Register mock earlier
2. Try Solution 3.2: Use wildcard pattern
3. Try Solution 3.3: Increase wait times
4. Try Solution 3.4: Use context-level routes

**Decision**:
- If any solution works → Apply to all tests
- If none work → Go to Step 4

### Step 4: Alternative Approach (1-2 hours)
1. Implement Alternative 4.1: MSW (recommended)
2. OR use Alternative 4.2: `waitForResponse()`
3. OR use Alternative 4.3: Real API for integration tests

---

## Success Criteria

**Goal**: All 18 tests passing (100% pass rate)

**Checkpoints**:
1. ✅ Mock intercepts GitHub API requests (verified via logs)
2. ✅ Response data received by application (verified via `waitForResponse`)
3. ✅ UI updates to display repository data (verified via `waitForRepos`)
4. ✅ All 8 failing tests now pass
5. ✅ Tests remain stable across multiple runs (no flakiness)

---

## Expected Outcomes

### Best Case (2 hours)
- Phase 1 reveals simple timing issue
- Solution 3.1 or 3.2 fixes all tests
- All tests pass, no further changes needed

### Likely Case (3 hours)
- Phase 1-3 reveals route persistence issue
- Alternative 4.1 (MSW) required
- Some test refactoring needed
- All tests pass with new approach

### Worst Case (4 hours)
- Multiple issues compound (timing + pattern + persistence)
- Hybrid approach needed (MSW + waitForResponse)
- Some tests simplified to avoid complex mocking
- 90%+ pass rate achieved, remaining tests marked as integration tests

---

## Rollback Plan

If debugging exceeds 4 hours without resolution:

1. **Document findings** in `E2E_TEST_RESULTS.md`
2. **Mark affected tests as `.skip()`** temporarily
3. **Create separate issue** for API mocking improvement
4. **Ship current state** (10/18 passing validates critical flows)
5. **Schedule follow-up** for MSW migration (cleaner long-term solution)

---

## Commands Reference

```bash
# Run single test with debugging
npx playwright test --grep "should display repositories" --headed --debug

# Run all failing tests
npx playwright test --grep "should (display|filter|sort) repositories"

# Run with console logs visible
npx playwright test --grep "should display repositories" --headed --workers=1

# Generate detailed trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

---

## Next Steps

1. **Execute Phase 1** (logging and verification) - 30 minutes
2. **Analyze results** and determine root cause
3. **Apply appropriate solution** from Phases 2-4
4. **Verify all 8 tests pass**
5. **Run full suite** to ensure no regressions
6. **Update documentation** with findings
7. **Commit fixes** with detailed commit message

---

**Created**: 2025-12-21
**Status**: Ready for execution
**Estimated Resolution Time**: 2-4 hours
**Priority**: High (blocks 44% of test suite)
