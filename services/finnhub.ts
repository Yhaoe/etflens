/**
 * ETFLens — Finnhub API Service
 * Handles all live market data fetching with built-in caching to prevent rate limits.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache to avoid 60 calls/min limit

// Types
export interface Quote {
  c: number;   // Current price
  d: number;   // Change
  dp: number;  // Percent change
  pc: number;  // Previous close
}

export interface NewsArticle {
  id: number;
  headline: string;
  source: string;
  datetime: number; // Unix timestamp
  url: string;
  image: string;
  summary: string;
  related: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getApiKey(): Promise<string> {
  const raw = await AsyncStorage.getItem('@etflens_vault_meta');
  if (raw) {
    const vault = JSON.parse(raw);
    const finnhubEntry = vault.find((v:any) => v.provider === 'FINNHUB');
    if (finnhubEntry) {
      const key = await SecureStore.getItemAsync(`etflens_vault_${finnhubEntry.id}`);
      if (key) return key;
    }
  }
  return 'demo'; // Default to demo if not set
}

/**
 * Wrapper for API calls that checks local AsyncStorage cache first
 */
async function fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T | null> {
  try {
    // 1. Check Cache
    const cachedRaw = await AsyncStorage.getItem(`@finnhub_cache_${cacheKey}`);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const now = Date.now();
      if (now - cached.timestamp < CACHE_EXPIRY_MS) {
        return cached.data as T;
      }
    }

    // 2. Fetch Live
    const apiKey = await getApiKey();
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${FINNHUB_BASE}${endpoint}${separator}token=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 429) {
        console.warn('Finnhub Rate Limit Exceeded. Using stale cache if available.');
        return cachedRaw ? JSON.parse(cachedRaw).data : null;
      }
      throw new Error(`Finnhub error: ${res.status}`);
    }

    const data = await res.json();

    // 3. Save to Cache
    await AsyncStorage.setItem(
      `@finnhub_cache_${cacheKey}`,
      JSON.stringify({ timestamp: Date.now(), data })
    );

    return data as T;
  } catch (error) {
    console.error(`Fetch failed for ${endpoint}:`, error);
    // Fallback to stale cache if network fails
    const staleRaw = await AsyncStorage.getItem(`@finnhub_cache_${cacheKey}`);
    return staleRaw ? JSON.parse(staleRaw).data : null;
  }
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Get live quote for a specific ETF ticker
 */
export async function getQuote(ticker: string): Promise<Quote | null> {
  return fetchWithCache<Quote>(`/quote?symbol=${ticker}`, `quote_${ticker}`);
}

/**
 * Get batch quotes (Finnhub free tier doesn't have a batch endpoint,
 * so we must fetch individually. We respect caching heavily here).
 */
export async function getQuotes(tickers: string[]): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  // Process sequentially to avoid hammering the API if cache is empty
  for (const ticker of tickers) {
    const q = await getQuote(ticker);
    if (q) results[ticker] = q;
  }
  return results;
}

/**
 * Get general market news
 */
export async function getMarketNews(): Promise<NewsArticle[]> {
  const news = await fetchWithCache<NewsArticle[]>('/news?category=general', 'news_general');
  return news || [];
}

/**
 * Clear all finnhub cache (useful for pull-to-refresh)
 */
export async function clearCache() {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith('@finnhub_cache_'));
  await AsyncStorage.multiRemove(cacheKeys);
}
