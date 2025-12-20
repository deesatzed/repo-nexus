# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RepoNexus** is an AI-powered repository analysis tool that connects to GitHub and uses Google Gemini to provide insights about repositories. It's a client-side React/TypeScript SPA that helps developers understand their repository portfolio through AI-generated summaries, resume points, and organizational advice.

**Tech Stack**: React 19, TypeScript 5.8, Vite 6, Google Gemini AI, GitHub REST API

## Development Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Setup

Create `.env.local` in the project root:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

The Vite configuration exposes this as both `process.env.API_KEY` and `process.env.GEMINI_API_KEY` in the client bundle.

### First-Time Setup

1. Run `npm install`
2. Create `.env.local` with your Gemini API key
3. Run `npm run dev`
4. Navigate to Settings in the UI
5. Enter GitHub username and Personal Access Token (needs `repo` and `delete_repo` scopes)

## Architecture

### Core Design Principles

**Client-Side Only Architecture**: This is a pure SPA with no backend server. All logic runs in the browser, and API calls go directly from client to GitHub/Gemini APIs. This means:
- API keys are exposed client-side (acceptable for local-only tool)
- User credentials stored in browser localStorage
- Analysis results cached in localStorage to prevent redundant API calls

### Service Layer Pattern

The application follows a clear separation between UI and external API interactions:

```
App.tsx (UI + State)
    ├── services/githubService.ts → GitHub REST API
    └── services/geminiService.ts → Google Gemini API
```

**services/githubService.ts**: Class-based service encapsulating all GitHub API operations
- `fetchUserRepos(username)`: Retrieves user's repositories
- `fetchRepoReadme(fullName)`: Fetches raw README content
- `deleteRepo(fullName)`: Deletes a repository (requires `delete_repo` scope)

**services/geminiService.ts**: Function-based service for AI analysis
- `analyzeRepository(repo, readme)`: Sends repo metadata + README to Gemini, receives structured JSON response with projectPulse, resumePoints, forgottenIdeas, and reorgAdvice
- Uses Gemini's structured output feature with schema validation
- Model: `gemini-3-flash-preview`

### State Management Architecture

All state lives in `App.tsx` using React hooks. Key state patterns:

**Multi-stage analysis flow**:
```typescript
status: 'idle' → 'fetching_readme' → 'analyzing' → 'success' | 'error'
```

**Caching strategy**: Analysis results are cached in localStorage with key pattern `analysis_${repo.id}`. When analyzing a repo, the app first checks cache before making API calls. Cache persists across browser sessions.

**Client-side storage patterns**:
- `gh_token`: GitHub Personal Access Token
- `gh_user`: GitHub username
- `analysis_<repo_id>`: Cached AnalysisResult JSON objects

### Type System

All shared types defined in `types.ts`:

**GithubRepo**: Represents GitHub repository metadata (id, name, full_name, description, private, html_url, language, updated_at, default_branch)

**AnalysisResult**: AI analysis structure with status tracking
- projectPulse: 1-2 sentence high-level project description
- resumePoints: Array of 3 professional bullet points
- forgottenIdeas: Array of 2-3 hidden insights from README
- reorgAdvice: Organizational suggestions
- status: Multi-stage status tracking
- fullReadme: Raw README content for display

**View enum**: Navigation state (DASHBOARD, REPO_DETAIL, SETTINGS)

### UI Component Patterns

The app uses a single-file component architecture in `App.tsx`:

**NavItem**: Reusable sidebar navigation button component
**Main sections**:
- Sidebar: Navigation and user info display
- Header: Title and refresh button
- Filters Bar: Search, language filter, visibility filter, sorting (only on dashboard view)
- Dynamic Viewport: Switches between Dashboard, Settings, and Analysis Modal
- Analysis Modal: Tabbed interface showing AI insights vs source README

**Filtering and Sorting**: All computed client-side using `useMemo` for performance:
- Search: Filters by name or description
- Language filter: Shows only repos in selected language
- Visibility filter: Public/Private/All
- Sort options: Updated date (asc/desc), Name (asc/desc), Language

## Key Implementation Details

### Vite Configuration Pattern

The `vite.config.ts` uses `loadEnv` to inject environment variables at build time:
```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
}
```

