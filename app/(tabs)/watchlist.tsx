/**
 * ETFLens — Watchlist Screen
 * Features:
 *  - Search ETF by ticker
 *  - Browse wide categorized ETF list
 *  - Add/remove from personal watchlist (saved to AsyncStorage)
 *  - Shows price + daily change per ETF
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Dimensions, RefreshControl,
  Modal, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, ThemeColors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';
import { getQuotes } from '@/services/finnhub';
import { CURATED_ETFS, CategoryID, CATEGORIES_METADATA, getERBadge, GLOSSARY } from '@/constants/CuratedETFs';

const { width: SW } = Dimensions.get('window');
const WATCHLIST_KEY = '@etflens_watchlist';

// ─── ETF Row ──────────────────────────────────────────────────────────────────
function ETFRow({ etf, inWatchlist, onToggle, liveData, C, isDark, showRationale, viewMode = 'advanced' }: {
  etf: typeof CURATED_ETFS[0];
  inWatchlist: boolean;
  onToggle: (ticker: string) => void;
  liveData?: { price: number, change: number };
  C: ThemeColors;
  isDark: boolean;
  showRationale?: boolean;
  viewMode?: 'beginner' | 'advanced';
  isSelectingForBattle?: boolean;
  isSelectedForBattle?: boolean;
  onToggleBattle?: (ticker: string) => void;
}) {
  const badge = getERBadge(etf.expenseRatio, etf.category);
  const currentPrice = liveData ? liveData.price : 0;
  const currentChange = liveData ? liveData.change : etf.return5Y;
  const isPos = currentChange >= 0;
  
  const aumRisk   = etf.aum < 0.1;
  const illiquid  = etf.avgDailyVolume < 10;
  const tdBonus   = etf.trackingDifference <= 0;
  const sharpeGoat = etf.sharpeRatio >= 1.2;
  const taxLeak   = etf.yield * (etf.domicile === 'US' ? 0.30 : (etf.domicile === 'IE' ? 0.15 : 0));
  const isLeaky   = etf.domicile === 'US' && etf.yield > 1.0;

  return (
    <View style={[row.wrap, { backgroundColor: C.surface, borderColor: inWatchlist ? C.green : C.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={row.left}>
          {isSelectingForBattle ? (
            <TouchableOpacity 
              onPress={() => onToggleBattle(etf.ticker)}
              style={[row.battleCheck, { borderColor: isSelectedForBattle ? C.gold : C.border, backgroundColor: isSelectedForBattle ? C.gold + '22' : 'transparent' }]}
            >
              {isSelectedForBattle && <Text style={{ color: C.gold }}>✓</Text>}
            </TouchableOpacity>
          ) : (
            <View style={[row.tickerBox, { backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Text style={[row.ticker, { color: C.textPrimary }]}>{etf.ticker}</Text>
              {isLeaky && <Text style={{ fontSize: 10 }}>💧</Text>}
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[row.name, { color: C.textPrimary }]} numberOfLines={1}>{etf.name}</Text>
              {viewMode === 'advanced' && (
                <View style={[row.pulseBadge, { backgroundColor: etf.rsi < 40 ? C.greenGlow : (etf.rsi > 65 ? C.redGlow : C.border) }]}>
                  <Text style={[row.pulseTxt, { color: etf.rsi < 40 ? C.green : (etf.rsi > 65 ? C.red : C.textMuted) }]}>
                    {etf.rsi < 40 ? '🔥 BUY' : (etf.rsi > 65 ? '⚠️ HOT' : 'SIDE')}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
              <View style={[row.badgeMini, { backgroundColor: badge.bg, borderColor: badge.color + '33' }]}>
                <Text style={[row.badgeMiniTxt, { color: badge.color }]}>{badge.label}</Text>
              </View>
              {viewMode === 'advanced' && (
                <>
                  {tdBonus && (
                    <View style={[row.badgeMini, { backgroundColor: 'rgba(0,230,118,0.1)', borderColor: C.green + '33' }]}>
                      <Text style={[row.badgeMiniTxt, { color: C.green }]}>★ TD BONUS</Text>
                    </View>
                  )}
                  {aumRisk && (
                    <View style={[row.badgeMini, { backgroundColor: 'rgba(255,61,87,0.1)', borderColor: C.red + '33' }]}>
                      <Text style={[row.badgeMiniTxt, { color: C.red }]}>⚠️ CLOSURE RISK</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
        
        <View style={row.right}>
          <Text style={[row.price, { color: C.textPrimary }]}>
            {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '...'}
          </Text>
          <Text style={[row.change, { color: isPos ? C.green : C.red }]}>
            {isPos ? '▲' : '▼'} {Math.abs(currentChange).toFixed(1)}%
          </Text>
        </View>

        <TouchableOpacity
          style={[row.addBtn, {
            backgroundColor: inWatchlist ? C.greenGlow : (isDark ? C.surfaceElevated : '#EEF2FF'),
            borderColor: inWatchlist ? C.green : C.border,
          }]}
          onPress={() => onToggle(etf.ticker)}
        >
          <Text style={[row.addTxt, { color: inWatchlist ? C.green : C.textSecondary }]}>
            {inWatchlist ? '✓' : '+'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showRationale && (
        <View style={[row.rationaleBox, { backgroundColor: isDark ? '#0A0A0A' : '#F8F9FB', borderColor: C.border }]}>
          {viewMode === 'advanced' ? (
            <View>
              <View style={row.metricsGrid}>
                <MetricItem label="SHARPE" value={etf.sharpeRatio.toFixed(2)} color={etf.sharpeRatio > 1 ? C.green : C.textPrimary} />
                <MetricItem label="TD %" value={(etf.trackingDifference > 0 ? '+' : '') + etf.trackingDifference.toFixed(2)} color={tdBonus ? C.green : C.textPrimary} />
                <MetricItem label="AUM" value={`$${etf.aum}B`} color={aumRisk ? C.red : C.textPrimary} />
                <MetricItem label="YIELD" value={`${etf.yield}%`} color={C.gold} />
                <MetricItem label="BETA" value={etf.beta.toFixed(2)} />
                <MetricItem label="ADV" value={`$${etf.avgDailyVolume}M`} color={illiquid ? C.red : C.textPrimary} />
                <MetricItem label="ER" value={`${etf.expenseRatio}%`} color={badge.color} />
                <MetricItem label="INC" value={etf.inceptionYear.toString()} />
              </View>

              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }}>
                <Text style={{ fontSize: 10, color: C.textMuted, fontFamily: Typography.fontFamily.bodySemiBold, marginBottom: 4 }}>TOTAL COST BREAKDOWN (ANNUAL)</Text>
                <View style={{ height: 6, width: '100%', backgroundColor: C.border, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', marginBottom: 6 }}>
                  <View style={{ width: `${(etf.expenseRatio / (etf.expenseRatio + taxLeak)) * 100}%`, backgroundColor: C.blue }} />
                  <View style={{ width: `${(taxLeak / (etf.expenseRatio + taxLeak)) * 100}%`, backgroundColor: '#FF8A65' }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 9, color: C.textSecondary }}>🔵 ER: {etf.expenseRatio}%</Text>
                  <Text style={{ fontSize: 9, color: C.textSecondary }}>🟠 Tax Leak: {taxLeak.toFixed(2)}%</Text>
                  <Text style={{ fontSize: 9, color: C.textPrimary, fontFamily: Typography.fontFamily.bodyBold }}>Total: {(etf.expenseRatio + taxLeak).toFixed(2)}%</Text>
                </View>
                {isLeaky && (
                  <View style={{ marginTop: 8, padding: 6, backgroundColor: 'rgba(255,138,101,0.05)', borderRadius: 4, borderLeftWidth: 2, borderLeftColor: '#FF8A65' }}>
                    <Text style={{ fontSize: 10, color: '#FF8A65', fontFamily: Typography.fontFamily.bodyMedium }}>
                      ⚠️ US-Domiciled: 30% of dividends leak to US taxes. Consider UCITS.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View>
              <Text style={[row.beginnerHint, { color: C.textSecondary }]}>
                {etf.name} adalah {CATEGORIES_METADATA.find(c => c.id === etf.category)?.label} ETF. 
                {etf.expenseRatio <= 0.1 ? " Biayanya sangat murah." : " Biayanya wajar untuk kategori ini."}
              </Text>
              <Text style={[row.beginnerHint, { color: C.textMuted, marginTop: 4, fontStyle: 'italic' }]}>
                Tip: Cocok untuk investasi jangka panjang.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function MetricItem({ label, value, color }: { label: string, value: string, color?: string }) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  return (
    <View style={row.metricItem}>
      <Text style={[row.metricLabel, { color: C.textMuted }]}>{label}</Text>
      <Text style={[row.metricValue, { color: color || C.textPrimary }]}>{value}</Text>
    </View>
  );
}

const row = StyleSheet.create({
  wrap:     { borderRadius:Radius.md, padding:Spacing.sm, marginBottom:8, borderWidth:1, flex: 1, minWidth: SW > 600 ? '48%' : '100%', marginHorizontal: SW > 600 ? 4 : 0 },
  left:     { flexDirection:'row', alignItems:'center', gap:Spacing.sm, flex:1 },
  tickerBox:{ paddingHorizontal:8, paddingVertical:4, borderRadius:Radius.sm },
  ticker:   { fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.sm },
  name:     { fontFamily:Typography.fontFamily.bodyMedium, fontSize:Typography.size.xs, maxWidth: SW * 0.38 },
  expense:  { fontFamily:Typography.fontFamily.body, fontSize:10 },
  right:    { alignItems:'flex-end', marginRight:Spacing.sm },
  price:    { fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.sm },
  change:   { fontFamily:Typography.fontFamily.bodySemiBold, fontSize:10 },
  addBtn:   { width:36, height:36, borderRadius:Radius.full, alignItems:'center', justifyContent:'center', borderWidth:1 },
  addTxt:   { fontFamily:Typography.fontFamily.heading, fontSize:18 },
  rationaleBox: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm, borderLeftWidth: 3 },
  rationaleTxt: { fontFamily: Typography.fontFamily.body, fontSize: 11, fontStyle: 'italic', lineHeight: 16 },
  badgeMini:   { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, marginRight: 2 },
  badgeMiniTxt:{ fontFamily: Typography.fontFamily.bodySemiBold, fontSize: 7, letterSpacing: 0.5 },
  metricLabel: { fontFamily: Typography.fontFamily.body, fontSize: 8, letterSpacing: 1, marginBottom: 1 },
  metricValue: { fontFamily: Typography.fontFamily.headingSemi, fontSize: 11 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  metricItem:  { width: '25%', alignItems: 'flex-start' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WatchlistScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const s = styles(C, isDark);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'beginner' | 'advanced'>('beginner');
  const [battleSelection, setBattleSelection] = useState<string[]>([]);
  const [isBattleMode, setIsBattleMode] = useState(false);
  const [showBattleModal, setShowBattleModal] = useState(false);
  
  // Custom Filters for the Pro list
  const [activeCategory, setActiveCategory] = useState<CategoryID | 'ALL'>('ALL');
  const [activeSubFilter, setActiveSubFilter] = useState('All');
  const [activeSort, setActiveSort] = useState('Total Return (%)');
  
  const [tab, setTab] = useState<'watchlist' | 'browse'>('watchlist');
  const [refreshing, setRefreshing] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number, change: number }>>({});

  const fetchLiveWatchlist = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    try {
      const quotes = await getQuotes(tickers);
      const parsed: Record<string, { price: number, change: number }> = {};
      for (const [t, q] of Object.entries(quotes)) {
        parsed[t] = { price: q.c, change: q.dp };
      }
      setLivePrices(parsed);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(WATCHLIST_KEY).then(v => {
      if (v) {
        const saved = JSON.parse(v);
        setWatchlist(saved);
        fetchLiveWatchlist(saved);
      }
    });
    AsyncStorage.getItem('@etflens_view_mode').then(v => {
      if (v === 'advanced') setViewMode('advanced');
    });
  }, [fetchLiveWatchlist]);

  const toggleViewMode = async () => {
    const next = viewMode === 'beginner' ? 'advanced' : 'beginner';
    setViewMode(next);
    await AsyncStorage.setItem('@etflens_view_mode', next);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === 'watchlist') {
      await fetchLiveWatchlist(watchlist);
    }
    setRefreshing(false);
  };

  const toggleWatchlist = async (ticker: string) => {
    const next = watchlist.includes(ticker)
      ? watchlist.filter(t => t !== ticker)
      : [...watchlist, ticker];
    setWatchlist(next);
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
  };

  // All curated ETFs
  const allEtfs = CURATED_ETFS;

  const searchResults = search.trim().length > 0
    ? allEtfs.filter(e =>
        e.ticker.toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const watchlistEtfs = allEtfs.filter(e => watchlist.includes(e.ticker));
  
  // Filter for Browse tab
  let filteredBrowse = allEtfs;
  if (activeCategory !== 'ALL') {
    filteredBrowse = filteredBrowse.filter(e => e.category === activeCategory);
  }
  
  // Sort by selected criteria
  filteredBrowse = [...filteredBrowse].sort((a, b) => {
    if (activeSort.includes('Expense Ratio')) return a.expenseRatio - b.expenseRatio;
    if (activeSort.includes('Sharpe')) return b.sharpeRatio - a.sharpeRatio;
    if (activeSort.includes('Dividend Yield')) return b.yield - a.yield;
    if (activeSort.includes('AUM')) return b.aum - a.aum;
    return b.return5Y - a.return5Y; // Default to Return
  });

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ───────────────────────────────── */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
          <Text style={[s.title, { marginBottom: 0 }]}>👁️ Watchlist</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => setIsBattleMode(!isBattleMode)}
              style={[s.battleBtn, { backgroundColor: isBattleMode ? C.gold : isDark ? C.surfaceElevated : '#EEF2FF' }]}
            >
              <Text style={{ fontSize: 16 }}>⚔️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={toggleViewMode}
              style={[s.modeToggle, { borderColor: viewMode === 'advanced' ? C.gold : C.blue }]}
            >
              <Text style={[s.modeToggleTxt, { color: viewMode === 'advanced' ? C.gold : C.blue }]}>
                {viewMode === 'advanced' ? '🚀 ADVANCED' : '🐣 BEGINNER'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.tabRow}>
          {(['watchlist', 'browse'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tabPill, tab === t && { backgroundColor: C.green }]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabTxt, { color: tab === t ? '#0A0E1A' : C.textSecondary }]}>
                {t === 'watchlist' ? `My List (${watchlist.length})` : 'Browse ETFs'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Search Bar ───────────────────────────── */}
      <View style={[s.searchRow, { backgroundColor: isDark ? C.surface : '#F4F6FA', borderColor: C.border }]}>
        <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
        <TextInput
          style={[s.searchInput, { color: C.textPrimary, fontFamily: Typography.fontFamily.body }]}
          placeholder="Search ticker or fund name..."
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={s.scroll} 
        contentContainerStyle={s.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >

        {/* ── Search Results ──────────────────────── */}
        {search.trim().length > 0 ? (
          <>
            <Text style={[s.sectionLabel, { color: C.textSecondary }]}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {searchResults.length === 0 ? (
                <Text style={[s.emptyTxt, { color: C.textMuted, width: '100%' }]}>No ETFs found. Try a different ticker.</Text>
              ) : (
                searchResults.map(e => <ETFRow key={e.ticker} etf={e} inWatchlist={watchlist.includes(e.ticker)}
                      onToggle={toggleWatchlist} liveData={livePrices[e.ticker]} C={C} isDark={isDark} viewMode={viewMode}
                      isSelectingForBattle={isBattleMode} isSelectedForBattle={battleSelection.includes(e.ticker)}
                      onToggleBattle={(t) => setBattleSelection(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].slice(-2))}
                />
                )
              )}
            </View>
          </>

        ) : tab === 'watchlist' ? (
          /* ── My Watchlist ──────────────────────── */
          <>
            {watchlistEtfs.length === 0 ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>📋</Text>
                <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Your watchlist is empty</Text>
                <Text style={[s.emptyTxt, { color: C.textSecondary }]}>
                  Switch to "Browse ETFs" and tap + to add your first ETF
                </Text>
                <TouchableOpacity style={[s.browseBtn, { backgroundColor: C.green }]}
                  onPress={() => setTab('browse')}>
                  <Text style={s.browseBtnTxt}>Browse ETFs →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {watchlistEtfs.map(e => (
                  <ETFRow key={e.ticker} etf={e} inWatchlist={true}
                    onToggle={toggleWatchlist} liveData={livePrices[e.ticker]} C={C} isDark={isDark} viewMode={viewMode}
                    isSelectingForBattle={isBattleMode} isSelectedForBattle={battleSelection.includes(e.ticker)}
                    onToggleBattle={(t) => setBattleSelection(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t].slice(-2))}
                  />
                ))}
              </View>
            )}
          </>

        ) : (
          /* ── Browse by Category ─────────────────── */
          <>
            <View style={{ marginBottom: Spacing.md }}>
              <Text style={[s.filterLabel, { color: C.textSecondary }]}>STRATEGY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                <TouchableOpacity
                  style={[s.catChip, activeCategory === 'ALL' && { backgroundColor: C.green }]}
                  onPress={() => { setActiveCategory('ALL'); setActiveSubFilter('All'); }}
                >
                  <Text style={[s.catChipTxt, { color: activeCategory === 'ALL' ? '#0A0E1A' : C.textSecondary }]}>
                    All Strategies
                  </Text>
                </TouchableOpacity>
                {CATEGORIES_METADATA.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.catChip, activeCategory === c.id && { backgroundColor: C.green }]}
                    onPress={() => { setActiveCategory(c.id); setActiveSubFilter(c.specificFilter.options[0]); }}
                  >
                    <Text style={[s.catChipTxt, { color: activeCategory === c.id ? '#0A0E1A' : C.textSecondary }]}>
                      {c.icon} {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {activeCategory !== 'ALL' && (
                <>
                  <Text style={[s.filterLabel, { color: C.textSecondary }]}>
                    {CATEGORIES_METADATA.find(c => c.id === activeCategory)?.specificFilter.label.toUpperCase()}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                    {CATEGORIES_METADATA.find(c => c.id === activeCategory)?.specificFilter.options.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[s.miniChip, activeSubFilter === opt && { borderColor: C.blue }]}
                        onPress={() => setActiveSubFilter(opt)}
                      >
                        <Text style={[s.miniChipTxt, { color: activeSubFilter === opt ? C.blue : C.textMuted }]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[s.filterLabel, { color: C.textSecondary }]}>SORT BY</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {CATEGORIES_METADATA.find(c => c.id === activeCategory)?.sortOptions.map(opt => (
                      <TouchableOpacity
                        key={opt}
                        style={[s.miniChip, activeSort === opt && { borderColor: C.gold }]}
                        onPress={() => setActiveSort(opt)}
                      >
                        <Text style={[s.miniChipTxt, { color: activeSort === opt ? C.gold : C.textMuted }]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>

            <View style={{ marginBottom: Spacing.md, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {filteredBrowse.map(e => (
                <ETFRow key={e.ticker} etf={e} inWatchlist={watchlist.includes(e.ticker)}
                  onToggle={toggleWatchlist} C={C} isDark={isDark} showRationale={true} viewMode={viewMode} />
              ))}
              {filteredBrowse.length === 0 && (
                <Text style={{ textAlign: 'center', color: C.textMuted, marginTop: 40, fontFamily: Typography.fontFamily.body, width: '100%' }}>
                  No ETFs match this specific filter combination.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (C: ThemeColors, isDark: boolean) => StyleSheet.create({
  safe:        { flex:1, backgroundColor:C.background },
  header:      { padding:Spacing.md, paddingBottom:Spacing.sm },
  title:       { fontFamily:Typography.fontFamily.heading, fontSize:Typography.size['2xl'], color:C.textPrimary, marginBottom:Spacing.sm },
  tabRow:      { flexDirection:'row', gap:Spacing.sm },
  tabPill:     { flex:1, paddingVertical:8, borderRadius:Radius.full, alignItems:'center',
                 backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF' },
  tabTxt:      { fontFamily:Typography.fontFamily.bodyMedium, fontSize:Typography.size.sm },
  searchRow:   { flexDirection:'row', alignItems:'center', margin:Spacing.md, marginTop:0,
                 borderRadius:Radius.lg, borderWidth:1, paddingHorizontal:Spacing.sm,
                 paddingVertical: Platform.OS === 'ios' ? 12 : 4 },
  searchInput: { flex:1, fontSize:Typography.size.sm },
  scroll:      { flex:1 },
  scrollContent:{ padding:Spacing.md, paddingTop:0, paddingBottom:Spacing['3xl'] },
  sectionLabel: { fontFamily:Typography.fontFamily.bodyMedium, fontSize:Typography.size.sm, color:C.textSecondary, marginBottom:Spacing.sm },
  catChip:     { paddingHorizontal:Spacing.md, paddingVertical:7, borderRadius:Radius.full,
                 marginRight:8, backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF', borderWidth: 1, borderColor: C.border },
  catChipTxt:  { fontFamily:Typography.fontFamily.bodyMedium, fontSize:Typography.size.xs },
  filterLabel: { fontFamily:Typography.fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 1.2, marginBottom: 8, marginTop: 8 },
  miniChip:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1, borderColor: C.border, marginRight: 4 },
  miniChipTxt: { fontFamily:Typography.fontFamily.bodySemiBold, fontSize: 10 },
  empty:       { alignItems:'center', justifyContent:'center', paddingTop:Spacing['3xl'], gap:Spacing.sm },
  emptyTitle:  { fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.xl },
  emptyTxt:    { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm, textAlign:'center' },
  browseBtn:   { marginTop:Spacing.sm, paddingVertical:12, paddingHorizontal:Spacing.xl, borderRadius:Radius.full },
  browseBtnTxt:{ fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.base, color:'#0A0E1A' },
  modeToggle: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm },
  modeToggleTxt: { fontFamily: Typography.fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 1 },
  beginnerHint: { fontFamily: Typography.fontFamily.body, fontSize: 12, lineHeight: 18 },
  pulseBadge: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 },
  pulseTxt: { fontSize: 7, fontFamily: Typography.fontFamily.bodyBold },
  battleCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  battleBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  battleFab: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: Colors.dark.gold, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, elevation: 10 },
  battleFabTxt: { color: '#000', fontFamily: Typography.fontFamily.headingSemi, fontSize: 14 },
});

// ─── Battle Modal Component ──────────────────────────────────────────────────
function BattleModal({ visible, onClose, tickers, C, isDark }: any) {
  const etfA = CURATED_ETFS.find(e => e.ticker === tickers[0]);
  const etfB = CURATED_ETFS.find(e => e.ticker === tickers[1]);
  if (!etfA || !etfB) return null;

  const compare = (key: keyof typeof etfA, lowerIsBetter = false) => {
    const valA = etfA[key] as number;
    const valB = etfB[key] as number;
    if (valA === valB) return null;
    return lowerIsBetter ? (valA < valB ? 'A' : 'B') : (valA > valB ? 'A' : 'B');
  };

  const winER = compare('expenseRatio', true);
  const winSharpe = compare('sharpeRatio');
  const winAUM = compare('aum');
  const winTD = compare('trackingDifference', true);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
        <View style={{ height: '85%', backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontFamily: Typography.fontFamily.heading, color: C.textPrimary }}>Oracle Battle ⚔️</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: C.textMuted, fontSize: 32 }}>×</Text></TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 30 }}>
             <BattleCard etf={etfA} C={C} isDark={isDark} />
             <View style={{ justifyContent: 'center' }}><Text style={{ color: C.gold, fontWeight: 'bold' }}>VS</Text></View>
             <BattleCard etf={etfB} C={C} isDark={isDark} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <BattleRow label="Expense Ratio" valA={`${etfA.expenseRatio}%`} valB={`${etfB.expenseRatio}%`} winner={winER} C={C} />
            <BattleRow label="Sharpe Ratio" valA={etfA.sharpeRatio.toFixed(2)} valB={etfB.sharpeRatio.toFixed(2)} winner={winSharpe} C={C} />
            <BattleRow label="Fund Size (AUM)" valA={`$${etfA.aum}B`} valB={`$${etfB.aum}B`} winner={winAUM} C={C} />
            <BattleRow label="Tracking Diff" valA={`${etfA.trackingDifference}%`} valB={`${etfB.trackingDifference}%`} winner={winTD} C={C} />
            <BattleRow label="Market Pulse (RSI)" valA={etfA.rsi.toString()} valB={etfB.rsi.toString()} winner={etfA.rsi < etfB.rsi ? 'A' : 'B'} C={C} />
            
            <View style={{ marginTop: 20, padding: 15, backgroundColor: C.gold + '11', borderRadius: 12, borderWidth: 1, borderColor: C.gold + '44' }}>
              <Text style={{ color: C.gold, fontFamily: Typography.fontFamily.bodySemiBold, textAlign: 'center' }}>
                👑 ORACLE VERDICT: {winSharpe === 'A' ? etfA.ticker : etfB.ticker} is technically superior for risk-adjusted returns.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BattleCard({ etf, C, isDark }: any) {
  return (
    <View style={{ flex: 1, padding: 15, borderRadius: 12, backgroundColor: isDark ? '#111827' : '#F3F4F6', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: C.textPrimary }}>{etf.ticker}</Text>
      <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center' }} numberOfLines={1}>{etf.name}</Text>
    </View>
  );
}

function BattleRow({ label, valA, valB, winner, C }: any) {
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontSize: 10, color: C.textMuted, textAlign: 'center', marginBottom: 4 }}>{label.toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: winner === 'A' ? C.green + '22' : 'transparent' }}>
          <Text style={{ color: winner === 'A' ? C.green : C.textPrimary, fontWeight: winner === 'A' ? 'bold' : 'normal' }}>{valA}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', padding: 8, borderRadius: 8, backgroundColor: winner === 'B' ? C.green + '22' : 'transparent' }}>
          <Text style={{ color: winner === 'B' ? C.green : C.textPrimary, fontWeight: winner === 'B' ? 'bold' : 'normal' }}>{valB}</Text>
        </View>
      </View>
    </View>
  );
}

// Fix missing Platform import
import { Platform } from 'react-native';
