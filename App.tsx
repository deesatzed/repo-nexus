
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GithubRepo, View, AnalysisResult } from './types';
import { GithubService } from './services/githubService';
import { analyzeRepository } from './services/geminiService';
import { migrateCacheIfNeeded } from './lib/cache';

// Reusable Components
const NavItem: React.FC<{ active: boolean; label: string; onClick: () => void; icon: React.ReactNode }> = ({ active, label, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

type SortOption = 'updated-desc' | 'updated-asc' | 'name-asc' | 'name-desc' | 'language';
type VisibilityFilter = 'all' | 'private' | 'public';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.DASHBOARD);
  const [githubToken, setGithubToken] = useState<string>(localStorage.getItem('gh_token') || '');
  const [username, setUsername] = useState<string>(localStorage.getItem('gh_user') || 'deesatzed');
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [modalTab, setModalTab] = useState<'insights' | 'readme'>('insights');
  
  // Sorting and Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');
  const [filterLang, setFilterLang] = useState<string>('All');
  const [filterVisibility, setFilterVisibility] = useState<VisibilityFilter>('all');

  const [analysis, setAnalysis] = useState<AnalysisResult>({
    projectPulse: '',
    resumePoints: [],
    forgottenIdeas: [],
    reorgAdvice: '',
    status: 'idle'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize cache migration on app load
  useEffect(() => {
    migrateCacheIfNeeded();
  }, []);

  const fetchRepos = useCallback(async () => {
    if (!githubToken || !username) return;
    setLoading(true);
    setError(null);
    try {
      const service = new GithubService(githubToken);
      const data = await service.fetchUserRepos(username);
      setRepos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [githubToken, username]);

  useEffect(() => {
    if (githubToken && username && repos.length === 0) {
      fetchRepos();
    }
  }, [fetchRepos, githubToken, username, repos.length]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gh_token', githubToken);
    localStorage.setItem('gh_user', username);
    setView(View.DASHBOARD);
    fetchRepos();
  };

  const handleAnalyze = async (repo: GithubRepo) => {
    setSelectedRepo(repo);
    setModalTab('insights');

    // Caching: Check for existing analysis in localStorage
    const cacheKey = `analysis_${repo.id}`;
    const cachedAnalysis = localStorage.getItem(cacheKey);

    if (cachedAnalysis) {
      setAnalysis(JSON.parse(cachedAnalysis));
      return; // Skip API calls if we have a cached version
    }

    // If no cache, proceed with fetching and analysis
    setAnalysis({
      projectPulse: '',
      resumePoints: [],
      forgottenIdeas: [],
      reorgAdvice: '',
      status: 'fetching_readme',
      fullReadme: ''
    });
    
    try {
      const service = new GithubService(githubToken);
      let readme = "";
      
      try {
        readme = await service.fetchRepoReadme(repo.full_name);
      } catch (readmeErr: any) {
        console.warn("Could not fetch README, proceeding with metadata only.", readmeErr);
        readme = "No README content found for this repository.";
      }

      setAnalysis(prev => ({ ...prev, status: 'analyzing', fullReadme: readme }));
      
      const result = await analyzeRepository(repo, readme);
      
      const finalAnalysis: AnalysisResult = {
        ...analysis,
        projectPulse: result.projectPulse,
        resumePoints: result.resumePoints,
        forgottenIdeas: result.forgottenIdeas,
        reorgAdvice: result.reorgAdvice,
        status: 'success',
        fullReadme: readme
      };

      // Caching: Save the final analysis to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(finalAnalysis));

      setAnalysis(finalAnalysis);
    } catch (err: any) {
      setAnalysis(prev => ({ 
        ...prev, 
        status: 'error', 
        errorDetails: err.message || "An unexpected error occurred." 
      }));
    }
  };

  const handleDeleteRepo = async (repo: GithubRepo) => {
    if (window.confirm(`Are you sure you want to permanently delete the repository "${repo.name}"? This action is irreversible.`)) {
      try {
        const service = new GithubService(githubToken);
        await service.deleteRepo(repo.full_name);
        // Refresh the repo list by removing the deleted repo from the state
        setRepos(prevRepos => prevRepos.filter(r => r.id !== repo.id));
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // Derived unique languages for filter
  const languages = useMemo(() => {
    const langs = new Set<string>();
    repos.forEach(r => { if (r.language) langs.add(r.language); });
    return ['All', ...Array.from(langs).sort()];
  }, [repos]);

  // Computed filtered and sorted repos
  const displayRepos = useMemo(() => {
    let result = [...repos];

    // Search
    if (searchTerm) {
      result = result.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter Language
    if (filterLang !== 'All') {
      result = result.filter(r => r.language === filterLang);
    }

    // Filter Visibility
    if (filterVisibility === 'private') {
      result = result.filter(r => r.private);
    } else if (filterVisibility === 'public') {
      result = result.filter(r => !r.private);
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'updated-desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'updated-asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'language':
          return (a.language || '').localeCompare(b.language || '');
        default:
          return 0;
      }
    });

    return result;
  }, [repos, searchTerm, filterLang, filterVisibility, sortBy]);

  // Parse advice string into points
  const advicePoints = useMemo(() => {
    if (!analysis.reorgAdvice) return [];
    return analysis.reorgAdvice
      .split(/\n|\.\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.endsWith('.') ? s : s + '.');
  }, [analysis.reorgAdvice]);

  return (
    <div className="min-h-screen flex bg-[#0f172a] text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-[#020617] p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">RepoNexus</h1>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem
            active={view === View.DASHBOARD}
            label="Dashboard"
            onClick={() => setView(View.DASHBOARD)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          />
          <NavItem
            active={view === View.SETTINGS}
            label="Settings"
            onClick={() => setView(View.SETTINGS)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </nav>

        <div className="mt-auto p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">Connected as</p>
          <p className="text-sm font-semibold text-white truncate">{username || 'Not configured'}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f172a]">
          <h2 className="text-lg font-semibold text-white">
            {view === View.DASHBOARD ? 'Repository Explorer' : view === View.SETTINGS ? 'Configuration' : 'Repo Analysis'}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchRepos}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Refresh Repositories"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Filters Bar (Only on Dashboard) */}
        {view === View.DASHBOARD && githubToken && (
          <div className="bg-[#0f172a]/50 backdrop-blur-md border-b border-slate-800 px-8 py-3 flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input 
                type="text" 
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
              />
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">Lang:</span>
              <select 
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
              >
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>

            {/* Visibility Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">Access:</span>
              <select 
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as VisibilityFilter)}
                className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
              >
                <option value="all">All</option>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-tight">Sort:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
              >
                <option value="updated-desc">Updated (Newest)</option>
                <option value="updated-asc">Updated (Oldest)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="language">Language</option>
              </select>
            </div>

            <div className="ml-auto text-xs text-slate-500">
              {displayRepos.length} result{displayRepos.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Dynamic Viewport */}
        <section className="flex-1 overflow-y-auto p-8 bg-[#020617]/30">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-xs uppercase font-bold tracking-widest">Dismiss</button>
            </div>
          )}

          {!githubToken && view !== View.SETTINGS && (
            <div className="max-w-2xl mx-auto text-center py-20">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">GitHub Token Required</h3>
              <p className="text-slate-400 mb-8">RepoNexus needs a Personal Access Token to iterate through your private repositories and analyze them.</p>
              <button 
                onClick={() => setView(View.SETTINGS)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all"
              >
                Go to Settings
              </button>
            </div>
          )}

          {view === View.DASHBOARD && githubToken && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayRepos.map(repo => (
                <div key={repo.id} className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all group flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-indigo-400 font-mono text-xs uppercase tracking-wider">{repo.language || 'Plain Text'}</span>
                    {repo.private && <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tighter border border-slate-700">Private</span>}
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors truncate">{repo.name}</h4>
                  <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{repo.description || 'No description provided.'}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-slate-500">Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleDeleteRepo(repo)}
                        title="Delete Repository"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                      <a 
                        href={`https://github.com/${repo.full_name}/archive/refs/heads/${repo.default_branch}.zip`}
                        download
                        title="Download as .zip"
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                      <button 
                        onClick={() => handleAnalyze(repo)}
                        className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-2"
                      >
                        Analyze AI
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {displayRepos.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-3xl">
                  No repositories match your criteria.
                </div>
              )}
            </div>
          )}

          {view === View.SETTINGS && (
            <div className="max-w-xl mx-auto bg-[#0f172a] border border-slate-800 p-8 rounded-3xl">
              <h3 className="text-xl font-bold text-white mb-6">Access Credentials</h3>
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">GitHub Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="e.g. deesatzed"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Personal Access Token (classic)</label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">Ensure 'repo' scope is selected for private access. Stored locally only.</p>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">Save Config</button>
                  <button type="button" onClick={() => setView(View.DASHBOARD)} className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </section>

        {/* Modal-like Overlay for Analysis Results */}
        {selectedRepo && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f172a] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-slate-800 shadow-2xl">
              <div className="bg-[#0f172a] border-b border-slate-800 p-6 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-2xl font-bold text-white">{selectedRepo.name}</h3>
                  <p className="text-slate-400 text-sm">AI Analysis Report</p>
                </div>
                <button onClick={() => setSelectedRepo(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tab Switcher */}
              {analysis.status === 'success' && (
                <div className="bg-slate-900/50 flex px-6 border-b border-slate-800 shrink-0">
                  <button 
                    onClick={() => setModalTab('insights')}
                    className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${modalTab === 'insights' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    AI Insights
                  </button>
                  <button 
                    onClick={() => setModalTab('readme')}
                    className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${modalTab === 'readme' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                  >
                    Source README
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-8">
                {(analysis.status === 'fetching_readme' || analysis.status === 'analyzing') && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg text-white font-medium">
                        {analysis.status === 'fetching_readme' ? 'Reading source files...' : 'Gemini is scanning project DNA...'}
                    </p>
                    <p className="text-slate-500 text-sm mt-2 italic">
                        {analysis.status === 'fetching_readme' ? 'Contacting GitHub API' : 'Refining resume points and extracting forgotten gems.'}
                    </p>
                  </div>
                )}

                {analysis.status === 'error' && (
                  <div className="py-12 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-2">Analysis Failed</h4>
                    <p className="text-slate-400 mb-6">{analysis.errorDetails}</p>
                    <button 
                        onClick={() => handleAnalyze(selectedRepo)}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                    >
                        Retry Analysis
                    </button>
                  </div>
                )}

                {analysis.status === 'success' && modalTab === 'insights' && (
                  <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* Project Pulse Section - HIGHLIGHTED */}
                    <section className="relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-violet-600/10 rounded-3xl -z-10 group-hover:from-indigo-600/20 group-hover:to-violet-600/20 transition-all duration-500"></div>
                      <div className="p-8 border border-indigo-500/30 rounded-3xl shadow-xl shadow-indigo-500/5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <h4 className="text-lg font-bold text-white tracking-tight">Project Identity</h4>
                        </div>
                        <p className="text-xl md:text-2xl font-medium text-slate-100 leading-tight italic">
                          "{analysis.projectPulse}"
                        </p>
                        <div className="mt-4 flex gap-2">
                           <span className="h-1 w-12 bg-indigo-500 rounded-full"></span>
                           <span className="h-1 w-4 bg-indigo-500/40 rounded-full"></span>
                           <span className="h-1 w-2 bg-indigo-500/20 rounded-full"></span>
                        </div>
                      </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Resume Section */}
                      <section>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Resume Descriptors</h4>
                        </div>
                        <ul className="space-y-3">
                          {analysis.resumePoints.map((point, idx) => (
                            <li key={idx} className="flex gap-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                              <span className="text-indigo-400 font-mono text-sm">•</span>
                              <p className="text-slate-300 text-sm leading-relaxed">{point}</p>
                            </li>
                          ))}
                        </ul>
                      </section>

                      {/* Ideas Section */}
                      <section>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 3c1.268 0 2.39.675 3 1.7" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M15 12h.01M12 16h.01" /></svg>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Forgotten Gems</h4>
                        </div>
                        <div className="space-y-4">
                          {analysis.forgottenIdeas.map((idea, idx) => (
                            <div key={idx} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl relative group overflow-hidden">
                              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rotate-45 translate-x-8 -translate-y-8 group-hover:bg-amber-500/10 transition-all"></div>
                              <p className="text-slate-300 text-sm leading-relaxed">{idea}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    {/* Reorg Advice */}
                    <section className="bg-slate-800/20 p-6 rounded-2xl border-l-4 border-indigo-600 shadow-lg shadow-indigo-600/5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <h4 className="text-sm font-bold text-white">Structural Strategy</h4>
                      </div>
                      <div className="space-y-2">
                        {advicePoints.length > 1 ? (
                          <ul className="space-y-2">
                            {advicePoints.map((point, idx) => (
                              <li key={idx} className="flex gap-3 text-slate-400 text-sm leading-relaxed">
                                <span className="text-indigo-400 font-bold shrink-0">•</span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-slate-400 text-sm leading-relaxed">{analysis.reorgAdvice}</p>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {analysis.status === 'success' && modalTab === 'readme' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-slate-700/50 text-slate-300 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Repository README</h4>
                    </div>
                    <div className="bg-[#020617] p-6 rounded-2xl border border-slate-800 font-mono text-sm overflow-x-auto whitespace-pre-wrap text-slate-300 leading-relaxed max-h-[500px] overflow-y-auto">
                      {analysis.fullReadme}
                    </div>
                    <div className="mt-4 text-xs text-slate-500 italic">
                      Displaying raw content fetched from GitHub.
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-900/50 border-t border-slate-800 text-center shrink-0">
                <button 
                  onClick={() => setSelectedRepo(null)}
                  className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
