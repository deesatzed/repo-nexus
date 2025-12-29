
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { GithubRepo, View, AnalysisResult } from './types';
import { GithubService } from './services/githubService';
import { LocalFileSystemService } from './services/localFileSystemService';
import { analyzeRepository, summarizeInventory } from './services/geminiService';
import { migrateCacheIfNeeded } from './lib/cache';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ConfirmModal } from './components/ConfirmModal';

// Reusable Components
const NavItem: React.FC<{ active: boolean; label: string; onClick: () => void; icon: React.ReactNode }> = ({ active, label, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<GithubRepo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [syncLimit, setSyncLimit] = useState<number>(Number(localStorage.getItem('sync_limit')) || 20);
  const [localRepos, setLocalRepos] = useState<GithubRepo[]>(() => {
    const saved = localStorage.getItem('local_repos');
    return saved ? JSON.parse(saved) : [];
  });
  const [inventoryAnalysis, setInventoryAnalysis] = useState<any>(() => {
    const saved = localStorage.getItem('inventory_analysis');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);

  const downloadHtmlPortfolio = () => {
    if (!portfolioData) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Engineering Portfolio</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="bg-slate-900 text-slate-200">
    <div class="max-w-5xl mx-auto px-6 py-20">
        <header class="mb-20">
            <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-6">Distinguished Engineer Portfolio</h1>
            <div class="text-xl text-slate-400 leading-relaxed max-w-3xl">\${portfolioData.executiveSummary?.replace(/\\n/g, '<br/>')}</div>
        </header>

        <section class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-20 bg-slate-800/50 p-8 rounded-3xl border border-slate-700">
             <div><div class="text-4xl font-bold text-white mb-2">\${portfolioData.quantitativeHighlights?.totalrepositories || 0}</div><div class="text-xs uppercase tracking-widest text-slate-500">Repositories</div></div>
             <div><div class="text-sm text-slate-300 font-mono">\${portfolioData.quantitativeHighlights?.dominantTechStack?.slice(0, 3).join(', ')}...</div><div class="text-xs uppercase tracking-widest text-slate-500 mt-2">Core Stack</div></div>
             <div class="col-span-2 border-l border-slate-700 pl-8">
                <h3 class="text-xs uppercase tracking-widest text-slate-500 mb-2">Signature Style</h3>
                <p class="italic text-slate-300">"\${portfolioData.engineeringPhilosophy}"</p>
             </div>
        </section>

        <section class="mb-20">
            <h2 class="text-3xl font-bold text-white mb-10 border-b border-slate-800 pb-4">Defining Projects</h2>
            <div class="grid grid-cols-1 gap-12">
                \${portfolioData.projectShowcase?.map((p: any) => \`
                <div class="group relative bg-slate-800 p-8 rounded-3xl border border-slate-700 hover:border-cyan-500/50 transition-all">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <h3 class="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">\${p.name}</h3>
                            <div class="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">\${p.roleDefinition}</div>
                        </div>
                        <div class="flex gap-2">
                             \${p.techTags?.map((t: string) => \`<span class="px-3 py-1 bg-slate-700 rounded-full text-xs font-medium text-cyan-300 border border-cyan-500/20">\${t}</span>\`).join('')}
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                        <div class="bg-red-500/10 p-4 rounded-xl border border-red-500/10">
                            <strong class="block text-red-400 mb-1 uppercase text-xs">The Challenge</strong>
                            \${p.problem}
                        </div>
                        <div class="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/10">
                            <strong class="block text-emerald-400 mb-1 uppercase text-xs">The Solution</strong>
                            \${p.solution}
                        </div>
                        <div class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/10">
                            <strong class="block text-blue-400 mb-1 uppercase text-xs">Impact & Scale</strong>
                            \${p.impact}
                        </div>
                    </div>
                     \${p.novelTechniques?.length ? \`
                    <div class="mt-6 pt-6 border-t border-slate-700">
                        <strong class="text-xs uppercase text-slate-500 mb-2 block">Novel Techniques Exploration</strong>
                        <ul class="grid grid-cols-2 gap-2">
                            \${p.novelTechniques.map((nt: string) => \`<li class="flex items-center gap-2 text-slate-300 text-sm"><span class="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>\${nt}</li>\`).join('')}
                        </ul>
                    </div>
                    \` : ''}
                </div>
                \`).join('')}
            </div>
        </section>

        <section>
            <h2 class="text-3xl font-bold text-white mb-10 border-b border-slate-800 pb-4">Complete Registry</h2>
            <div class="grid grid-cols-1 gap-8">
                 \${Array.isArray(portfolioData.fullProjectRegistry) 
                    ? portfolioData.fullProjectRegistry.map((r: any) => \`
                        <div class="flex justify-between items-baseline border-b border-slate-800 pb-2">
                            <div class="font-mono text-cyan-200 font-bold">\${r.name}</div>
                            <div class="text-sm text-slate-500 truncate max-w-xl">\${r.description}</div>
                        </div>\`).join('') 
                    : Object.entries(portfolioData.fullProjectRegistry || {}).map(([cat, items]: [string, any]) => \`
                        <div class="mb-8">
                            <div class="text-xl font-bold text-slate-400 mb-4 uppercase tracking-widest">\${cat}</div>
                            \${items.map((r: any) => \`
                            <div class="flex justify-between items-baseline border-b border-slate-800 pb-2 mb-2 group hover:bg-slate-800/50 p-2 rounded transition-colors">
                                <div>
                                    <span class="font-mono text-cyan-200 font-bold mr-3">\${r.name}</span>
                                    <span class="text-xs text-slate-600 border border-slate-700 px-1 rounded">\${r.status || 'Active'}</span>
                                    \${r.standoutFactor ? \`<span class="ml-2 text-xs text-amber-500/80 italic">★ \${r.standoutFactor}</span>\` : ''}
                                </div>
                                <div class="text-sm text-slate-500 text-right truncate max-w-xs">\${r.description}</div>
                            </div>\`).join('')}
                        </div>
                    \`).join('')}
            </div>
        </section>
        
        <footer class="mt-20 pt-10 border-t border-slate-800 text-center text-slate-600 text-sm">
            Generated by RepoNexus AI | Validated Forensic Architecture
        </footer>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-distinguished.html';
    a.click();
  };

  const renderPortfolioView = () => {
    if (!portfolioData) return null;

    return (
      <div className="animate-fade-in pb-20">
        <div className="flex justify-between items-center mb-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">💼</span> Distinguished Portfolio
            </h2>
            <p className="text-slate-400 text-sm">Curated forensic verification of your engineering career.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setView(View.INVENTORY)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Back to Inventory</button>
            <button onClick={downloadHtmlPortfolio} className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center gap-2">
              Export as Web Page (HTML)
            </button>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-3xl border border-indigo-500/30 shadow-2xl mb-12 relative overflow-hidden">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 relative z-10">Engineering Executive Summary</h1>
          <div className="text-lg text-slate-300 leading-relaxed max-w-4xl relative z-10 whitespace-pre-wrap">{portfolioData.executiveSummary}</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12 pt-10 border-t border-slate-800 relative z-10">
            <div className="bg-slate-950/50 p-4 rounded-xl text-center border border-slate-800">
              <div className="text-3xl font-bold text-white mb-1">{portfolioData.quantitativeHighlights?.totalrepositories || 0}</div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Repositories</div>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl text-center border border-slate-800">
              <div className="text-3xl font-bold text-white mb-1">{Object.keys(portfolioData.quantitativeHighlights?.languagesBreakdown || {}).length}</div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Languages</div>
            </div>
            <div className="col-span-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex items-center">
              <div>
                <div className="text-xs uppercase tracking-widest text-indigo-400 mb-2">Signature Style</div>
                <div className="text-sm text-slate-300 italic">"{portfolioData.engineeringPhilosophy}"</div>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-white mb-8 border-l-4 border-cyan-500 pl-4">Defining Projects & Novel Techniques</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {portfolioData.projectShowcase?.map((proj: any, idx: number) => (
            <div key={idx} className="bg-slate-800/80 p-8 rounded-3xl border border-slate-700 hover:border-cyan-500/40 transition-all group shadow-xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors mb-2">{proj.name}</h4>
                  <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider rounded-lg border border-indigo-500/20">{proj.roleDefinition}</span>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div><strong className="text-indigo-400 text-xs uppercase tracking-wider block mb-1">Challenge</strong><p className="text-slate-300 text-sm">{proj.problem}</p></div>
                <div><strong className="text-emerald-400 text-xs uppercase tracking-wider block mb-1">Solution</strong><p className="text-slate-300 text-sm">{proj.solution}</p></div>
                <div><strong className="text-cyan-400 text-xs uppercase tracking-wider block mb-1">Impact</strong><p className="text-slate-300 text-sm font-semibold">{proj.impact}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const closeButtonRef = useRef<HTMLButtonElement>(null);

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
    status: 'idle',
    level: 'superficial'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingRepoId, setDeletingRepoId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Initialize cache migration on app load
  useEffect(() => {
    migrateCacheIfNeeded();
  }, []);

  // ESC key handler for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedRepo) {
        setSelectedRepo(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedRepo]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const syncRepositories = useCallback(async (token: string, repoList: GithubRepo[]) => {
    setIsSyncing(true);
    const service = new GithubService(token);
    let completed = 0;
    const limitedRepos = repoList.slice(0, syncLimit);

    for (const repo of limitedRepos) {
      setSyncProgress({ current: completed, total: limitedRepos.length, currentName: repo.name });
      const cacheKey = `analysis_${repo.id}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) {
        try {
          const readme = await service.fetchRepoReadme(repo.full_name);
          const result = await analyzeRepository(repo, readme, 'superficial');
          const finalAnalysis: AnalysisResult = {
            ...result,
            status: 'success',
            level: 'superficial',
            fullReadme: readme
          };
          localStorage.setItem(cacheKey, JSON.stringify(finalAnalysis));
        } catch (err) {
          console.error(`Failed to sync ${repo.name}:`, err);
        }
      }
      completed++;
    }
    setIsSyncing(false);
    setToast({ message: 'All repositories synchronized and analyzed', type: 'success' });
  }, []);

  const fetchRepos = useCallback(async (shouldSync = false) => {
    if (!githubToken) return;
    setLoading(true);
    setError(null);
    try {
      const service = new GithubService(githubToken);
      const data = await service.fetchUserRepos();
      setRepos(data);
      if (shouldSync || localStorage.getItem('last_sync_count') !== data.length.toString()) {
        localStorage.setItem('last_sync_count', data.length.toString());
        syncRepositories(githubToken, data);
      }
      setToast({ message: `Loaded ${data.length} repositories`, type: 'success' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch repositories';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [githubToken, syncRepositories]);

  useEffect(() => {
    if (githubToken && username && repos.length === 0) {
      fetchRepos();
    }
  }, [fetchRepos, githubToken, username, repos.length]);

  const handleScanLocal = async () => {
    setLoading(true);
    try {
      const service = new LocalFileSystemService();
      const newRepos = await service.selectAndScan();
      const updatedLocal = [...localRepos, ...newRepos];
      // Use a Map to deduplicate by full_name
      const uniqueLocal = Array.from(new Map(updatedLocal.map(r => [r.full_name, r])).values());

      setLocalRepos(uniqueLocal);
      localStorage.setItem('local_repos', JSON.stringify(uniqueLocal));
      setToast({ message: `Found ${newRepos.length} local repositories`, type: 'success' });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setToast({ message: `Scan failed: ${err.message || 'Unknown error'}`, type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeInventory = async () => {
    setIsSummarizing(true);
    try {
      const allRepos = [...repos, ...localRepos];

      // Enrich the data sent to AI with cached analysis if it exists
      const enrichedSummaries = allRepos.map(r => {
        const cached = localStorage.getItem(`analysis_${r.id}`);
        const parsed = cached ? JSON.parse(cached) : null;

        // Calculate days since last update for accurate "Stalled" detection
        const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(r.updated_at).getTime()) / (1000 * 3600 * 24));

        return {
          name: r.name,
          language: r.language,
          description: r.description,
          daysSinceUpdate: daysSinceUpdate,
          // @ts-ignore - techSignature exists on local repos now
          techSignature: r.techSignature || { detectedFiles: [], dependencies: [] },
          pulse: parsed?.projectPulse || 'No analysis available'
        };
      });

      const result = await summarizeInventory(enrichedSummaries);
      setInventoryAnalysis(result);
      localStorage.setItem('inventory_analysis', JSON.stringify(result));
      setView(View.INVENTORY);
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDeepSyncAll = async () => {
    const allRepos = [...repos, ...localRepos];
    let processed = 0;

    setToast({ message: `Starting Deep Sync on ${allRepos.length} repositories...`, type: 'success' });

    for (const repo of allRepos) {
      // Cache Check: Don't re-analyze if we have data and the repo is old/stagnant
      const cacheKey = `analysis_${repo.id}`;
      const cachedRaw = localStorage.getItem(cacheKey);

      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        // If we have the NEW 10-point schema (check for 'vitalityScore'), skip
        if (cached.vitalityScore !== undefined) {
          console.log(`Skipping ${repo.name} - already has deep analysis.`);
          continue;
        }
      }

      // Run Analysis
      try {
        setToast({ message: `Analyzing ${repo.name} (${processed + 1}/${allRepos.length})...`, type: 'success' });

        // Fetch fresh README if possible
        const service = new GithubService(githubToken);
        let readme = "";
        try {
          if (!repo.isLocal) readme = await service.fetchRepoReadme(repo.full_name);
          else readme = repo.readme_content || "";
        } catch { readme = "No README"; }

        // Use 'superficial' level but with the NEW prompt that demands 10 points
        const result = await analyzeRepository(repo, readme, 'superficial');

        const finalAnalysis: AnalysisResult = {
          ...result,
          status: 'success',
          level: 'superficial',
          fullReadme: readme
        };

        localStorage.setItem(cacheKey, JSON.stringify(finalAnalysis));
        processed++;
      } catch (e) {
        console.error(`Failed to analyze ${repo.name}`, e);
      }
    }

    setToast({ message: `Deep Sync Complete. Updated ${processed} repositories.`, type: 'success' });
  };

  const handleGenerateResume = async () => {
    setToast({ message: 'Generating Professional Portfolio...', type: 'success' });

    try {
      const allRepos = [...repos, ...localRepos];

      // Gather all cached analyses
      const analyses = allRepos.map(r => {
        const cached = localStorage.getItem(`analysis_${r.id}`);
        return cached ? JSON.parse(cached) : null;
      }).filter(Boolean);

      if (analyses.length === 0) {
        setToast({ message: 'Please run "Deep Sync" first to analyze repositories', type: 'error' });
        return;
      }

      // Call AI to generate resume portfolio
      const { generateResumePortfolio } = await import('./services/geminiService');
      const portfolio = await generateResumePortfolio(allRepos, analyses);

      setPortfolioData(portfolio);
      setView(View.PORTFOLIO);
      setToast({ message: 'Portfolio Generated! Review and Export.', type: 'success' });
      return;

      // Format as Markdown
      const markdown = `# Distinguished Engineer's Portfolio Report

## Executive Summary
${portfolio.executiveSummary}

---

## Engineering Impact By The Numbers
* **Total Repositories:** ${portfolio.quantitativeHighlights?.totalrepositories || allRepos.length}
* **Top Languages:** ${Object.entries(portfolio.quantitativeHighlights?.languagesBreakdown || {}).map(([k, v]) => `${k} (${v})`).join(', ')}
* **Core Tech Stack:** ${portfolio.quantitativeHighlights?.dominantTechStack?.join(', ')}
* **Architectural Diversity:** ${portfolio.quantitativeHighlights?.architecturalPatterns?.join(', ')}

---

## Engineering Philosophy & Signature Style
> ${portfolio.engineeringPhilosophy}

---

## Defining Projects (Challenge-Action-Result Showcase)

${portfolio.projectShowcase?.map((proj: any) => `
### ${proj.name}
**Role:** ${proj.roleDefinition}

* **Challenge:** ${proj.problem}
* **Solution:** ${proj.solution}
* **Impact:** ${proj.impact}

**Tech Stack:** ${proj.techTags?.join(', ')}
`).join('\n---\n') || 'No priority projects identified'}

---

## Full Project Registry: Complete Domain Map

${Array.isArray(portfolio.fullProjectRegistry)
          ? portfolio.fullProjectRegistry.map((repo: any) => `* **${repo.name}** (${repo.status || 'Active'}): ${repo.description}`).join('\n')
          : Object.entries(portfolio.fullProjectRegistry || {}).map(([domain, repos]: [string, any]) => `
### ${domain}
${Array.isArray(repos) ? repos.map((r: any) => `* **${r.name}** (${r.status || 'Active'}): ${r.description}`).join('\n') : ''}
`).join('\n')
        }

---

## Technical Skills Matrix

* **Languages:** ${portfolio.skillsMatrix?.languages?.join(', ') || 'N/A'}
* **Frameworks:** ${portfolio.skillsMatrix?.frameworks?.join(', ') || 'N/A'}
* **Tools & Infrastructure:** ${portfolio.skillsMatrix?.tools?.join(', ') || 'N/A'}
* **Core Concepts:** ${portfolio.skillsMatrix?.concepts?.join(', ') || 'N/A'}

---

*Verified by RepoNexus AI Forensic Analysis*
*Portfolio Volume: ${allRepos.length} Repositories*
*Date: ${new Date().toLocaleDateString()}*
`;

      // Download as Markdown
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-resume-addendum-${new Date().toISOString().split('T')[0]}.md`;
      a.click();

      // Also save JSON version
      const jsonBlob = new Blob([JSON.stringify(portfolio, null, 2)], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonA = document.createElement('a');
      jsonA.href = jsonUrl;
      jsonA.download = `portfolio-data-${new Date().toISOString().split('T')[0]}.json`;
      jsonA.click();

      setToast({ message: 'Resume Portfolio Generated! Check your downloads.', type: 'success' });
    } catch (err: any) {
      setToast({ message: err.message, type: 'error' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      localStorage.setItem('gh_token', githubToken);
      localStorage.setItem('gh_user', username);
      localStorage.setItem('sync_limit', syncLimit.toString());
      setView(View.DASHBOARD);
      await fetchRepos();
      setToast({ message: 'Settings saved successfully', type: 'success' });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAnalyze = async (repo: GithubRepo, level: 'superficial' | 'detailed' = 'superficial') => {
    setSelectedRepo(repo);
    setModalTab('insights');

    // Caching: Check for existing analysis in localStorage
    const cacheKey = `analysis_${repo.id}`;
    const cachedAnalysisRaw = localStorage.getItem(cacheKey);
    const cachedAnalysis: AnalysisResult | null = cachedAnalysisRaw ? JSON.parse(cachedAnalysisRaw) : null;

    if (cachedAnalysis && (level === 'superficial' || cachedAnalysis.level === 'detailed')) {
      setAnalysis(cachedAnalysis);
      return;
    }

    // If no cache or we need higher level, proceed with fetching and analysis
    setAnalysis({
      projectPulse: '',
      resumePoints: [],
      forgottenIdeas: [],
      reorgAdvice: '',
      status: 'fetching_readme',
      level: level,
      fullReadme: ''
    });

    try {
      const service = new GithubService(githubToken);
      let readme = cachedAnalysis?.fullReadme || "";

      if (!readme) {
        try {
          readme = await service.fetchRepoReadme(repo.full_name);
        } catch (readmeErr: unknown) {
          console.warn("Could not fetch README, proceeding with metadata only.", readmeErr);
          readme = "No README content found for this repository.";
        }
      }

      let fileTree = "";
      if (level === 'detailed') {
        setAnalysis(prev => ({ ...prev, status: 'fetching_readme' })); // Reuse for "scanning files"
        const contents = await service.fetchRepoContents(repo.full_name);
        fileTree = contents.map((f: any) => `${f.type === 'dir' ? '[DIR]' : '[FILE]'} ${f.path}`).join('\n');
      }

      setAnalysis(prev => ({ ...prev, status: 'analyzing', fullReadme: readme }));

      const result = await analyzeRepository(repo, readme, level, fileTree);

      const finalAnalysis: AnalysisResult = {
        ...result,
        status: 'success',
        level: level,
        fullReadme: readme
      };

      // Caching: Save the final analysis to localStorage
      localStorage.setItem(cacheKey, JSON.stringify(finalAnalysis));

      setAnalysis(finalAnalysis);
    } catch (err: unknown) {
      setAnalysis(prev => ({
        ...prev,
        status: 'error',
        level: level,
        errorDetails: err instanceof Error ? err.message : "An unexpected error occurred."
      }));
    }
  };

  const handleDeleteRepo = async (repo: GithubRepo) => {
    setRepoToDelete(repo);
  };

  const confirmDeleteRepo = async () => {
    if (!repoToDelete) return;
    const repo = repoToDelete;
    setDeletingRepoId(repo.id);
    try {
      const service = new GithubService(githubToken);
      await service.deleteRepo(repo.full_name);
      setRepos(prevRepos => prevRepos.filter(r => r.id !== repo.id));
      setToast({ message: `Repository "${repo.name}" deleted successfully`, type: 'success' });
      setRepoToDelete(null);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete repository';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setDeletingRepoId(null);
    }
  };

  // Derived unique languages for filter
  // IMPORTANT: Always combine repos (GitHub) and localRepos (Local Folder) for portfolio-wide state
  const languages = useMemo(() => {
    const langs = new Set<string>();
    [...repos, ...localRepos].forEach(r => { if (r.language) langs.add(r.language); });
    return ['All', ...Array.from(langs).sort()];
  }, [repos, localRepos]);

  // Computed filtered and sorted repos
  const displayRepos = useMemo(() => {
    let result = [...repos, ...localRepos];

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
  }, [repos, localRepos, searchTerm, filterLang, filterVisibility, sortBy]);

  // Parse advice string into points
  const advicePoints = useMemo(() => {
    if (!analysis.reorgAdvice) return [];
    return analysis.reorgAdvice
      .split(/\n|\.?\s*•\s*|\.\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5)
      .map(s => s.endsWith('.') ? s : s + '.');
  }, [analysis.reorgAdvice]);

  return (
    <div className="min-h-screen flex bg-[#0f172a] text-slate-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[320px] max-w-md animate-in slide-in-from-top-4 fade-in duration-300 ${toast.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          role="alert"
          aria-live="polite"
        >
          {toast.type === 'success' ? (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="flex-1 font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

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
            active={view === View.INVENTORY}
            label="Inventory"
            onClick={() => setView(View.INVENTORY)}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
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
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Open mobile menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-white">
              {view === View.DASHBOARD ? 'Repository Explorer' : view === View.SETTINGS ? 'Configuration' : view === View.INVENTORY ? 'Inventory Summary' : 'Repo Analysis'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchRepos(true)}
              disabled={loading}
              className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Quick Sync
            </button>
            <button
              onClick={handleScanLocal}
              disabled={loading}
              className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Scan Local
            </button>
            <button
              onClick={handleDeepSyncAll}
              disabled={loading || isSyncing}
              className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Deep Sync
            </button>
            <button
              onClick={handleSummarizeInventory}
              disabled={isSummarizing || (repos.length === 0 && localRepos.length === 0)}
              className="px-3 py-1.5 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isSummarizing ? 'Summarizing...' : 'Summarize All'}
            </button>
            <button
              onClick={handleGenerateResume}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 hover:from-blue-600/20 hover:to-cyan-600/20 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Resume Portfolio
            </button>
            <button
              onClick={() => fetchRepos()}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh repositories"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <label htmlFor="search-repos" className="sr-only">
                Search repositories
              </label>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                id="search-repos"
                type="text"
                placeholder="Search repositories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#020617] border border-slate-800 rounded-lg pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
              />
            </div>

            {/* Language Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-lang" className="text-xs text-slate-500 font-medium uppercase tracking-tight">Lang:</label>
              <select
                id="filter-lang"
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                onBlur={(e) => setFilterLang(e.target.value)}
                className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
              >
                {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
              </select>
            </div>

            {/* Visibility Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="filter-visibility" className="text-xs text-slate-500 font-medium uppercase tracking-tight">Access:</label>
              <select
                id="filter-visibility"
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as VisibilityFilter)}
                onBlur={(e) => setFilterVisibility(e.target.value as VisibilityFilter)}
                className="bg-[#020617] border border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-300"
              >
                <option value="all">All</option>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2">
              <label htmlFor="sort-by" className="text-xs text-slate-500 font-medium uppercase tracking-tight">Sort:</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                onBlur={(e) => setSortBy(e.target.value as SortOption)}
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
                  <h4 className="text-lg font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors truncate flex items-center gap-2">
                    {repo.name}
                    {repo.isLocal && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">LOCAL</span>}
                  </h4>
                  <p className="text-sm text-slate-400 mb-6 line-clamp-2 h-10">{repo.description || 'No description provided.'}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xs text-slate-500">Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleDeleteRepo(repo)}
                        disabled={deletingRepoId === repo.id}
                        aria-label={`Delete repository ${repo.name}`}
                        className="text-red-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingRepoId === repo.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        )}
                      </button>
                      <a
                        href={`https://github.com/${repo.full_name}/archive/refs/heads/${repo.default_branch}.zip`}
                        download
                        aria-label={`Download ${repo.name} as zip file`}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                      <button
                        onClick={() => handleAnalyze(repo)}
                        aria-label={`Analyze ${repo.name} with AI`}
                        className="text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-2"
                      >
                        Analyze AI
                        <svg className="w-4 h-4" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
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
                  <label htmlFor="github-username" className="block text-sm font-medium text-slate-400 mb-2">GitHub Username</label>
                  <input
                    id="github-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="e.g. deesatzed"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="github-token" className="block text-sm font-medium text-slate-400 mb-2">Personal Access Token (classic)</label>
                  <input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <p className="mt-2 text-xs text-slate-500">Ensure &apos;repo&apos; scope is selected for private access. Stored locally only.</p>
                </div>
                <div>
                  <label htmlFor="sync-limit" className="block text-sm font-medium text-slate-400 mb-2">Analysis Sync Limit (First X Repos)</label>
                  <input
                    id="sync-limit"
                    type="number"
                    value={syncLimit}
                    onChange={(e) => setSyncLimit(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    placeholder="e.g. 20"
                    min="1"
                    max="100"
                  />
                  <p className="mt-2 text-xs text-slate-500">Limits the number of repositories analyzed during background synchronization to save API tokens.</p>
                </div>
                <div className="pt-4 flex gap-4">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingSettings && (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {savingSettings ? 'Saving...' : 'Save Config'}
                  </button>
                  <button type="button" onClick={() => setView(View.DASHBOARD)} className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition-all">Cancel</button>
                </div>
              </form>
            </div>
          )}


          {view === View.PORTFOLIO && renderPortfolioView()}

          {view === View.INVENTORY && inventoryAnalysis && (
            <div className="max-w-7xl mx-auto space-y-12 pb-32">
              {/* Strategic Header */}
              <section className="bg-gradient-to-br from-[#1e1b4b] via-slate-900 to-black border border-indigo-500/20 p-16 rounded-[4rem] shadow-2xl relative">
                <div className="absolute top-0 right-0 p-8 flex gap-4">
                  <button
                    onClick={() => {
                      const report = {
                        strategy: inventoryAnalysis,
                        repos: [...repos, ...localRepos].map(r => {
                          const cached = localStorage.getItem(`analysis_${r.id}`);
                          return {
                            ...r,
                            analysis: cached ? JSON.parse(cached) : null
                          };
                        })
                      };
                      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `nexus-master-strategy-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      setToast({ message: 'Full Nexus Report Downloaded', type: 'success' });
                    }}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-full text-xs font-bold uppercase tracking-widest border border-slate-700 transition-all"
                  >
                    Download Full Report
                  </button>
                  <span className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs font-bold tracking-widest uppercase">Nexus Master Blueprint</span>
                </div>
                <div className="max-w-3xl">
                  <h3 className="text-5xl font-black text-white tracking-tighter mb-8 leading-none">The Master Nexus Strategy</h3>
                  <p className="text-2xl text-slate-300 font-medium leading-relaxed border-l-4 border-indigo-500 pl-8">
                    {inventoryAnalysis.executiveSummary}
                  </p>
                </div>
              </section>

              {/* Actionable Repo Registry */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h4 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-sm">01</span>
                    Repository Action Registry
                  </h4>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 bg-emerald-400 rounded-full"></span> Active</span>
                    <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 bg-amber-400 rounded-full"></span> Stalled</span>
                    <span className="flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 bg-slate-500 rounded-full"></span> Legacy</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {(inventoryAnalysis.repoRegistry || []).map((item: any, i: number) => {
                    const foundRepo = [...repos, ...localRepos].find(r => r.name === item.name);
                    const cachedRaw = foundRepo ? localStorage.getItem(`analysis_${foundRepo.id}`) : null;
                    const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

                    return (
                      <div key={i} className="bg-[#0f172a] border border-slate-800 p-8 rounded-3xl hover:border-indigo-500/30 transition-all grid grid-cols-1 gap-6 group">
                        {/* Header Row */}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-6 pb-6 border-b border-slate-800/50">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-3 h-12 rounded-full ${item.status === 'Active' ? 'bg-emerald-500' : item.status === 'Stalled' ? 'bg-amber-500' : item.status === 'Legacy' ? 'bg-slate-700' : 'bg-indigo-500'}`}></div>
                            <div>
                              <h5 className="text-white font-bold text-2xl group-hover:text-indigo-400 transition-colors flex items-center gap-3 cursor-pointer"
                                onClick={() => foundRepo && handleAnalyze(foundRepo)}
                              >
                                {item.name}
                                <svg className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </h5>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-slate-500 text-xs font-mono uppercase tracking-tight bg-slate-800 px-2 py-0.5 rounded">{item.status}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${item.priority === 'High' ? 'text-red-400 bg-red-400/10' :
                                  item.priority === 'Medium' ? 'text-amber-400 bg-amber-400/10' :
                                    'text-emerald-400 bg-emerald-400/10'
                                  }`}>{item.priority} Priority</span>
                              </div>
                            </div>
                          </div>
                          <div className="lg:w-1/2">
                            <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-indigo-500/50 pl-4"><span className="text-indigo-400 font-bold">Recommended Action:</span> {item.action}</p>
                            <p className="text-slate-500 text-xs mt-1 pl-4 italic">{item.reasoning}</p>
                          </div>
                        </div>

                        {/* Deep Analysis Data Grid (If cached) */}
                        {cached ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                              <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resume Descriptors</h6>
                              <ul className="space-y-1">
                                {cached.resumePoints?.slice(0, 2).map((pt: string, idx: number) => (
                                  <li key={idx} className="text-xs text-slate-300 flex gap-2"><span className="text-indigo-500">•</span> {pt}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                              <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Forgotten Gems</h6>
                              <ul className="space-y-1">
                                {cached.forgottenIdeas?.slice(0, 2).map((pt: string, idx: number) => (
                                  <li key={idx} className="text-xs text-slate-300 flex gap-2"><span className="text-amber-500">•</span> {pt}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                              <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Technical Debt</h6>
                              <p className="text-xs text-slate-300 leading-relaxed">{cached.reorgAdvice || "No specific reorg advice."}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-center pt-2">
                            <button
                              onClick={() => foundRepo && handleAnalyze(foundRepo)}
                              className="text-xs text-indigo-400 font-bold hover:text-indigo-300 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                              Run Deep Analysis to populate details
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cross-Pollination & Synergies */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-indigo-500/5 border border-indigo-500/10 p-10 rounded-[3rem] relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full"></div>
                  <h4 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Cross-Pollination Opportunities
                  </h4>
                  <div className="space-y-6">
                    {(inventoryAnalysis.crossPollination || []).map((cp: any, i: number) => (
                      <div key={i} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-indigo-400 font-bold text-sm bg-indigo-400/10 px-3 py-1 rounded-lg">{cp.sourceRepo}</span>
                          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          <span className="text-slate-400 text-xs font-medium">Multiple Targets</span>
                        </div>
                        <p className="text-slate-200 text-sm font-bold mb-1">Feature: {cp.feature}</p>
                        <p className="text-slate-400 text-xs leading-relaxed">{cp.benefit}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-emerald-500/5 border border-emerald-500/10 p-10 rounded-[3rem]">
                  <h4 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                    Innovation Lab: New Bridges
                  </h4>
                  <div className="space-y-6">
                    {(inventoryAnalysis.innovationLab || []).map((lab: any, i: number) => (
                      <div key={i} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 relative">
                        <div className="flex gap-2 mb-3">
                          {lab.baseRepos.map((br: string, bidx: number) => (
                            <span key={bidx} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">{br}</span>
                          ))}
                        </div>
                        <h5 className="text-emerald-400 font-black text-lg mb-2">{lab.idea}</h5>
                        <p className="text-slate-300 text-sm leading-relaxed"><span className="text-slate-500 italic">Missing Link:</span> {lab.missingLink}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Consolidation & Cleanup */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <section className="bg-amber-500/5 border border-amber-500/10 p-10 rounded-[3rem] lg:col-span-2">
                  <h4 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                    Consolidation Roadmap
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(inventoryAnalysis.consolidationLog || []).map((log: any, i: number) => (
                      <div key={i} className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {log.reposToMerge.map((rm: string, midx: number) => (
                            <span key={midx} className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">{rm}</span>
                          ))}
                        </div>
                        <h5 className="text-white font-bold mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                          {log.proposedNewName}
                        </h5>
                        <p className="text-slate-400 text-sm leading-relaxed">{log.rationale}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-900/80 border border-slate-800 p-10 rounded-[3rem]">
                  <h4 className="text-xl font-bold text-white mb-8 flex items-center gap-3 text-slate-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Maintenance Audit
                  </h4>
                  <ul className="space-y-4">
                    {(inventoryAnalysis.maintenanceAudit || []).map((audit: string, i: number) => (
                      <li key={i} className="flex gap-4 text-slate-400 text-sm">
                        <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</div>
                        {audit}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <div className="pt-20 flex justify-center">
                <button
                  onClick={() => setView(View.DASHBOARD)}
                  className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-3xl font-black transition-all shadow-2xl shadow-indigo-600/30 hover:scale-105 flex items-center gap-4"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Exit Master Blueprint
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Modal-like Overlay for Analysis Results */}
        {selectedRepo && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <FocusTrap focusTrapOptions={{ initialFocus: () => closeButtonRef.current!, allowOutsideClick: true }}>
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="bg-[#0f172a] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl border border-slate-800 shadow-2xl"
              >
                <div className="bg-[#0f172a] border-b border-slate-800 p-6 flex justify-between items-center shrink-0">
                  <div>
                    <h3 id="modal-title" className="text-2xl font-bold text-white">{selectedRepo.name}</h3>
                    <p className="text-slate-400 text-sm">AI Analysis Report</p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    onClick={() => setSelectedRepo(null)}
                    aria-label="Close analysis modal"
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Tab Switcher */}
                {analysis.status === 'success' && (
                  <div role="tablist" className="bg-slate-900/50 flex px-6 border-b border-slate-800 shrink-0">
                    <button
                      id="insights-tab"
                      role="tab"
                      aria-selected={modalTab === 'insights'}
                      aria-controls="insights-panel"
                      onClick={() => setModalTab('insights')}
                      className={`px-6 py-3 text-sm font-semibold transition-all border-b-2 ${modalTab === 'insights' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                    >
                      AI Insights
                    </button>
                    <button
                      id="readme-tab"
                      role="tab"
                      aria-selected={modalTab === 'readme'}
                      aria-controls="readme-panel"
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
                      <LoadingSpinner size="lg" label={analysis.status === 'fetching_readme' ? 'Reading source files...' : 'Gemini is scanning project DNA...'} />
                      <p className="text-lg text-white font-medium mt-6">
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
                    <div
                      id="insights-panel"
                      role="tabpanel"
                      aria-labelledby="insights-tab"
                      className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >

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
                            &quot;{analysis.projectPulse}&quot;
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

                      {/* Detailed Description Section (Only for Detailed level) */}
                      {analysis.level === 'detailed' && analysis.detailedDescription && (
                        <section className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-white">Full Architectural Analysis</h4>
                              <p className="text-xs text-indigo-400 font-mono">CODEBASE DEEP DIVE COMPLETE</p>
                            </div>
                          </div>
                          <div className="bg-[#020617] p-8 rounded-3xl border border-slate-800 text-slate-300 leading-relaxed text-sm whitespace-pre-wrap shadow-inner">
                            {analysis.detailedDescription}
                          </div>
                        </section>
                      )}

                      {analysis.level === 'superficial' && (
                        <div className="pt-6 border-t border-slate-800 text-center">
                          <p className="text-xs text-slate-500 mb-4 italic">You are viewing a superficial analysis based on README content.</p>
                          <button
                            onClick={() => handleAnalyze(selectedRepo, 'detailed')}
                            className="px-6 py-2 bg-indigo-600/10 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 rounded-xl text-sm font-bold transition-all"
                          >
                            Perform Deep Codebase Analysis
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {analysis.status === 'success' && modalTab === 'readme' && (
                    <div
                      id="readme-panel"
                      role="tabpanel"
                      aria-labelledby="readme-tab"
                      className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col"
                    >
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
            </FocusTrap>
          </div>
        )}
      </main>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <FocusTrap focusTrapOptions={{ allowOutsideClick: true }}>
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#020617] p-6 flex flex-col gap-8 shadow-2xl animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-white">RepoNexus</h1>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white"
                  aria-label="Close menu"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex flex-col gap-2">
                <NavItem
                  active={view === View.DASHBOARD}
                  label="Dashboard"
                  onClick={() => { setView(View.DASHBOARD); setMobileMenuOpen(false); }}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                />
                <NavItem
                  active={view === View.SETTINGS}
                  label="Settings"
                  onClick={() => { setView(View.SETTINGS); setMobileMenuOpen(false); }}
                  icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                />
              </nav>

              <div className="mt-auto p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2">Connected as</p>
                <p className="text-sm font-semibold text-white truncate">{username || 'Not configured'}</p>
              </div>
            </aside>
          </FocusTrap>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={!!repoToDelete}
        title="Delete Repository"
        message={`Are you sure you want to permanently delete "${repoToDelete?.name}"? This action is irreversible and will remove the project from GitHub and your local analysis cache.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Repository"
        onConfirm={confirmDeleteRepo}
        onCancel={() => setRepoToDelete(null)}
        isDestructive={true}
        isLoading={deletingRepoId !== null}
      />

      {/* Sync Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-600/40 animate-pulse">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Architecting Your Nexus</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              We are performing a superficial analysis of all your repositories to build your initial project identity profile.
            </p>

            <div className="bg-slate-800 h-2 w-full rounded-full overflow-hidden mb-4">
              <div
                className="bg-indigo-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <span className="text-indigo-400">Syncing {syncProgress.currentName}</span>
              <span className="text-slate-500">{syncProgress.current} / {syncProgress.total}</span>
            </div>

            <div className="mt-12">
              <LoadingSpinner size="sm" label="Synchronization in progress" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
