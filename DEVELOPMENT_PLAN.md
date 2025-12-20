# RepoNexus: UX-First Development Plan (Drift-Proof)

**Plan Version:** 1.0
**Created:** 2025-12-20
**Status:** Active
**Last Updated:** 2025-12-20

---

## ⚠️ DRIFT PREVENTION PROTOCOL

### Binding Rules

1. **No feature additions outside this plan without explicit approval**
2. **Each phase has mandatory completion gate - cannot skip**
3. **Traceability: Every change maps to UX finding or architectural requirement**
4. **Conditional execution: Portfolio phase requires user validation before starting**
5. **Test gates: All tests must pass before phase marked complete**

### Drift Detection

After each phase, validate:
- [ ] All planned items completed (no partial work)
- [ ] No unplanned features added
- [ ] All tests pass
- [ ] UX validation performed (manual or automated)
- [ ] Git commit message matches phase description

If drift detected: STOP, document deviation, get approval before proceeding.

---

## Current State Assessment (Baseline)

**Date:** 2025-12-20
**Codebase:** Functional React/TypeScript SPA
**Critical Issues:**
- 6 BLOCKS-level UX defects (keyboard/screen reader exclusion)
- 9 WCAG Level A violations (legal/ethical risk)
- 0% test coverage (regression risk)
- Missing interaction feedback (loading/success/error states)
- No version control (cannot track changes or rollback)

**UX Assessment Reference:** See UX-001 through UX-015, A11Y-001 through A11Y-009

---

## Phase Dependencies (Directed Acyclic Graph)

```
Phase 0 (Foundation)
    ↓
Phase 1 (A11y Critical) ← BLOCKS 15-20% of users
    ↓
Phase 2 (Interaction Feedback) ← Requires Phase 1 a11y foundation
    ↓
Phase 3 (Test Infrastructure) ← Requires stable patterns from Phase 2
    ↓
Phase 4 (Delete Safety) ← Requires toast system from Phase 2
    ↓
Phase 5 (Cache Transparency) ← Requires cache utils from Phase 0
    ↓
Phase 6 (Portfolio Analysis) ← Requires Phases 0-5 complete + USER VALIDATION
    ↓
Phase 7 (Performance/Polish) ← Optional, backlog only
```

**Cannot skip phases.** Each phase builds on previous infrastructure.

---

## Phase 0: Foundation & Safety Net

### Objective
Establish development hygiene and prevent catastrophic failures

### Traceability
- **REC-009:** Install a11y tooling (ICE: 5.00)
- **REC-008:** Add ErrorBoundary (ICE: 4.00)
- **Ironclad B4:** Unified cache schema (prevents two migrations later)

### Tasks

#### 0.1: Version Control Initialization
**Input:** Current codebase files
**Output:** Git repository with clean history
**Risk:** None (reversible)

```bash
# Pre-flight check
grep -r "GEMINI_API_KEY\|ghp_\|sk-" src/ --exclude-dir=node_modules
# Expected: 0 matches (all keys in .env.local)

# Initialize
git init
git add .
git commit -m "Initial commit: functional SPA with GitHub/Gemini integration

- React 19.2.3 + TypeScript 5.8 + Vite 6
- Client-side architecture (no backend)
- GitHub API + Gemini AI integration
- localStorage for credentials and cache

Baseline state before UX-first development plan."

git branch -M main

# Create BRANCHING.md
echo "# Branching Strategy

**Model:** Trunk-based development (solo developer)

**Rules:**
- All work on main branch
- Commit frequently with descriptive messages
- Use conventional commit format: type(scope): message
- Types: feat, fix, refactor, test, docs, chore

**Commit Message Template:**
\`\`\`
feat(a11y): add aria-labels to form inputs

- Fixes UX-003, A11Y-002
- All inputs now have programmatic labels
- Screen reader test: PASS
\`\`\`

**Pre-commit checks:**
- npm run lint (after Phase 1)
- npm test (after Phase 3)
" > BRANCHING.md

git add BRANCHING.md
git commit -m "docs: add branching strategy"
```

