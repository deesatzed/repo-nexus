
export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  updated_at: string;
  readme_content?: string;
  default_branch: string;
}

export interface AnalysisResult {
  projectPulse: string;
  resumePoints: string[];
  forgottenIdeas: string[];
  reorgAdvice: string;
  status: 'idle' | 'fetching_readme' | 'analyzing' | 'success' | 'error';
  errorDetails?: string;
  fullReadme?: string;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  REPO_DETAIL = 'REPO_DETAIL',
  SETTINGS = 'SETTINGS'
}
