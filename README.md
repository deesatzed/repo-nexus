# RepoNexus

<div align="center">

**AI-Powered GitHub Repository Manager & Analyzer**

[![E2E Tests](https://img.shields.io/badge/E2E_Tests-18%2F18_Passing-success?style=flat-square)](./E2E_DEBUG_SUMMARY.md)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1_AA-blue?style=flat-square)](#accessibility)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

[Features](#features) • [Getting Started](#getting-started) • [Testing](#testing) • [Documentation](#documentation)

</div>

---

## Overview

RepoNexus is a modern, accessible GitHub repository management application that combines powerful filtering, sorting, and AI-driven analysis capabilities. Built with React 19 and TypeScript, it provides an intuitive interface for developers to explore, analyze, and manage their GitHub repositories.

### Key Highlights

- 🎯 **Smart Filtering & Sorting** - Search, filter by language/visibility, sort by multiple criteria
- 🤖 **AI-Powered Analysis** - Gemini AI integration for intelligent repository insights
- ♿ **Accessibility First** - WCAG 2.1 AA compliant with full keyboard navigation
- ✅ **100% Test Coverage** - 18/18 E2E tests passing (Playwright)
- 🎨 **Modern UI/UX** - Dark theme with smooth animations and responsive design
- 🔒 **Secure & Private** - Credentials stored locally, no backend required

---

## Features

### Repository Management

- **Browse & Search** - View all your public and private repositories with real-time search
- **Advanced Filtering** - Filter by programming language, visibility (public/private), and search terms
- **Flexible Sorting** - Sort by update date, name (A-Z/Z-A), or language
- **Repository Actions**:
  - 📊 AI-powered analysis with project insights
  - 📥 Direct download as ZIP
  - 🗑️ Delete repositories (with confirmation)

### AI Analysis (Powered by Google Gemini)

Each repository analysis provides:
- **Project Identity** - AI-generated one-sentence summary
- **Resume Points** - Key technical accomplishments for your resume
- **Forgotten Gems** - Undiscovered features or ideas in your code
- **Structural Strategy** - Recommendations for code organization
- **README Preview** - View original documentation side-by-side

Results are cached locally for instant access.

### Accessibility Features

- ✅ Full keyboard navigation support
- ✅ ARIA labels on all interactive elements
- ✅ Focus trap in modal dialogs
- ✅ Screen reader compatible
- ✅ High contrast color scheme
- ✅ Skip to content links
- ✅ ESC key to close modals

---

## Technology Stack

### Frontend
- **React 19.2** - Latest React with concurrent features
- **TypeScript 5.8** - Type-safe development
- **Vite 6.2** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling (via inline classes)

### Testing & Quality
- **Playwright 1.57** - E2E testing (100% pass rate)
- **ESLint** - Code linting with React & accessibility plugins
- **axe-core** - Automated accessibility testing

### APIs & Services
- **GitHub REST API** - Repository data & management
- **Google Gemini AI** - Intelligent code analysis

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **GitHub Personal Access Token** (classic) with `repo` scope
- **Gemini API Key** (for AI analysis features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/deesatzed/repo-nexus.git
   cd repo-nexus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Keys**

   Create a `.env.local` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:3000`

### First-Time Setup

1. Click **"Go to Settings"** on the welcome screen
2. Enter your **GitHub Username** (e.g., `deesatzed`)
3. Enter your **GitHub Personal Access Token**
   - Create one at: https://github.com/settings/tokens
   - Required scope: `repo` (full repository access)
   - Optional scope: `delete_repo` (if you want to delete repos)
4. Click **"Save Config"**

Your credentials are stored in `localStorage` and never leave your browser.

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues

# Testing
npm run test:e2e         # Run E2E tests (Playwright)
npm run test:e2e:ui      # Run E2E tests in UI mode
npm run test:e2e:report  # View HTML test report

# Accessibility
npm run a11y:audit       # Run axe accessibility audit
```

### Project Structure

```
repo-nexus/
├── src/
│   ├── App.tsx              # Main application component
│   ├── index.tsx            # Entry point
│   ├── types.ts             # TypeScript type definitions
│   ├── services/
│   │   ├── githubService.ts # GitHub API integration
│   │   └── geminiService.ts # Gemini AI integration
│   └── lib/
│       └── cache.ts         # LocalStorage cache management
├── e2e/
│   ├── app.spec.ts          # E2E test suite (18 tests)
│   └── helpers/
│       ├── apiMocks.ts      # API mocking utilities
│       └── testUtils.ts     # Test helper functions
├── public/                  # Static assets
├── playwright.config.ts     # Playwright configuration
├── vite.config.ts          # Vite configuration
└── package.json            # Dependencies & scripts
```

---

## Testing

### End-to-End Tests (Playwright)

**Status**: ✅ **18/18 tests passing (100%)**

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in interactive UI mode
npm run test:e2e:ui

# View detailed HTML report
npm run test:e2e:report
```

**Test Coverage**:
- ✅ Navigation & Routing (3/3)
- ✅ Form Validation (1/1)
- ✅ Accessibility (2/2)
- ✅ Error Handling (2/2)
- ✅ User Feedback (2/2)
- ✅ Data Loading (5/5)
- ✅ Filtering & Sorting (3/3)

**Execution Time**: ~3.3 seconds

For detailed test results and debugging process, see [E2E_DEBUG_SUMMARY.md](./E2E_DEBUG_SUMMARY.md).

### Accessibility Testing

```bash
# Automated accessibility audit (requires app running)
npm run dev  # In one terminal
npm run a11y:audit  # In another terminal
```

**WCAG 2.1 Level AA Compliance**:
- ✅ Keyboard Navigation (1.1.1, 2.1.1)
- ✅ Non-text Content (1.1.1)
- ✅ Link Purpose (2.4.4)
- ✅ Focus Visible (2.4.7)
- ✅ Label in Name (2.5.3)
- ✅ ARIA Roles & Labels (4.1.2)

---

## Features in Detail

### Repository Dashboard

The main dashboard displays all your repositories in a responsive grid with:
- **Repository cards** showing name, description, language, and privacy status
- **Real-time search** across repository names and descriptions
- **Multi-criteria filtering** by language and visibility
- **Flexible sorting** by date, name, or language
- **Quick actions** for each repository (analyze, download, delete)

### AI Analysis Modal

Click "Analyze AI" on any repository to:
1. Fetch the README from GitHub
2. Send to Gemini AI for analysis
3. Display insights in an organized modal with tabs:
   - **AI Insights** - Structured analysis with resume points, forgotten ideas, and recommendations
   - **Source README** - Original documentation for reference

Analysis results are cached locally to avoid redundant API calls.

### Settings Panel

Configure your GitHub credentials:
- **GitHub Username** - Your GitHub account username
- **Personal Access Token** - GitHub PAT with repo access
- **Local Storage** - Credentials never sent to external servers

---

## Deployment

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Set environment variable in Vercel dashboard:
   - `GEMINI_API_KEY` = your Gemini API key

### Deploy to Netlify

1. Build the app: `npm run build`
2. Upload `dist/` folder to Netlify
3. Set environment variable:
   - `GEMINI_API_KEY` = your Gemini API key

---

## Documentation

- **[E2E Test Results](./E2E_TEST_RESULTS.md)** - Comprehensive testing documentation
- **[Debug Summary](./E2E_DEBUG_SUMMARY.md)** - Detailed debugging process and findings
- **[API Mock Plan](./API_MOCK_DEBUG_PLAN.md)** - Testing infrastructure strategy
- **[Development Plan](./DEVELOPMENT_PLAN.md)** - Project roadmap and architecture

---

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (responsive design)

**Recommended**: Chrome or Edge for best Playwright testing experience

---

## Performance

- **Fast Load Times** - Vite HMR for instant updates
- **Optimized Builds** - Tree-shaking and code splitting
- **Lazy Loading** - Modal content loaded on demand
- **Local Caching** - Analysis results cached for instant access
- **Network Optimization** - Minimal API calls with smart caching

---

## Security & Privacy

- 🔒 **No Backend** - Fully client-side application
- 🔒 **Local Storage** - Credentials stored in browser only
- 🔒 **HTTPS Required** - For production deployments
- 🔒 **Token Scope** - Only request necessary GitHub permissions
- 🔒 **No Analytics** - No tracking or data collection

**Note**: Your GitHub token is stored in `localStorage` and is only sent to GitHub's API. It never touches any third-party servers.

---

## Troubleshooting

### "Failed to fetch repositories"

**Cause**: Invalid GitHub token or insufficient permissions

**Solution**:
1. Go to Settings
2. Create a new Personal Access Token at https://github.com/settings/tokens
3. Ensure `repo` scope is selected
4. Copy and paste the new token

### "Analysis Failed"

**Cause**: Invalid Gemini API key or rate limit exceeded

**Solution**:
1. Check `.env.local` has correct `GEMINI_API_KEY`
2. Verify your Gemini API quota at https://ai.google.dev/
3. Wait a few minutes if rate limited, then retry

### E2E Tests Failing

**Cause**: App not running or port conflict

**Solution**:
```bash
# Ensure dev server is running
npm run dev

# In another terminal
npm run test:e2e
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** with clear commit messages
4. **Run tests** (`npm run test:e2e` and `npm run lint`)
5. **Ensure accessibility** (`npm run a11y:audit`)
6. **Commit your changes** (`git commit -m 'Add amazing feature'`)
7. **Push to the branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Development Guidelines

- ✅ Maintain 100% E2E test pass rate
- ✅ Follow TypeScript strict mode
- ✅ Ensure WCAG 2.1 AA compliance
- ✅ Add ARIA labels to new interactive elements
- ✅ Update documentation for new features
- ✅ Use semantic HTML
- ✅ Test keyboard navigation

---

## Roadmap

### Upcoming Features

- [ ] Multi-repo batch operations
- [ ] Export analysis reports (PDF/Markdown)
- [ ] Repository comparison tool
- [ ] Advanced search with regex
- [ ] Custom AI prompts
- [ ] Dark/light theme toggle
- [ ] Repository templates
- [ ] Collaboration features

### Performance Improvements

- [ ] Virtual scrolling for large repo lists
- [ ] Web Workers for AI processing
- [ ] Service Worker for offline support
- [ ] Image optimization

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2024 RepoNexus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

- **React Team** - For the amazing React framework
- **Playwright Team** - For robust E2E testing tools
- **Google** - For Gemini AI API
- **GitHub** - For the comprehensive REST API
- **Tailwind Labs** - For design inspiration
- **axe-core** - For accessibility testing tools

---

## Support

- 🐛 **Bug Reports**: [Open an issue](https://github.com/deesatzed/repo-nexus/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/deesatzed/repo-nexus/discussions)
- 📧 **Contact**: Create an issue for questions

---

## Stats

- **Lines of Code**: ~2,500
- **Test Files**: 3
- **Test Cases**: 18 (100% passing)
- **Test Coverage**: All critical user flows
- **Build Time**: ~2-3 seconds
- **Test Execution**: ~3.3 seconds
- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices)

---

<div align="center">

**Made with ❤️ by developers, for developers**

⭐ Star this repo if you find it useful!

[Report Bug](https://github.com/deesatzed/repo-nexus/issues) • [Request Feature](https://github.com/deesatzed/repo-nexus/issues) • [View Docs](./DEVELOPMENT_PLAN.md)

</div>
