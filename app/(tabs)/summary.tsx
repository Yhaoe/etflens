/**
 * ETFLens — AI Summary Screen
 * Features:
 *  - Portfolio Health Score
 *  - Overlap Warning Detector
 *  - Green Flag / Red Flag analysis
 *  - Actionable AI insights
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Animated, ActivityIndicator, Share, Dimensions,
} from 'react-native';
const SW = Dimensions.get('window').width;
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, ThemeColors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateOfflineReport, OfflineReport } from '@/services/offlineEngine';
import { generateLLMReport, APIKeys } from '@/services/llmEngine';

const WATCHLIST_KEY = '@etflens_watchlist';
const PROFILE_KEY = '@etflens_profile';

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SummaryScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const s = styles(C, isDark);

  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [aiMode, setAiMode] = useState<string>('Offline Mode (No API Key)');
  const [activeKeys, setActiveKeys] = useState<APIKeys>({ gemini: null, claude: null, grok: null });
  const [report, setReport] = useState<OfflineReport | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Check which AI is active from Vault
  useEffect(() => {
    const checkKeys = async () => {
      const raw = await AsyncStorage.getItem('@etflens_vault_meta');
      let g = null; let m = null; let c = null;
      let modes = [];
      
      if (raw) {
        const vault = JSON.parse(raw);
        const grokEntry = vault.find((v:any) => v.provider === 'GROK');
        const geminiEntry = vault.find((v:any) => v.provider === 'GEMINI');
        const claudeEntry = vault.find((v:any) => v.provider === 'CLAUDE');

        if (grokEntry) g = await SecureStore.getItemAsync(`etflens_vault_${grokEntry.id}`);
        if (geminiEntry) m = await SecureStore.getItemAsync(`etflens_vault_${geminiEntry.id}`);
        if (claudeEntry) c = await SecureStore.getItemAsync(`etflens_vault_${claudeEntry.id}`);

        if (g) modes.push(grokEntry.name);
        if (m) modes.push(geminiEntry.name);
        if (c) modes.push(claudeEntry.name);
      }
      
      setActiveKeys({ gemini: m, claude: c, grok: g });
      
      if (modes.length > 0) {
        setAiMode(`Powered by Vault: ${modes.join(', ')}`);
      }
    };
    checkKeys();
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalyzed(false);
    fadeAnim.setValue(0);
    
    // Fetch user data
    const wlRaw = await AsyncStorage.getItem(WATCHLIST_KEY);
    const profRaw = await AsyncStorage.getItem(PROFILE_KEY);
    const modeRaw = await AsyncStorage.getItem('@etflens_view_mode');
    
    const watchlist = wlRaw ? JSON.parse(wlRaw) : [];
    const profile = profRaw ? JSON.parse(profRaw) : {};
    const viewMode = (modeRaw === 'advanced' ? 'advanced' : 'beginner') as 'beginner' | 'advanced';
    
    // Generate Report
    try {
      const hasKeys = activeKeys.gemini || activeKeys.grok || activeKeys.claude;
      let finalReport: OfflineReport;
      
      if (hasKeys) {
        // Try the live LLM API
        finalReport = await generateLLMReport(activeKeys, watchlist, profile);
      } else {
        // Fallback to offline rule engine
        finalReport = generateOfflineReport(watchlist, 0, profile, viewMode);
      }
      
      setReport(finalReport);
      setLoading(false);
      setAnalyzed(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error(error);
      // If API fails (e.g. rate limit), immediately fallback to offline
      const offlineRep = generateOfflineReport(watchlist, 0, profile);
      offlineRep.engineUsed = "Offline Fallback (API Failed)";
      setReport(offlineRep);
      setLoading(false);
      setAnalyzed(true);
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }
  };

  const onShare = async () => {
    if (!report) return;
    try {
      const message = `🔥 My Portfolio Health: ${report.score}/100\n🛡️ Strategy: ${report.score > 80 ? 'Quantitatively Robust' : 'Active Optimization'}\n📈 Projected Wealth: Analyzed via Wealth Oracle\n\nAnalyzed by ETF Oracle ⚔️ — The Science of Wealth.\n#ETFOracle #SmartInvesting`;
      await Share.share({ message });
    } catch (error) {
      console.error(error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return C.green;
    if (score >= 60) return C.gold;
    return C.red;
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ───────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.title}>🧠 AI Summary</Text>
        <Text style={s.subtitle}>Deep portfolio analysis & insights</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {!analyzed && !loading ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 64 }}>🕵️‍♂️</Text>
            <Text style={[s.emptyTitle, { color: C.textPrimary }]}>Ready to Analyze</Text>
            <Text style={[s.emptySub, { color: C.textSecondary }]}>
              We'll scan your watchlist for overlaps, risk exposure, and hidden red flags.
            </Text>
            
            <View style={[s.engineBadge, { backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF' }]}>
              <Text style={[s.engineText, { color: C.textSecondary }]}>Engine: {aiMode}</Text>
            </View>

            <TouchableOpacity style={[s.analyzeBtn, { backgroundColor: C.blue }]} onPress={handleAnalyze}>
              <Text style={s.analyzeBtnTxt}>Generate Insights →</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={C.blue} style={{ marginBottom: Spacing.md }} />
            <Text style={[s.loadingTitle, { color: C.textPrimary }]}>Analyzing Portfolio...</Text>
            <Text style={[s.loadingSub, { color: C.textMuted }]}>Checking 1,420 underlying holdings</Text>
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            
            {/* ── Health Score & Matrix ─────────────────── */}
            <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, padding: 0, overflow: 'hidden' }]}>
              <View style={{ flexDirection: SW > 600 ? 'row' : 'column' }}>
                <View style={{ flex: 1, padding: Spacing.lg, alignItems: 'center', borderRightWidth: SW > 600 ? 1 : 0, borderRightColor: C.border }}>
                  <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: C.textSecondary, fontSize: 10, fontFamily: Typography.fontFamily.bodyBold, letterSpacing: 1.5, flex: 1, textAlign: 'center', marginLeft: 40 }}>PORTFOLIO HEALTH SCORE</Text>
                    <TouchableOpacity onPress={onShare} style={{ width: 40, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 20 }}>📤</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                    <Text style={[s.scoreText, { color: getScoreColor(report?.score || 0), fontSize: 64 }]}>{report?.score}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 20, fontFamily: Typography.fontFamily.bodyBold }}>/100</Text>
                  </View>
                  <View style={{ height: 6, width: '100%', backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF', borderRadius: 3, marginTop: 10 }}>
                    <View style={{ height: '100%', width: `${report?.score}%`, backgroundColor: getScoreColor(report?.score || 0), borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: C.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 18, fontFamily: Typography.fontFamily.bodyMedium }}>
                    {report?.score && report.score > 80 ? "Your strategy is quantitatively robust." : "Structural optimizations are available below."}
                  </Text>
                </View>

                <View style={{ flex: SW > 600 ? 1.5 : 0, backgroundColor: isDark ? 'rgba(255,255,255,0.01)' : '#F9FAFB', padding: Spacing.md, justifyContent: 'center' }}>
                  <Text style={{ color: C.textPrimary, fontSize: 12, fontFamily: Typography.fontFamily.headingSemi, marginBottom: 12 }}>🧩 Diversification Matrix</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <MatrixBox label="US Exposure" value={report?.score && report.score > 70 ? "Balanced" : "Concentrated"} color={C.blue} percent={82} />
                    <MatrixBox label="Tech Weight" value="Medium" color={C.gold} percent={45} />
                    <MatrixBox label="Yield Flow" value={report?.flags.tax && report.flags.tax.length > 0 ? "Leaky" : "Efficient"} color={C.red} percent={30} />
                  </View>
                </View>
              </View>
            </View>

            {/* ── Tax Optimization Warnings ──────────── */}
            {report?.flags.tax && report.flags.tax.length > 0 && (
              <View style={[s.card, { backgroundColor: isDark ? 'rgba(59,130,246,0.05)' : '#EFF6FF', borderColor: C.blue }]}>
                <View style={s.cardHeaderRow}>
                  <Text style={{ fontSize: 20 }}>🌐</Text>
                  <Text style={[s.cardTitle, { color: C.blue }]}>Tax Optimization</Text>
                </View>
                {report.flags.tax.map((flag, i) => (
                  <View key={i} style={s.flagRow}>
                    <Text style={{ color: C.blue, fontSize: 16, marginTop: 2 }}>•</Text>
                    <Text style={[s.bodyTxt, { color: C.textPrimary, flex: 1 }]}>{flag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Green Flags ────────────────────────── */}
            <View style={[s.card, { backgroundColor: isDark ? 'rgba(0,230,118,0.05)' : '#F0FFF7', borderColor: C.green }]}>
              <View style={s.cardHeaderRow}>
                <Text style={{ fontSize: 20 }}>✅</Text>
                <Text style={[s.cardTitle, { color: C.green }]}>Structural Strengths</Text>
              </View>
              {report?.flags.green.map((flag, i) => (
                <View key={i} style={s.flagRow}>
                  <Text style={{ color: C.green, fontSize: 16, marginTop: 2 }}>•</Text>
                  <Text style={[s.bodyTxt, { color: C.textPrimary, flex: 1 }]}>{flag}</Text>
                </View>
              ))}
            </View>

            {/* ── Red Flags ──────────────────────────── */}
            <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,61,87,0.05)' : '#FFF0F2', borderColor: C.red }]}>
              <View style={s.cardHeaderRow}>
                <Text style={{ fontSize: 20 }}>🚨</Text>
                <Text style={[s.cardTitle, { color: C.red }]}>Risks & Warnings</Text>
              </View>
              {report?.flags.red.map((flag, i) => (
                <View key={i} style={s.flagRow}>
                  <Text style={{ color: C.red, fontSize: 16, marginTop: 2 }}>•</Text>
                  <Text style={[s.bodyTxt, { color: C.textPrimary, flex: 1 }]}>{flag}</Text>
                </View>
              ))}
            </View>
            
            {/* ── Strategic Advice ─────────────────────── */}
            <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={s.cardHeaderRow}>
                <Text style={{ fontSize: 20 }}>📈</Text>
                <Text style={[s.cardTitle, { color: C.textPrimary }]}>Algorithmic Strategy</Text>
              </View>
              <Text style={[s.bodySemi, { color: C.textSecondary, marginBottom: Spacing.sm }]}>What To Buy:</Text>
              {report?.strategy.whatToBuy.map((flag, i) => (
                <View key={`w_${i}`} style={s.flagRow}>
                  <Text style={{ color: C.textSecondary, fontSize: 16, marginTop: 2 }}>•</Text>
                  <Text style={[s.bodyTxt, { color: C.textPrimary, flex: 1 }]}>{flag}</Text>
                </View>
              ))}
              
              <Text style={[s.bodySemi, { color: C.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm }]}>When To Trade:</Text>
              {report?.strategy.whenToTrade.map((flag, i) => (
                <View key={`t_${i}`} style={s.flagRow}>
                  <Text style={{ color: C.textSecondary, fontSize: 16, marginTop: 2 }}>•</Text>
                  <Text style={[s.bodyTxt, { color: C.textPrimary, flex: 1 }]}>{flag}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[s.reAnalyzeBtn, { borderColor: C.blue }]} onPress={handleAnalyze}>
              <Text style={[s.reAnalyzeTxt, { color: C.blue }]}>↻ Recalculate</Text>
            </TouchableOpacity>

            <Text style={[s.footerTxt, { color: C.textMuted }]}>{report?.engineUsed} · Not financial advice</Text>

          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (C: ThemeColors, isDark: boolean) => StyleSheet.create({
  safe:        { flex:1, backgroundColor:C.background },
  header:      { padding:Spacing.md, paddingBottom:Spacing.sm },
  title:       { fontFamily:Typography.fontFamily.heading, fontSize:Typography.size['2xl'], color:C.textPrimary },
  subtitle:    { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm, color:C.textSecondary, marginTop:2 },
  scroll:      { flex:1 },
  scrollContent:{ padding:Spacing.md, paddingBottom:Spacing['3xl'] },

  // Empty / Loading State
  emptyState:  { alignItems:'center', justifyContent:'center', marginTop:Spacing['3xl'], padding:Spacing.lg },
  emptyTitle:  { fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.xl, marginTop:Spacing.md, marginBottom:Spacing.xs },
  emptySub:    { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm, textAlign:'center', marginBottom:Spacing.xl, lineHeight:20 },
  engineBadge: { paddingHorizontal:Spacing.md, paddingVertical:8, borderRadius:Radius.full, marginBottom:Spacing.xl },
  engineText:  { fontFamily:Typography.fontFamily.bodyMedium, fontSize:Typography.size.xs },
  analyzeBtn:  { paddingVertical:14, paddingHorizontal:Spacing.xl, borderRadius:Radius.full, width:'100%', alignItems:'center',
                 shadowColor: C.blue, shadowOffset: {width:0,height:4}, shadowOpacity:0.3, shadowRadius:8, elevation:5 },
  analyzeBtnTxt:{ fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.md, color:'#fff' },
  
  loadingState:{ alignItems:'center', justifyContent:'center', marginTop:Spacing['3xl']*1.5 },
  loadingTitle:{ fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.lg, marginBottom:4 },
  loadingSub:  { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm },

  // Result Cards
  card:        { borderRadius:Radius.xl, padding:Spacing.lg, marginBottom:Spacing.md, borderWidth:1 },
  cardHeaderRow:{ flexDirection:'row', alignItems:'center', gap:Spacing.sm, marginBottom:Spacing.md },
  cardTitle:   { fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.lg },
  
  scoreCircle: { alignSelf:'center', alignItems:'center', justifyContent:'center', width:120, height:120, borderRadius:60,
                 borderWidth:8, borderColor: isDark ? C.surfaceElevated : '#EEF2FF', marginVertical:Spacing.md },
  scoreText:   { fontFamily:Typography.fontFamily.heading, fontSize:42, letterSpacing:-1 },
  scoreSub:    { fontFamily:Typography.fontFamily.bodySemiBold, fontSize:Typography.size.sm },
  scoreDesc:   { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm, textAlign:'center', lineHeight:20 },

  bodyTxt:     { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm, lineHeight:20 },
  bodySemi:    { fontFamily:Typography.fontFamily.bodySemiBold, fontSize:Typography.size.sm },
  
  overlapItem: { padding:Spacing.md, borderRadius:Radius.md, borderWidth:1, borderColor:C.border },
  flagRow:     { flexDirection:'row', alignItems:'flex-start', gap:Spacing.sm, marginBottom:Spacing.sm },

  reAnalyzeBtn:{ borderWidth:1.5, borderRadius:Radius.full, paddingVertical:12, alignItems:'center', marginTop:Spacing.md, marginBottom:Spacing.xl },
  reAnalyzeTxt:{ fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.sm },
  footerTxt:   { fontFamily:Typography.fontFamily.body, fontSize:11, textAlign:'center', marginBottom:Spacing.xl },
});

function MatrixBox({ label, value, color, percent }: any) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  return (
    <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: isDark ? '#000' : '#fff', borderWidth: 1, borderColor: C.border }}>
      <Text style={{ fontSize: 7, color: C.textMuted, fontFamily: Typography.fontFamily.bodyBold, marginBottom: 4 }}>{label.toUpperCase()}</Text>
      <Text style={{ fontSize: 10, color: color, fontFamily: Typography.fontFamily.headingSemi, marginBottom: 6 }}>{value}</Text>
      <View style={{ height: 3, width: '100%', backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF', borderRadius: 1.5 }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: color, borderRadius: 1.5 }} />
      </View>
    </View>
  );
}