This replaces these strings directly in the bundled code. Path alias `@/` points to project root.

### Error Handling Strategy

**GitHub API errors**: Handled in service layer, thrown to UI for display
**Gemini API errors**: Specific error codes mapped to user-friendly messages:
- 429 → Rate limit message
- 401/403 → Invalid API key message
- Model not found → Configuration error message

**README fetch failures**: Non-blocking. If README fetch fails, analysis proceeds with "No README found" message rather than failing entirely.

### Analysis Caching Implementation

Check for cache before analysis:
```typescript
const cacheKey = `analysis_${repo.id}`;
const cachedAnalysis = localStorage.getItem(cacheKey);
if (cachedAnalysis) {
  setAnalysis(JSON.parse(cachedAnalysis));
  return; // Skip API calls
}
```

After successful analysis, save to cache:
```typescript
localStorage.setItem(cacheKey, JSON.stringify(finalAnalysis));
```

This prevents redundant Gemini API calls which have quota limits and cost.

### Destructive Action Safeguards

Repository deletion uses `window.confirm()` with clear warning message:
```typescript
if (window.confirm(`Are you sure you want to permanently delete the repository "${repo.name}"? This action is irreversible.`))
```

Known improvement needed: Replace with type-to-confirm modal for better UX (see Handoff document).

## Common Pitfalls

1. **Missing GEMINI_API_KEY**: Analysis will fail silently or throw error. Always check `.env.local` exists and is loaded correctly.

2. **GitHub Token Scopes**: Delete feature requires `delete_repo` scope. Basic repo browsing only needs `repo` scope. Token scope errors manifest as 403 responses.

3. **localStorage Namespace**: Analysis cache uses repo ID as key. If GitHub repo IDs collide or change, cache may serve stale data. No TTL implemented.

4. **Client-Side API Key Exposure**: The Gemini API key is bundled into the client JavaScript. This is acceptable for a local development tool but would be a security issue for any deployed/public version.

5. **No Backend**: This is purely client-side. There's no server to proxy API calls, manage secrets securely, or persist data beyond localStorage.

## Testing Status

**Current state**: No tests exist. No test framework configured.

**Planned improvement** (from Handoff document):
- Add Vitest or React Testing Library
- Create unit tests for service functions (handleAnalyze, handleDeleteRepo)
- Test UI components and state transitions

## Known Technical Debt

From the Handoff document:

1. **No version control**: Project is not a git repository (should be initialized)
2. **No test coverage**: Zero tests, no test framework
3. **Basic confirmation dialogs**: Delete uses window.confirm instead of custom modal
4. **Client-side secret exposure**: Gemini API key in bundle (acceptable for local tool only)
5. **No cross-repo analysis**: Planned feature not yet implemented

## Future Enhancements

**Cross-Repository Analysis** (top priority from Handoff):
- Read all `analysis_*` keys from localStorage
- Aggregate data across all analyzed repos
- Send to new Gemini prompt designed for portfolio-level synthesis
- Display in new "Portfolio View" UI

**Re-analyze Feature**:
- Add button to clear cache and force fresh analysis
- Useful when underlying repository has changed since last analysis

**Improved Delete UX**:
- Replace window.confirm with custom modal
- Require typing repository name to confirm deletion
- Prevents accidental deletions

## File Organization

```
/
├── index.html              # Entry HTML
├── index.tsx               # React entry point
├── App.tsx                 # Main component (UI, state, orchestration)
├── types.ts                # TypeScript type definitions
├── vite.config.ts          # Vite configuration + env variable injection
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── .env.local              # Local environment variables (gitignored)
├── services/
│   ├── githubService.ts    # GitHub API client
│   └── geminiService.ts    # Gemini AI client
└── GEMINI.md              # AI Studio generated documentation
```

## AI Model Configuration

**Gemini Model**: `gemini-3-flash-preview`
**Response Format**: Structured JSON with schema validation
**Token Limit**: README content truncated to 5000 characters to prevent token overflow

The prompt asks Gemini to provide:
1. Project Pulse (1-2 sentence summary)
2. 3 resume bullet points
3. 2-3 forgotten/hidden ideas from README
4. 2 sentence reorganization advice

Response schema enforces type safety and ensures consistent output structure.