**Validation:**
- [ ] `.git/` directory exists
- [ ] `git log` shows ≥2 commits
- [ ] No secrets in history: `git log --all --full-history -- .env.local` returns empty
- [ ] BRANCHING.md exists

---

#### 0.2: A11y Tooling Installation
**Input:** package.json
**Output:** ESLint with jsx-a11y plugin configured
**Risk:** Will surface 15-20 violations (expected)

```bash
npm install -D eslint-plugin-jsx-a11y @axe-core/cli
```

**Create `.eslintrc.json`:**
```json
{
  "extends": [
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "rules": {
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/no-static-element-interactions": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/no-noninteractive-tabindex": "error"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

**Update package.json scripts:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint src/ --ext .tsx,.jsx",
  "lint:fix": "eslint src/ --ext .tsx,.jsx --fix",
  "a11y:audit": "npx axe dist/ --tags wcag2a --exit"
}
```

**Run baseline audit:**
```bash
npm run lint > a11y-baseline.txt 2>&1
echo "Baseline violations logged to a11y-baseline.txt"
```

**Validation:**
- [ ] `npm run lint` executes (will show errors - expected)
- [ ] Violation count documented in git commit message
- [ ] Baseline file committed for comparison

```bash
git add .eslintrc.json package.json a11y-baseline.txt
git commit -m "chore: install a11y tooling (REC-009)

- Added eslint-plugin-jsx-a11y
- Configured WCAG 2.1 Level A rules
- Baseline: $(grep -c "error" a11y-baseline.txt) violations detected
- To be fixed in Phase 1"
```

---

#### 0.3: Error Boundary Implementation
**Input:** index.tsx
**Output:** Global error boundary wrapper
**Risk:** None (0% probability of breaking existing functionality)

```bash
npm install react-error-boundary
```

**Modify `index.tsx`:**
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-4">
          Application Error
        </h1>
        <p className="text-slate-400 mb-6">
          An unexpected error occurred. This has been logged.
        </p>
        <details className="mb-6">
          <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs text-red-400 overflow-auto bg-slate-950 p-3 rounded">
            {error.message}
          </pre>
        </details>
        <button
          onClick={resetErrorBoundary}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary
    FallbackComponent={ErrorFallback}
    onError={(error, errorInfo) => {
      console.error('ErrorBoundary caught:', error, errorInfo);
      // TODO Phase 7: Send to error tracking service if deployed
    }}
    onReset={() => window.location.reload()}
  >
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </ErrorBoundary>
);
```

**Test error boundary:**
```tsx
// Temporarily add to App.tsx for testing:
// if (import.meta.env.DEV) throw new Error('Test error boundary');
// Run dev server, verify fallback renders, then remove test code
```

**Validation:**
- [ ] ErrorBoundary renders fallback on thrown errors
- [ ] Reload button returns to normal state
- [ ] Error logged to console with stack trace
- [ ] No errors during normal operation

```bash
git add index.tsx package.json
git commit -m "feat: add error boundary (REC-008)

- Prevents white-screen crashes
- Shows user-friendly fallback UI
- Logs errors to console for debugging
- ICE score: 4.00 (highest priority)"
```

---

#### 0.4: Unified Cache Schema
**Input:** Current cache implementation (App.tsx lines 80-86, 125)
**Output:** Centralized cache utilities with versioning
**Risk:** Existing cached analyses invalidated (acceptable - users re-analyze once)

**Create `lib/cacheUtils.ts`:**
```typescript
import { GithubRepo, AnalysisResult } from '../types';

interface CachedAnalysis {
  schemaVersion: 1;
  cachedAt: number; // Unix timestamp
  repo: {
    id: number;
    name: string;
    language: string | null;
    description: string | null;
  };
  analysis: AnalysisResult;
}

const CACHE_KEY_PREFIX = 'reponexus_analysis_';
const CURRENT_SCHEMA_VERSION = 1;

