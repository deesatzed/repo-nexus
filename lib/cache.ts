import { AnalysisResult } from '../types';

/**
 * Current cache schema version.
 * Increment this when making breaking changes to the cache structure.
 */
const CACHE_SCHEMA_VERSION = 1;

/**
 * Key prefix for cached analysis in localStorage
 */
const CACHE_KEY_PREFIX = 'repoAnalysis_';

/**
 * Key for cache schema version in localStorage
 */
const CACHE_VERSION_KEY = 'cacheSchemaVersion';

/**
 * Cached analysis structure with versioning
 */
export interface CachedAnalysis {
  schemaVersion: 1;
  cachedAt: number; // Unix timestamp in milliseconds
  repo: {
    id: number;
    name: string;
    language: string | null;
    description: string | null;
  };
  analysis: AnalysisResult;
}

/**
 * Get cached analysis for a repository
 * @param repoId - The GitHub repository ID
 * @returns The cached analysis or null if not found or invalid
 */
export function getCachedAnalysis(repoId: number): CachedAnalysis | null {
  try {
    const key = `${CACHE_KEY_PREFIX}${repoId}`;
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as CachedAnalysis;

    // Validate schema version
    if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION) {
      console.warn(`Cache schema mismatch for repo ${repoId}. Expected ${CACHE_SCHEMA_VERSION}, got ${parsed.schemaVersion}. Clearing cache.`);
      localStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(`Error reading cache for repo ${repoId}:`, error);
    return null;
  }
}

/**
 * Set cached analysis for a repository
 * @param repoId - The GitHub repository ID
 * @param repo - Repository metadata
 * @param analysis - Analysis result
 */
export function setCachedAnalysis(
  repoId: number,
  repo: {
    id: number;
    name: string;
    language: string | null;
    description: string | null;
  },
  analysis: AnalysisResult
): void {
  try {
    const cached: CachedAnalysis = {
      schemaVersion: CACHE_SCHEMA_VERSION,
      cachedAt: Date.now(),
      repo,
      analysis
    };

    const key = `${CACHE_KEY_PREFIX}${repoId}`;
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error(`Error writing cache for repo ${repoId}:`, error);
  }
}

/**
 * Clear cached analysis for a repository or all repositories
 * @param repoId - Optional repository ID. If not provided, clears all cached analyses.
 */
export function clearCache(repoId?: number): void {
  try {
    if (repoId !== undefined) {
      // Clear specific repository cache
      const key = `${CACHE_KEY_PREFIX}${repoId}`;
      localStorage.removeItem(key);
    } else {
      // Clear all cached analyses
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Migrate cache if schema version has changed
 * Should be called on app initialization
 */
export function migrateCacheIfNeeded(): void {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const storedVersionNumber = storedVersion ? parseInt(storedVersion, 10) : 0;

    if (storedVersionNumber === CACHE_SCHEMA_VERSION) {
      // No migration needed
      return;
    }

    console.log(`Cache migration: ${storedVersionNumber} -> ${CACHE_SCHEMA_VERSION}`);

    if (storedVersionNumber < CACHE_SCHEMA_VERSION) {
      // Migration logic for future schema changes
      // For now, just clear all caches on version mismatch
      console.warn('Cache schema version mismatch. Clearing all cached analyses.');
      clearCache();
    }

    // Update stored version
    localStorage.setItem(CACHE_VERSION_KEY, CACHE_SCHEMA_VERSION.toString());
  } catch (error) {
    console.error('Error during cache migration:', error);
  }
}

/**
 * Get cache age in milliseconds
 * @param cachedAt - Timestamp when the analysis was cached
 * @returns Age in milliseconds
 */
export function getCacheAge(cachedAt: number): number {
  return Date.now() - cachedAt;
}

/**
 * Format cache age as human-readable string
 * @param cachedAt - Timestamp when the analysis was cached
 * @returns Formatted age string (e.g., "2 hours ago", "3 days ago")
 */
export function formatCacheAge(cachedAt: number): string {
  const ageMs = getCacheAge(cachedAt);
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageMinutes = Math.floor(ageSeconds / 60);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  if (ageDays > 0) {
    return `${ageDays} day${ageDays !== 1 ? 's' : ''} ago`;
  }
  if (ageHours > 0) {
    return `${ageHours} hour${ageHours !== 1 ? 's' : ''} ago`;
  }
  if (ageMinutes > 0) {
    return `${ageMinutes} minute${ageMinutes !== 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
