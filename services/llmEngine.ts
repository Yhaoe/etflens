/**
 * ETFLens — LLM Engine
 * Connects to user-provided API keys (Gemini, Claude, Grok) to generate
 * personalized portfolio analysis based on their specific watchlist and profile.
 */

import { OfflineReport } from './offlineEngine';
import { CURATED_ETFS } from '@/constants/CuratedETFs';

// Define the API Keys object structure
export interface APIKeys {
  gemini: string | null;
  claude: string | null;
  grok: string | null;
}

/**
 * Main function to call the best available LLM based on user's keys.
 */
export async function generateLLMReport(
  keys: APIKeys,
  watchlist: string[],
  profile: Record<string, string>
): Promise<OfflineReport> {
  // 1. Build the deep context prompt
  const systemPrompt = `You are a world-class Quantitative Financial Advisor and Portfolio Architect.
You must analyze the user's ETF portfolio and provide a highly structured, objective report.
You must return ONLY a raw JSON object matching this exact structure, no markdown formatting, no backticks:
{
  "score": number (0-100),
  "flags": { "green": [string], "red": [string], "tax": [string] },
  "strategy": { "whatToBuy": [string], "whenToTrade": [string], "howToExecute": [string] }
}`;

  const etfDetails = watchlist.map(t => {
    const found = CURATED_ETFS.find(e => e.ticker === t);
    return found ? `${t} (${found.name}, ER: ${found.expenseRatio}%, TD: ${found.trackingDifference}%, Sharpe: ${found.sharpeRatio}, AUM: $${found.aum}B)` : t;
  }).join(', ');

  const userPrompt = `
User Profile: Goal=${profile.goal || 'Growth'}, Strategy=${profile.strategy || 'Standard'}, Experience=${profile.experience || 'Beginner'}.
User Watchlist (Currently Held): [${etfDetails}].

Based on this specific portfolio, generate the analysis. Include real overlap warnings if they hold similar ETFs (e.g., VOO and QQQ). Recommend tax optimizations if applicable. Provide algorithmic strategy tips.
`;

  // 2. Route to the available API
  try {
    if (keys.gemini) {
      return await fetchGemini(keys.gemini, systemPrompt, userPrompt);
    } else if (keys.grok) {
      return await fetchGrok(keys.grok, systemPrompt, userPrompt);
    } else if (keys.claude) {
      return await fetchClaude(keys.claude, systemPrompt, userPrompt);
    }
  } catch (error) {
    console.error("LLM API Error:", error);
    throw new Error("Failed to generate AI report. Please check your API keys or internet connection.");
  }

  throw new Error("No valid API keys found.");
}

// ─── Gemini Integration ────────────────────────────────────────────────────────
async function fetchGemini(apiKey: string, systemPrompt: string, userPrompt: string): Promise<OfflineReport> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
      ],
      generationConfig: {
        temperature: 0.2, // Low temperature for analytical consistency
        response_mime_type: "application/json" // Force JSON output
      }
    })
  });

  if (!response.ok) throw new Error(`Gemini HTTP Error: ${response.status}`);
  
  const data = await response.json();
  const rawText = data.candidates[0].content.parts[0].text;
  const parsed = JSON.parse(rawText);
  parsed.engineUsed = "Google Gemini 1.5";
  return parsed;
}

// ─── Grok Integration ──────────────────────────────────────────────────────────
async function fetchGrok(apiKey: string, systemPrompt: string, userPrompt: string): Promise<OfflineReport> {
  const url = 'https://api.x.ai/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "grok-beta",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) throw new Error(`Grok HTTP Error: ${response.status}`);
  
  const data = await response.json();
  const rawText = data.choices[0].message.content;
  // Clean potential markdown from Grok
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  parsed.engineUsed = "xAI Grok Beta";
  return parsed;
}

// ─── Claude Integration ────────────────────────────────────────────────────────
async function fetchClaude(apiKey: string, systemPrompt: string, userPrompt: string): Promise<OfflineReport> {
  const url = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerously-allow-browser': 'true' // Required for client-side React Native
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 1024,
      temperature: 0.2
    })
  });

  if (!response.ok) throw new Error(`Claude HTTP Error: ${response.status}`);
  
  const data = await response.json();
  const rawText = data.content[0].text;
  const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleanJson);
  parsed.engineUsed = "Anthropic Claude 3";
  return parsed;
}
