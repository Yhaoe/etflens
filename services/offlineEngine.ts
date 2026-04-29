/**
 * ETFLens — Offline AI Engine (Rule-Based Expert System)
 * Generates a comprehensive portfolio analysis based on the "Quantitative Matrix" backbone.
 * Uses deterministic rules instead of an LLM to guarantee offline functionality and zero API cost.
 */

import { CURATED_ETFS, ER_CONFIG, CategoryID } from '@/constants/CuratedETFs';

export interface OfflineReport {
  score: number;
  engineUsed: string;
  flags: {
    green: string[];
    red: string[];
    tax: string[];
  };
  strategy: {
    whatToBuy: string[];
    whenToTrade: string[];
    howToExecute: string[];
  };
}

// ─── Rule Engine ──────────────────────────────────────────────────────────────

export function generateOfflineReport(
  watchlist: string[],
  portfolioValue: number,
  profile: Record<string, string>,
  viewMode: 'beginner' | 'advanced' = 'advanced'
): OfflineReport {
  let score = 85; // Base score
  const greenFlags: string[] = [];
  const redFlags: string[] = [];
  const taxFlags: string[] = [];
  
  const whatToBuy: string[] = [];
  const whenToTrade: string[] = [
    "Monitor RSI (Relative Strength Index): Historically, entering when RSI < 30 (oversold) provides a statistical edge.",
    "Watch for Bollinger Band constriction, which often precedes explosive price breakouts.",
    "Look for Moving Average 'Golden Cross' scenarios to confirm long-term macro trend shifts before heavy allocation."
  ];
  const howToExecute: string[] = [
    "Always use Limit Orders instead of Market Orders to avoid slippage across the bid-ask spread.",
    "Implement threshold-based rebalancing (e.g., ±5% drift) rather than arbitrary calendar dates.",
    "Utilize strict Dollar-Cost Averaging (DCA) to mathematically average out your cost basis and remove emotion."
  ];

  // 1. Analyze Watchlist & Portfolio
  if (watchlist.length === 0) {
    score -= 20;
    redFlags.push("Your watchlist is empty. Add core ETFs to begin analysis.");
  } else {
    // Check for high expense ratios (Category-Relative)
    const expensive = watchlist.filter(t => {
      const etf = CURATED_ETFS.find(e => e.ticker === t);
      if (!etf) return false;
      const config = ER_CONFIG[etf.category];
      return etf.expenseRatio > config.mod;
    });
    
    if (expensive.length > 0) {
      score -= expensive.length * 2;
      redFlags.push(viewMode === 'advanced' 
        ? `High Expense Ratio Warning: ${expensive.join(', ')} are considered "Pricey" for their specific categories based on ER_CONFIG thresholds.`
        : `Peringatan Biaya: Beberapa ETF kamu (${expensive.join(', ')}) memiliki biaya pengelolaan di atas rata-rata kategori mereka.`
      );
    } else {
      greenFlags.push(viewMode === 'advanced'
        ? "Excellent cost control: Your tracked ETFs are within or below the fair price range for their respective categories."
        : "Efisiensi Biaya Bagus: ETF pilihanmu memiliki biaya yang sangat kompetitif."
      );
    }

    // Check for Sharpe Ratio efficiency
    const lowSharpe = watchlist.filter(t => {
      const etf = CURATED_ETFS.find(e => e.ticker === t);
      return etf && etf.sharpeRatio < 0.5 && etf.inceptionYear <= 2021;
    });
    if (lowSharpe.length > 0) {
      score -= 10;
      redFlags.push(viewMode === 'advanced'
        ? `Poor Risk-Adjusted Return: ${lowSharpe.join(', ')} have Sharpe < 0.5. You are taking high volatility for inadequate returns.`
        : `Risiko Tidak Sebanding: ${lowSharpe.join(', ')} memiliki tingkat risiko yang tinggi namun hasilnya belum maksimal.`
      );
    }

    // Check for TD Bonus
    const tdBonus = watchlist.filter(t => {
      const etf = CURATED_ETFS.find(e => e.ticker === t);
      return etf && etf.trackingDifference <= 0;
    });
    if (tdBonus.length > 0) {
      score += 5;
      greenFlags.push(viewMode === 'advanced'
        ? `Efficiency Alpha (TD Bonus): ${tdBonus.join(', ')} are outperforming their benchmarks due to negative tracking difference.`
        : `Bonus Efisiensi: ${tdBonus.join(', ')} bekerja sangat efisien dan memberikan hasil maksimal dibanding index-nya.`
      );
    }

    // Check for AUM & Liquidity Risks
    const lowAum = watchlist.filter(t => {
      const etf = CURATED_ETFS.find(e => e.ticker === t);
      return etf && etf.aum < 0.1;
    });
    if (lowAum.length > 0) {
      score -= 10;
      redFlags.push(`Closure Risk detected: ${lowAum.join(', ')} have AUM < $100M. Fund managers may liquidate these ETFs if they remain unprofitable.`);
    }

    const illiquid = watchlist.filter(t => {
      const etf = CURATED_ETFS.find(e => e.ticker === t);
      return etf && etf.avgDailyVolume < 10;
    });
    if (illiquid.length > 0) {
      redFlags.push(`Liquidity Warning: ${illiquid.join(', ')} have low daily volume (< $10M). Watch out for wide bid-ask spreads during trading.`);
    }

    // Check diversification
    if (watchlist.includes('VOO') || watchlist.includes('VTI') || watchlist.includes('SPY') || watchlist.includes('IVV')) {
      greenFlags.push("Strong Core Foundation: You hold a premier broad-market US index, providing stable foundational market beta.");
    } else {
      score -= 10;
      redFlags.push("Missing Core Beta: Consider adding a broad market index (like VOO or VTI) to act as the absolute majority of your portfolio.");
    }
    
    // Check for Sector Concentration Risk
    const techHeavy = ['QQQ', 'VGT', 'SOXX', 'SMH'].filter(t => watchlist.includes(t));
    if (techHeavy.length > 1) {
      score -= 5;
      redFlags.push(`Sector Concentration Risk: High overlap detected between ${techHeavy.join(' and ')}. A cyclical tech downturn could severely impact wealth.`);
    }

    // Check for Tax Leakage (US Domicile vs UCITS)
    const usDomiciled = watchlist.filter(t => {
      const etf = CURATED_ETFS.find(e => e.ticker === t);
      return etf && etf.domicile === 'US' && etf.yield > 1.0;
    });
    
    if (usDomiciled.length > 0) {
      score -= 5;
      redFlags.push(viewMode === 'advanced'
        ? `Tax Leakage Detected: ${usDomiciled.join(', ')} are US-domiciled. You are likely losing 30% of dividends to US Withholding Tax. Consider UCITS (Ireland) alternatives.`
        : `Kebocoran Pajak: Beberapa ETF kamu (${usDomiciled.join(', ')}) terkena pajak dividen AS yang tinggi (30%).`
      );
    }
  }

  // 2. Tax Optimization (Based on Location / Profile)
  // Assuming non-US investor logic by default to protect international users (e.g., Indonesia)
  taxFlags.push(
    "ESTATE TAX WARNING: US-domiciled ETFs (like VOO or SPY) expose foreign investors to a massive 40% US Estate (Inheritance) Tax."
  );
  taxFlags.push(
    "DIVIDEND WITHHOLDING: US-domiciled assets trigger a 30% withholding tax (or 15% with a tax treaty like Indonesia)."
  );
  taxFlags.push(
    "SOLUTION: Prioritize Irish-Domiciled UCITS (like CSPX or VUAA). They are 100% exempt from the US Estate Tax and benefit from a permanent 15% dividend tax treaty."
  );

  // 3. Shariah / Halal Profiling
  whatToBuy.push("For Core Holdings: Differentiate between Physical replication (holding actual assets) and Synthetic replication (using swaps which introduce counterparty risk).");
  
  if (profile.strategy === 'halal' || watchlist.includes('HLAL') || watchlist.includes('SPUS')) {
    whatToBuy.push(viewMode === 'advanced'
      ? "HALAL STRATEGY (SPUS vs HLAL): SPUS filters for low-leverage (<30% debt-to-market-cap) providing resilience. HLAL tracks FTSE USA Shariah for broader cap exposure."
      : "STRATEGI HALAL: Fokus pada SPUS atau HLAL yang sudah terbukti lolos filter syariah internasional."
    );
  } else {
    whatToBuy.push(viewMode === 'advanced'
      ? "DIVIDEND CASH FLOW: If prioritizing income, target SCHD (Quality) or VYM (Yield), balancing fundamental health vs trailing yields."
      : "DIVIDEND: Pilih SCHD atau VYM untuk mendapatkan uang kas (dividen) secara rutin dengan aman."
    );
  }

  // Tax Optimization Tip
  const hasTaxLeak = watchlist.some(t => {
    const etf = CURATED_ETFS.find(e => e.ticker === t);
    return etf && etf.domicile === 'US' && (etf.category === 'topus' || etf.category === 'dividend');
  });
  
  if (hasTaxLeak) {
    whatToBuy.push(viewMode === 'advanced'
      ? "TAX SHIELD: Switch US-domiciled funds (like VOO/IVV) to Irish UCITS (like CSPX/VUSA) to instantly reduce dividend tax from 30% to 15%."
      : "OPTIMASI PAJAK: Pertimbangkan pindah ke ETF berdomisili Irlandia (UCITS) untuk menghemat pajak dividen secara signifikan."
    );
  }

  // Cap score
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    score,
    engineUsed: "Antigravity Offline Expert System",
    flags: {
      green: greenFlags.length ? greenFlags : ["No major structural advantages detected yet."],
      red: redFlags.length ? redFlags : ["No critical vulnerabilities detected in your current setup."],
      tax: taxFlags
    },
    strategy: {
      whatToBuy,
      whenToTrade,
      howToExecute
    }
  };
}
