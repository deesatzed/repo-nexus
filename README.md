# RepoNexus

<div align="center">

**AI-Powered GitHub Repository Architect & Forensic Analyst**

[![E2E Tests](https://img.shields.io/badge/E2E_Tests-18%2F18_Passing-success?style=flat-square)](./E2E_DEBUG_SUMMARY.md)
[![Accessibility](https://img.shields.io/badge/WCAG-2.1_AA-blue?style=flat-square)](#accessibility)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb?style=flat-square)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#license)

[Features](#features) • [Getting Started](#getting-started) • [Testing](#testing) • [Documentation](#documentation)

</div>

---

## Overview

RepoNexus is a next-generation engineering portfolio manager that transforms your source code into a strategic asset. It goes beyond simple listing, providing a **Chief Technology Officer's Architecture Review** of your entire repository collection. Using deep forensic analysis, it identifies reusable components, technical debt, and summarizes your engineering value into a professional resume addendum.

### Key Highlights

- 🎯 **Forensic Scanning** - Analyzes `package.json`, dependencies, and filesystem signatures.
- 🤖 **Deep Forensic Sync** - Batch 10-point architectural audit for every repository.
- 📊 **Master Nexus Strategy** - CTO-level portfolio review with interactive architectural insights.
- 📄 **Resume Portfolio Generator** - ATS-friendly Markdown/JSON export for employers.
- ♿ **Persistence & Speed** - All analyses are persistent in `localStorage` with smart-caching.
- 🎨 **Modern Dashboard** - High-fidelity dark mode with interactive nexus blueprints.

---

## Features

### Repository Intelligence

- **Quick Sync** - Rapidly fetch metadata and update repository state from GitHub.
- **Deep Sync** - Perform a batch **10-Point Architectural Assessment** on all repos. Skips already-analyzed, stagnant projects to save tokens.
- **Scan Local** - Forensic analysis of local directories. Detects:
  - Tech Signatures (`Dockerfile`, `requirements.txt`, etc.)
  - Dependency Lists (reads `package.json` for overlaps)
  - Proof-of-Life Forensics (days since last commit)
- **Summarize All (Master Strategy)** - Unified "Master Nexus Blueprint" dashboard including:
  - **Action Registry**: Status (Active/Stalled/Legacy) and immediate next steps.
  - **Cross-Pollination**: Shared component and pattern opportunities.
  - **Consolidation Roadmap**: Identify overlaps and merge candidates.
  - **Innovation Lab**: Creative brainstorming for "Missing Links" and synergistic new projects.
  - **Downloadable JSON**: Export the entire strategy for offline review.

### Resume & Career Tools

- **Distinguished Portfolio Builder** - Interactive, forensic review of your engineering career.
  - **Interactive Dashboard**: Visualizes your "Executive Summary", "Core Stack", and "Defining Projects" instantly.
  - **Web Page Exporter (HTML)**: Generate a standalone, employer-ready `portfolio.html` with premium Tailwind styling.
  - **Forensic Detail**: Displays "Novel Techniques", "Impact", and "Challenge-Action-Result" per project.
  - **Deep Registry**: Visualizes the AI's "Consolidated Registry" and suggested categories.
  - **Download Options**: Export as professional **HTML**, **Markdown**, or **JSON**.

### Deep Forensic Analysis (10-Point Standard)

Each repository sync provides:
1.  **Vitality Score** - 0-100% production readiness estimate.
2.  **Completion Gap** - List of critical missing features.
3.  **Component Catalog** - High-value reusable functions/classes with file paths.
4.  **Tech Debt Audit** - Specific anti-patterns and hardcoded risks.
5.  **Key Algorithms** - Unique logic worth preserving.
6.  **Pivot Potential** - Creative ideas to repurpose the codebase.
7.  **Dependency Risk** - Deprecated or overkill dependency flags.
8.  **Integration Surface** - API endpoints and exported CLI commands.
9.  **Architectural Pattern** - Pattern identification (MVC, Serverless, etc.).
10. **Immediate Action Plan** - Archive, Polish, Refactor, or Publish.

---

## Technology Stack

### Frontend & Logic
- **React 19.2** (Latest) & **TypeScript 5.8**
- **Vite 6.2** - Lightning-fast development & HMR
- **Tailwind CSS** - Modern dark-mode UI
- **localStorage Persistence** - Full state recovery across sessions

### AI & APIs
- **OpenRouter AI Integration** - Dynamic model selection (Gemini 2.0/Pro, etc.)
- **GitHub REST API** - Comprehensive repository management
- **File System Access API** - Forensic local directory scanning

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **GitHub Personal Access Token** with `repo` scope
- **OpenRouter API Key** (for advanced architectural features)

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/deesatzed/repo-nexus.git
   cd repo-nexus/reponexus-test
   npm install
   ```

2. **Configure Environment**
   Create a `.env.local` file:
   ```env
   OPENROUTER_API_KEY=your_key_here
   OPENROUTER_MODEL=google/gemini-2.0-flash-exp  # Optional
   ```

3. **Run Dev**
   ```bash
   npm run dev
   ```

---

## Security & Privacy

- 🔒 **Zero-Backend Architecture** - All data processing happens on your machine.
- 🔒 **Local Persistence** - API keys and repository metadata stay in `localStorage`.
- 🔒 **Secure Tokens** - GitHub tokens are sent only to GitHub's official API.
- 🔒 **Downloadable Reports** - You own your analysis; export it any time as JSON or MD.

---

## License

This project is licensed under the **MIT License**.

---

<div align="center">

**Made with ❤️ for Senior Engineers who want to turn their "Project Graveyard" into a "Strategic Asset."**

⭐ Star this repo if it helps you land your next role!

</div>