export function getCachedAnalysis(repoId: number): CachedAnalysis | null {
  const key = `${CACHE_KEY_PREFIX}${repoId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // Schema version check
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      console.warn(`Cache schema mismatch for repo ${repoId}: expected ${CURRENT_SCHEMA_VERSION}, got ${parsed.schemaVersion}`);
      localStorage.removeItem(key);
      return null;
    }

    return parsed as CachedAnalysis;
  } catch (e) {
    console.error(`Corrupted cache for repo ${repoId}:`, e);
    localStorage.removeItem(key);
    return null;
  }
}

export function setCachedAnalysis(
  repoId: number,
  repo: GithubRepo,
  analysis: AnalysisResult
): boolean {
  const key = `${CACHE_KEY_PREFIX}${repoId}`;
  const data: CachedAnalysis = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    cachedAt: Date.now(),
    repo: {
      id: repo.id,
      name: repo.name,
      language: repo.language,
      description: repo.description,
    },
    analysis,
  };

  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Cache not saved.');
      // TODO Phase 5: Display warning to user
    } else {
      console.error('Failed to cache analysis:', e);
    }
    return false;
  }
}

export function clearRepoCache(repoId: number): void {
  localStorage.removeItem(`${CACHE_KEY_PREFIX}${repoId}`);
}

export function getCacheAge(repoId: number): number | null {
  const cached = getCachedAnalysis(repoId);
  return cached ? Date.now() - cached.cachedAt : null;
}

export function getAllAnalyzedRepos(): CachedAnalysis[] {
  const results: CachedAnalysis[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_KEY_PREFIX)) {
      const repoId = parseInt(key.replace(CACHE_KEY_PREFIX, ''));
      const cached = getCachedAnalysis(repoId);
      if (cached) results.push(cached);
    }
  }
  return results;
}

export function formatCacheAge(cachedAt: number): string {
  const ageMs = Date.now() - cachedAt;
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMs / 3600000);
  const ageDays = Math.floor(ageMs / 86400000);

  if (ageMinutes < 1) return "Analyzed just now";
  if (ageMinutes === 1) return "Analyzed 1 minute ago";
  if (ageMinutes < 60) return `Analyzed ${ageMinutes} minutes ago`;
  if (ageHours === 1) return "Analyzed 1 hour ago";
  if (ageHours < 24) return `Analyzed ${ageHours} hours ago`;
  if (ageDays === 1) return "Analyzed 1 day ago";
  return `Analyzed ${ageDays} days ago`;
}

export function getStorageQuotaUsage(): { used: number; total: number; percentage: number } {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      used += key.length + (localStorage.getItem(key)?.length || 0);
    }
  }

  // Conservative estimate: 5MB (browsers typically allow 5-10MB)
  const total = 5 * 1024 * 1024;
  const percentage = (used / total) * 100;

  return { used, total, percentage };
}
```

**Refactor App.tsx to use utilities:**

Replace cache check (lines 80-86):
```typescript
// OLD:
const cacheKey = `analysis_${repo.id}`;
const cachedAnalysis = localStorage.getItem(cacheKey);
if (cachedAnalysis) {
  setAnalysis(JSON.parse(cachedAnalysis));
  return;
}

// NEW:
import { getCachedAnalysis, setCachedAnalysis } from './lib/cacheUtils';

const cached = getCachedAnalysis(repo.id);
if (cached) {
  setAnalysis(cached.analysis);
  return;
}
```

Replace cache write (line 125):
```typescript
// OLD:
localStorage.setItem(cacheKey, JSON.stringify(finalAnalysis));

// NEW:
setCachedAnalysis(repo.id, repo, finalAnalysis);
```

**Validation:**
- [ ] Cache read/write works through utilities
- [ ] Old cache format invalidated gracefully
- [ ] New cache includes repo metadata
- [ ] No crashes on corrupted cache
- [ ] Schema version validated on read

```bash
mkdir -p lib
git add lib/cacheUtils.ts App.tsx
git commit -m "refactor: unified cache schema (Ironclad B4)

- Centralized cache operations in lib/cacheUtils.ts
- Schema versioning prevents future migrations
- Includes repo metadata for Portfolio phase
- Graceful handling of corrupted cache
- localStorage quota detection

BREAKING: Existing cached analyses invalidated (users must re-analyze once)"
```

---

### Phase 0 Completion Gate

**Mandatory Checks (all must pass):**

```bash
# 1. Git repository healthy
test -d .git && echo "✓ Git initialized" || echo "✗ FAILED: No git repo"

# 2. Commits exist
test $(git log --oneline | wc -l) -ge 4 && echo "✓ Commits present" || echo "✗ FAILED: <4 commits"

# 3. No secrets in history
test $(git log --all --full-history -- .env.local | wc -l) -eq 0 && echo "✓ No secrets" || echo "✗ FAILED: Secrets in git"

# 4. ESLint configured
test -f .eslintrc.json && echo "✓ ESLint config exists" || echo "✗ FAILED: Missing .eslintrc.json"

# 5. A11y baseline exists
test -f a11y-baseline.txt && echo "✓ Baseline logged" || echo "✗ FAILED: No baseline"

# 6. ErrorBoundary installed
grep -q "react-error-boundary" package.json && echo "✓ ErrorBoundary dependency" || echo "✗ FAILED: Missing dependency"

# 7. Cache utilities exist
test -f lib/cacheUtils.ts && echo "✓ Cache utilities created" || echo "✗ FAILED: Missing lib/cacheUtils.ts"

# 8. App compiles without errors
npm run build > /dev/null 2>&1 && echo "✓ Build succeeds" || echo "✗ FAILED: Build errors"

# 9. BRANCHING.md exists
test -f BRANCHING.md && echo "✓ Branching strategy documented" || echo "✗ FAILED: No BRANCHING.md"

echo ""
echo "Phase 0 Completion Status:"
echo "If all checks show ✓, proceed to Phase 1."
echo "If any check shows ✗, STOP and fix before continuing."
```

**Manual Validation:**
- [ ] Run `npm run dev` - app loads without errors
- [ ] Test ErrorBoundary: Add `throw new Error('test')` to App.tsx, verify fallback renders
- [ ] Remove test error, verify app returns to normal
- [ ] Analyze a repository, verify cache uses new schema (check DevTools > Application > localStorage)

**Drift Check:**
- [ ] Only planned features implemented (git, ESLint, ErrorBoundary, cache utils)
- [ ] No UI changes made
- [ ] No new features added

**Git Tag:**
```bash
git tag -a phase-0-complete -m "Phase 0: Foundation complete

Checklist:
- Git repository initialized with clean history
- ESLint + jsx-a11y configured (baseline: X violations)
- ErrorBoundary catches and displays errors
- Cache utilities centralized with schema versioning

All validation gates passed."

git push origin main --tags  # If using remote
```

**Next Phase:** Phase 1 (A11y Critical Path)
**Dependencies Met:** ✓ All (Phase 0 has no dependencies)
**Blocker:** None

---

## Phase 1: Accessibility Critical Path

### Objective
Eliminate exclusion of keyboard and screen reader users

### Traceability
- **UX-001, UX-003, UX-004, UX-005:** Form input labeling
- **UX-006, UX-012:** Modal accessibility (focus trap, ARIA tabs)
- **UX-007:** Icon button labeling
- **A11Y-001 through A11Y-009:** WCAG Level A compliance
- **REC-002:** aria-labels (ICE: 2.50)
- **REC-001:** Focus trap (ICE: 1.67)
- **REC-003:** ARIA tabs (ICE: 1.33)
- **REC-004:** ESC key handler (ICE: 2.70)

### Impact
**Users Affected:** 15-20% of potential users currently excluded
**WCAG Compliance:** Level A (legal/ethical requirement)

### Tasks

#### 1.1: Form Input Labeling (30 min)

**Files Changed:** `App.tsx`

**Search Input (line ~272):**
```tsx
<div className="relative flex-1 min-w-[200px]">
  <label htmlFor="search-repos" className="sr-only">
    Search repositories
  </label>
  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <input
    id="search-repos"
    type="text"
    placeholder="Search repositories..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full bg-[#020617] border border-slate-800 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
  />
</div>
```

**Filter Dropdowns (lines ~281-321):** Add `htmlFor` to labels, `id` to selects

**Settings Form (lines ~408-428):** Associate labels with inputs

**Commit:**
```bash
git add App.tsx
git commit -m "fix(a11y): associate labels with form inputs (UX-003, UX-004, UX-005)

Fixes:
- Search input: Added sr-only label with htmlFor
- Filter dropdowns: Connected label to select via htmlFor/id
- Settings form: Associated all input labels

WCAG: 1.3.1 Info and Relationships (Level A)
WCAG: 3.3.2 Labels or Instructions (Level A)

Testing:
- Screen reader: All inputs now announce their purpose
- Click label: Focus moves to associated input

ESLint a11y violations reduced: X → Y"
```

---

#### 1.2: Icon Button Labeling (15 min)

**Add `aria-label` to all icon-only buttons:**
- Refresh button (line ~254)
- Delete button (line ~369)
- Download link (line ~376)
- Close modal button (line ~448)

**Change delete button to persistent red:**
```tsx
className="text-red-500 hover:text-red-400 transition-colors"
```

**Commit:**
```bash
git add App.tsx
git commit -m "fix(a11y): add aria-labels to icon buttons (UX-007, A11Y-006)

Changes:
- Refresh, delete, download, close buttons: Added aria-label
- Delete button: Changed to persistent red (colorblind-friendly)
- All SVG icons: Added aria-hidden=true

WCAG: 1.1.1 Non-text Content (Level A)

Testing:
- Screen reader: All buttons announce their purpose
- Visual: Delete button distinguishable from other actions

ESLint a11y violations reduced: Y → Z"
```

---

#### 1.3: Modal Accessibility (60 min)

**Install dependency:**
```bash
npm install focus-trap-react
```

**Add ESC key handler:**
```tsx
// After line 66 in App.tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectedRepo) {
      setSelectedRepo(null);
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [selectedRepo]);
```

**Implement ARIA tabs pattern** (see detailed spec in full plan above)

**Wrap modal in FocusTrap:**
```tsx
import FocusTrap from 'focus-trap-react';

{selectedRepo && (
  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <FocusTrap focusTrapOptions={{...}}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-title" ...>
        {/* modal content */}
      </div>
    </FocusTrap>
  </div>
)}
```

**Commit:**
```bash
git add App.tsx package.json
git commit -m "feat(a11y): modal accessibility complete (UX-001, UX-006, UX-012, A11Y-001, A11Y-005, A11Y-007)

Features:
- Focus trap: Keyboard navigation stays inside modal
- ESC key: Closes modal
- ARIA tabs: Arrow key navigation between tabs
- Dialog role: Screen readers announce modal properly
- Initial focus: Close button receives focus on open

WCAG: 2.1.2 No Keyboard Trap (Level A)
WCAG: 4.1.2 Name, Role, Value (Level A)

Testing:
- Keyboard-only: ✓ Can navigate entire modal
- Screen reader: ✓ Announces 'Dialog, AI Analysis Report'
- ESC key: ✓ Closes modal
- Tab wrapping: ✓ Focus cycles within modal
- Arrow keys: ✓ Switch between tabs

ESLint a11y violations reduced: Z → 0 (GOAL MET)"
```

---

### Phase 1 Completion Gate

**Automated Checks:**
```bash
# 1. ESLint a11y violations
npm run lint > a11y-phase1.txt 2>&1
VIOLATIONS=$(grep -c "error" a11y-phase1.txt || echo "0")
test "$VIOLATIONS" -eq 0 && echo "✓ Zero a11y violations" || echo "✗ FAILED: $VIOLATIONS violations remain"

# 2. Build succeeds
npm run build > /dev/null 2>&1 && echo "✓ Build succeeds" || echo "✗ FAILED: Build errors"

# 3. No console errors in dev mode (manual check required)
echo "Manual: Start dev server, check console for errors"
```

**Manual Validation (Mandatory):**
- [ ] **Screen Reader Test:**
  - Open app with NVDA/JAWS/VoiceOver
  - Navigate to Settings
  - All form inputs announce their purpose
  - Tab to Dashboard
  - Search input announces "Search repositories"
  - Filter dropdowns announce their labels
  - Click Analyze button on any repo
  - Modal announces "Dialog, AI Analysis Report for [repo name]"
  - Tab through modal - focus stays inside
  - Press ESC - modal closes
  - **Result:** All elements accessible via screen reader

- [ ] **Keyboard-Only Test:**
  - Disconnect mouse or use Tab key only
  - Navigate entire app (Settings → Dashboard → Analyze)
  - Focus visible on all interactive elements
  - Enter key activates buttons
  - Arrow keys switch modal tabs
  - ESC closes modal
  - **Result:** All functionality accessible via keyboard

- [ ] **Visual Regression Check:**
  - Delete button is red without hover
  - All other buttons unchanged
  - Modal layout unchanged
  - No visual glitches

**Drift Check:**
- [ ] Only a11y fixes implemented (no new features)
- [ ] All changes traceable to UX findings (UX-001 through UX-012, A11Y-001 through A11Y-009)
- [ ] No performance degradation

**Documentation:**
```bash
# Create validation report
cat > phase1-validation.md << 'EOF'
# Phase 1 Validation Report

**Date:** $(date +%Y-%m-%d)
**Validator:** [Your Name]

## Automated Checks
- ESLint a11y violations: BEFORE (X) → AFTER (0) ✓
- Build status: PASS ✓

## Screen Reader Test
- Tool: [NVDA/JAWS/VoiceOver]
- Form inputs: All labeled ✓
- Modal navigation: Accessible ✓
- Tab announcements: Correct ✓

## Keyboard-Only Test
- Navigation: Complete ✓
- Focus visible: Yes ✓
- Modal trap: Working ✓
- ESC key: Closes modal ✓

## Visual Regression
- Delete button: Red ✓
- Layout: Unchanged ✓
- No glitches: Confirmed ✓

## Conclusion
All Phase 1 acceptance criteria met. Ready for Phase 2.
EOF

git add phase1-validation.md a11y-phase1.txt
git commit -m "docs: Phase 1 validation complete"
```

**Git Tag:**
```bash
git tag -a phase-1-complete -m "Phase 1: A11y Critical Path complete

Achievements:
- 100% WCAG Level A compliance
- Zero ESLint a11y violations
- Keyboard-only navigation functional
- Screen reader compatible
- 15-20% of users no longer excluded

Fixes: UX-001, UX-003, UX-004, UX-005, UX-006, UX-007, UX-012
Fixes: A11Y-001 through A11Y-009

All validation gates passed.
Next: Phase 2 (Interaction Feedback)"
```

**Next Phase:** Phase 2 (Interaction Completeness & Feedback)
**Dependencies Met:** ✓ Phase 0 complete
**Blocker:** None

---

## Phase 2-7 Specifications

[Detailed specifications continue in same format as Phase 0-1]

**Note:** Full specifications for Phases 2-7 follow the same drift-proof structure:
- Objective
- Traceability to UX findings
- Task breakdown with validation
- Completion gates with automated + manual checks
- Drift detection
- Git tags

**See full UX-first plan document above for complete Phase 2-7 details.**

---

## Drift Prevention Checklist (Use Before Each Commit)

```bash
#!/bin/bash
# Save as scripts/check-drift.sh

echo "=== DRIFT PREVENTION CHECK ==="
echo ""

# 1. Verify current phase
CURRENT_PHASE=$(git describe --tags --abbrev=0 2>/dev/null || echo "phase-0-start")
echo "Current Phase: $CURRENT_PHASE"
echo ""

# 2. Check for unplanned files
echo "New files in this commit:"
git diff --cached --name-status | grep "^A"
echo ""
read -p "Are all new files part of current phase plan? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✗ DRIFT DETECTED: Unplanned files added"
    exit 1
fi

# 3. Verify tests pass (if Phase 3+ complete)
if [[ -f "vitest.config.ts" ]]; then
    echo "Running tests..."
    npm test -- --run > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✓ Tests pass"
    else
        echo "✗ DRIFT DETECTED: Tests failing"
        exit 1
    fi
fi

# 4. Verify a11y compliance (if Phase 1+ complete)
if [[ -f ".eslintrc.json" ]]; then
    echo "Checking a11y violations..."
    VIOLATIONS=$(npm run lint 2>&1 | grep -c "error" || echo "0")
    if [ "$VIOLATIONS" -eq 0 ]; then
        echo "✓ Zero a11y violations"
    else
        echo "⚠ Warning: $VIOLATIONS a11y violations (fix before Phase 1 complete)"
    fi
fi

echo ""
echo "=== DRIFT CHECK COMPLETE ==="
echo "If all checks passed, proceed with commit."
echo "If drift detected, review changes against plan."
```

Make executable:
```bash
chmod +x scripts/check-drift.sh
```

Usage before commit:
```bash
./scripts/check-drift.sh && git commit -m "..." || echo "Fix drift before committing"
```

---

## Success Metrics (Measured at Each Phase)

| Phase | Metric | Baseline | Target | Measurement Method |
|-------|--------|----------|--------|-------------------|
| 0 | Git commits | 0 | ≥4 | `git log --oneline \| wc -l` |
| 0 | Secrets in git | Unknown | 0 | `git log --all -- .env.local` |
| 0 | ESLint violations | Unknown | Documented | `npm run lint \| grep -c error` |
| 1 | A11y violations | ~15-20 | 0 | `npm run lint \| grep -c error` |
| 1 | Keyboard nav | Broken | 100% | Manual test checklist |
| 1 | Screen reader | Broken | 100% | Manual test checklist |
| 2 | Button loading states | 0 | 100% | Code inspection |
| 2 | Success toasts | 0 | 2+ actions | Code inspection |
| 2 | Error templates | Inconsistent | 100% | Code review |
| 3 | Test coverage | 0% | >60% | `npm run test:coverage` |
| 3 | Service coverage | 0% | >80% | Coverage report |
| 4 | Delete safety | window.confirm | Type-to-confirm | Manual test |
| 5 | Cache visibility | Hidden | 100% visible | Manual test |
| 6 | Portfolio feature | N/A | Working | User validation |

---

## Conditional Execution Rules

### Phase 6 (Portfolio Analysis) - REQUIRES USER APPROVAL

**Before starting Phase 6, user must answer:**

1. **Is portfolio feature validated by user demand?**
   - [ ] Yes, users have requested this → PROCEED
   - [ ] No, speculative feature → DEFER to backlog

2. **What specific insights should portfolio provide?**
   - [ ] Technology trends (languages/frameworks used)
   - [ ] Common patterns (project types, approaches)
   - [ ] Gaps (missing skills, inconsistencies)
   - [ ] Other: ________________________

3. **Is minimum 5 analyzed repos acceptable?**
   - [ ] Yes, 5 repos minimum is fine
   - [ ] No, change to: ___ repos

4. **Budget for Gemini API calls?**
   - Portfolio analysis costs 1 API call per portfolio view
   - [ ] Budget confirmed
   - [ ] Need cost controls (add rate limiting)

**If any answer is unclear or negative, STOP Phase 6 and consult user.**

### Phase 7 (Performance/Polish) - OPTIONAL

Only implement if:
- [ ] Phases 0-6 complete and stable
- [ ] User has spare development capacity
- [ ] Performance issues observed in production use
- [ ] User explicitly requests polish items

Otherwise, mark as backlog and close plan.

---

## Rollback Procedures

### If Phase Fails Validation

1. **Do NOT proceed to next phase**
2. Document failure in `phase-X-failure.md`
3. Create rollback branch: `git checkout -b rollback-phase-X`
4. Revert to last phase tag: `git reset --hard phase-N-complete`
5. Analyze root cause
6. Fix issues
7. Re-run validation gates
8. Only proceed when all gates pass

### If Drift Detected Mid-Phase

1. Stop all development
2. Run: `git diff phase-N-complete..HEAD > drift-analysis.diff`
3. Review diff against plan
4. Identify unplanned changes
5. Decision:
   - Acceptable drift (user approves) → Document in plan, continue
   - Unacceptable drift → Revert unplanned changes
6. Update plan if scope changed
7. Resume development

---

## Plan Completion Criteria

**Plan is complete when:**
- [ ] All Phases 0-6 validation gates passed
- [ ] Zero ESLint a11y violations
- [ ] Test coverage >60%
- [ ] User can complete all critical flows (analyze, delete, portfolio)
- [ ] No BLOCKS or IMPAIRS-level UX defects remain
- [ ] Git tagged: `phase-6-complete` or `phase-7-complete`

**Final Validation:**
```bash
# Run full validation suite
./scripts/final-validation.sh

# Expected output:
# ✓ Phase 0: Foundation complete
# ✓ Phase 1: A11y complete (0 violations)
# ✓ Phase 2: Interaction feedback complete
# ✓ Phase 3: Test infrastructure complete (coverage >60%)
# ✓ Phase 4: Delete safety complete
# ✓ Phase 5: Cache transparency complete
# ✓ Phase 6: Portfolio analysis complete
#
# === ALL PHASES COMPLETE ===
# Development plan executed successfully.
# No drift detected.
```

---

## Appendix A: Traceability Matrix

| UX Finding | Severity | Phase | Task | Status |
|------------|----------|-------|------|--------|
| UX-001 | BLOCKS | 1 | 1.3 Modal focus trap | Planned |
| UX-003 | BLOCKS | 1 | 1.1 Search input label | Planned |
| UX-004 | BLOCKS | 1 | 1.1 Filter labels | Planned |
| UX-005 | BLOCKS | 1 | 1.1 Settings labels | Planned |
| UX-006 | IMPAIRS | 1 | 1.3 ESC handler | Planned |
| UX-007 | IMPAIRS | 1 | 1.2 Icon labels | Planned |
| UX-008 | BLOCKS | 2 | 2.1 Refresh loading | Planned |
| UX-009 | IMPAIRS | 2 | 2.1 Analyze loading | Planned |
| UX-010 | IMPAIRS | 2 | 2.1 Dismiss focus | Planned |
| UX-012 | BLOCKS | 1 | 1.3 ARIA tabs | Planned |
| UX-013 | IMPAIRS | 2 | 2.3 Loading progress | Planned |
| UX-014 | IMPAIRS | 2 | 2.3 Error recovery | Planned |
| A11Y-001 | BLOCKS | 1 | 1.3 Focus trap | Planned |
| A11Y-002 | BLOCKS | 1 | 1.1 Search label | Planned |
| A11Y-003 | BLOCKS | 1 | 1.1 Filter labels | Planned |
| A11Y-004 | BLOCKS | 1 | 1.1 Settings labels | Planned |
| A11Y-005 | BLOCKS | 1 | 1.3 Dialog role | Planned |
| A11Y-006 | BLOCKS | 1 | 1.2 Icon labels | Planned |
| A11Y-007 | BLOCKS | 1 | 1.3 ARIA tabs | Planned |

---

## Appendix B: Git Commit Message Template

```
<type>(<scope>): <subject>

<body>

Fixes: <UX-NNN>, <A11Y-NNN>
WCAG: <criterion> (Level A/AA)
ICE: <score>

Testing:
- <test type>: <result>
- <test type>: <result>

ESLint a11y violations: <before> → <after>
```

**Types:** feat, fix, refactor, test, docs, chore
**Scopes:** a11y, ux, cache, test, build
**Subject:** Imperative, lowercase, no period, <50 chars
**Body:** What and why, not how

**Example:**
```
fix(a11y): add aria-labels to form inputs (UX-003, UX-004)

All form inputs now have programmatic labels via htmlFor/id
association. Search input uses sr-only label. Filter dropdowns
connect label text to select elements.

Fixes: UX-003, UX-004, A11Y-002, A11Y-003
WCAG: 1.3.1 Info and Relationships (Level A)
ICE: 2.50

Testing:
- Screen reader: All inputs announce correctly ✓
- Click label: Focus moves to input ✓
- Keyboard nav: Tab order correct ✓

ESLint a11y violations: 18 → 12
```

---

**END OF DEVELOPMENT PLAN**

**Plan Status:** READY FOR EXECUTION
**Next Action:** Begin Phase 0, Task 0.1 (Git initialization)
**Estimated Total Duration:** 7 phases, sequential execution
**Risk Level:** LOW (drift-proof safeguards in place)
