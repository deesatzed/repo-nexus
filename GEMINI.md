# GEMINI.md

This document provides a comprehensive overview of the **RepoNexus AI Repository Architect** project, intended to serve as a quick-start guide and context for development.

## Project Overview

RepoNexus is a web application designed to analyze GitHub repositories using AI. It provides users with deep insights into their projects, helping them understand the codebase, identify key features, and get suggestions for improvement.

The application is built using a modern web stack:

*   **Frontend:** React and TypeScript, built with Vite.
*   **Styling:** Tailwind CSS (inferred from class names like `flex`, `bg-indigo-600`, etc. in `App.tsx`).
*   **Core Functionality:**
    *   Connects to the GitHub API to fetch user repositories.
    *   Uses the Google Gemini API for AI-powered code analysis.
*   **Architecture:**
    *   The main application logic is contained within the `App.tsx` component.
    *   External API interactions are separated into services: `services/githubService.ts` for GitHub and `services/geminiService.ts` for the Gemini AI.
    *   Shared data structures are defined in `types.ts`.

## Building and Running the Project

### Prerequisites

*   Node.js and npm
*   A Gemini API Key

### Local Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Up Environment Variables:**
    Create a `.env.local` file in the project root and add your Gemini API key:
    ```
    GEMINI_API_KEY=your_gemini_api_key
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Key Scripts

*   `npm run dev`: Starts the Vite development server.
*   `npm run build`: Compiles the TypeScript and React code for production.
*   `npm run preview`: Serves the production build locally.

## Development Conventions

*   **TypeScript:** The project uses TypeScript for static typing. Type definitions for key data structures are located in `types.ts`.
*   **Component-Based Architecture:** The UI is built with React components. The main application component is `App.tsx`.
*   **Services:** External API calls are encapsulated in dedicated service files (`services/githubService.ts`, `services/geminiService.ts`) to separate concerns.
*   **State Management:** The primary application state is managed within the `App.tsx` component using React hooks (`useState`, `useEffect`, etc.).
*   **Configuration:** The Vite configuration (`vite.config.ts`) handles environment variables and sets up path aliases (`@/` for the root directory).
*   **API Keys:** The Gemini API key is exposed to the application through the Vite `define` configuration, making it available as `process.env.GEMINI_API_KEY`.
