import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES_METADATA } from '@/constants/CuratedETFs';

/**
 * URL to the RAW categories.json file in the GitHub repository.
 * The user will need to update this URL to their actual GitHub repo URL once published.
 */
const CLOUD_JSON_URL = 'https://raw.githubusercontent.com/YourUsername/YourRepo/main/categories.json';

const CACHE_KEY = '@etflens_cloud_categories';
const CACHE_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function fetchLiveCategories() {
  try {
    // 1. Check local cache to ensure fast startup
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      const now = Date.now();
      // If cache is fresh, use it immediately but trigger a background sync
      if (now - cached.timestamp < CACHE_EXPIRY_MS) {
        syncInBackground();
        return cached.data;
      }
    }

    // 2. Fetch fresh data from Cloud CDN
    const response = await fetch(CLOUD_JSON_URL);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const liveData = await response.json();
    
    // Save to cache
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: liveData
    }));
    
    return liveData;
  } catch (error) {
    console.log("Cloud Sync Failed, falling back to static/stale data:", error);
    // 3. Fallback to stale cache if available
    const staleRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (staleRaw) {
      return JSON.parse(staleRaw).data;
    }
    // 4. Absolute fallback to hardcoded metadata
    return CATEGORIES_METADATA;
  }
}

/** Silent background sync to keep data fresh for next open */
async function syncInBackground() {
  try {
    const response = await fetch(CLOUD_JSON_URL);
    if (response.ok) {
      const liveData = await response.json();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: liveData
      }));
    }
  } catch (e) {
    // Silent fail
  }
}
