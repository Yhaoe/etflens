import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, ThemeColors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getQuotes } from '@/services/finnhub';
import { CATEGORIES_METADATA, getERBadge } from '@/constants/CuratedETFs';
import { fetchLiveCategories } from '@/services/cloudSync';

const { width: SW } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'SGD', 'IDR', 'MYR', 'AUD', 'CAD', 'AED', 'HKD'];
const FX_RATES: Record<string, number> = { 
  USD: 1, EUR: 0.93, GBP: 0.79, JPY: 151.2, SGD: 1.35, 
  IDR: 15850, MYR: 4.47, AUD: 1.52, CAD: 1.37, AED: 3.67, HKD: 7.82 
};
const CURRENCY_SYMBOL: Record<string, string> = { 
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', SGD: 'S$', 
  IDR: 'Rp', MYR: 'RM', AUD: 'A$', CAD: 'C$', AED: 'د.إ', HKD: 'HK$' 
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatValue = (usd: number, currency: string): string => {
  const converted = usd * FX_RATES[currency];
  return converted >= 1000
    ? converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : converted.toFixed(2);
};

const getRegionFlag = (domicile?: string) => {
  if (domicile === 'US') return '🇺🇸';
  if (domicile === 'IE') return '🇮🇪';
  return '🌍';
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

/** Animated counter that counts up on mount */
function AnimatedCounter({ value, currency, style, isPrivate }: {
  value: number;
  currency: string;
  style?: object;
  isPrivate?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState('0.00');

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value * FX_RATES[currency],
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const listener = anim.addListener(({ value: v }) => {
      setDisplay(
        v >= 1000
          ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : v.toFixed(2)
      );
    });
    return () => anim.removeListener(listener);
  }, [value, currency]);

  return (
    <Text style={style}>
      {isPrivate ? '••••••••' : `${CURRENCY_SYMBOL[currency]}${display}`}
    </Text>
  );
}



/** Single ETF row card */
function ETFCard({ etf, categoryId, currency, C, isDark }: {
  etf: any;
  categoryId: string;
  currency: string;
  C: ThemeColors;
  isDark: boolean;
}) {
  const isPositive = (etf.change || 0) >= 0;
  const changeColor = isPositive ? C.green : C.red;
  
  // Get Oracle Metrics
  const badge = categoryId ? getERBadge(etf.er, categoryId as any) : { label: "N/A", color: "#888", bg: "transparent", icon: "" };

  return (
    <View style={[cardStyles.card, {
      backgroundColor: C.surface,
      borderColor: C.border,
      ...(isDark ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
      }),
    }]}>
      {/* Left — ticker + name + oracle metrics */}
      <View style={cardStyles.left}>
        <View style={[cardStyles.regionBadge, { backgroundColor: isDark ? C.surfaceElevated : '#F0F4FF' }]}>
          <Text style={{ fontSize: 16 }}>{getRegionFlag(etf.domicile)}</Text>
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[cardStyles.ticker, { color: C.textPrimary }]}>{etf.ticker}</Text>
            {/* ER Badge */}
            <View style={{ backgroundColor: badge.bg, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: `${badge.color}33` }}>
              <Text style={{ fontSize: 8, fontWeight: '800', color: badge.color, letterSpacing: 0.5 }}>
                {badge.icon} {badge.label}
              </Text>
            </View>
          </View>
          <Text style={[cardStyles.name, { color: C.textSecondary }]} numberOfLines={1}>
            {etf.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            <Text style={{ fontSize: 9, color: C.textSecondary, fontFamily: 'monospace' }}>
              R5: <Text style={{ color: etf.r5 >= 0 ? C.green : C.red }}>{etf.r5 >= 0 ? '+' : ''}{etf.r5}%</Text>
            </Text>
            <Text style={{ fontSize: 9, color: C.textSecondary, fontFamily: 'monospace' }}>
              SHARPE: <Text style={{ color: etf.sharpe >= 1.0 ? C.green : C.textPrimary }}>{etf.sharpe}</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Right — price + change */}
      <View style={cardStyles.right}>
        <Text style={[cardStyles.price, { color: C.textPrimary }]}>
          {etf.price ? `${CURRENCY_SYMBOL[currency]}${formatValue(etf.price, currency)}` : 'Loading...'}
        </Text>
        {etf.change !== undefined && (
          <View style={[cardStyles.changeBadge, {
            backgroundColor: isPositive ? C.greenGlow : C.redGlow,
            marginTop: 4
          }]}>
            <Text style={[cardStyles.changeText, { color: changeColor }]}>
              {isPositive ? '▲' : '▼'} {Math.abs(etf.change).toFixed(2)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** Empty skeleton ETF row card */
function EmptyETFCard({ C, isDark }: { C: ThemeColors; isDark: boolean }) {
  return (
    <View style={[cardStyles.card, {
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA',
      borderStyle: 'dashed',
    }]}>
      <View style={cardStyles.left}>
        <View style={[cardStyles.regionBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA' }]} />
        <View style={{ gap: 6 }}>
          <View style={{ width: 50, height: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA', borderRadius: 4 }} />
          <View style={{ width: 100, height: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA', borderRadius: 4 }} />
        </View>
      </View>
      <View style={cardStyles.right}>
        <View style={{ width: 60, height: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA', borderRadius: 4, marginBottom: 6 }} />
        <View style={{ width: 40, height: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#E5E5EA', borderRadius: 8 }} />
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  regionBadge: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticker: {
    fontFamily: Typography.fontFamily.headingSemi,
    fontSize: Typography.size.md,
  },
  name: {
    fontFamily: Typography.fontFamily.body,
    fontSize: Typography.size.xs,
    maxWidth: SW * 0.4,
  },
  right: { alignItems: 'flex-end', gap: 4 },
  price: {
    fontFamily: Typography.fontFamily.headingSemi,
    fontSize: Typography.size.base,
  },
  changeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  changeText: {
    fontFamily: Typography.fontFamily.bodySemiBold,
    fontSize: Typography.size.xs,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [initial, setInitial] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [profile, setProfile] = useState<Record<string, string>>({});
  
  // State for live ETF prices
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [categoriesData, setCategoriesData] = useState<any[]>(CATEGORIES_METADATA); // Default to static before cloud loads
  const [etfs, setEtfs] = useState<any[]>([]);

  // Forecaster State
  const [investmentAmount, setInvestmentAmount] = useState('0');
  const [investmentType, setInvestmentType] = useState('Monthly'); // 'Lump Sum' | 'Monthly'
  const [projectionYears, setProjectionYears] = useState('10');
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const expectedReturn = 9.5;

  // Calculate Future Value
  const r = expectedReturn / 100 / 12;
  const t = (Number(projectionYears) || 0) * 12;
  const amt = Number(investmentAmount) || 0;
  
  const p = investmentType === 'Lump Sum' ? amt : 0;
  const m = investmentType === 'Monthly' ? amt : 0;
  
  const fvLumpSum = p * Math.pow(1 + r, t);
  const fvAnnuity = m > 0 && r > 0 ? m * (Math.pow(1 + r, t) - 1) / r : 0;
  const futureValue = fvLumpSum + fvAnnuity;
  
  const totalInvested = p + (m * t);
  const totalGrowth = futureValue - totalInvested;
  
  const investedRatio = (totalInvested / futureValue) * 100;
  const growthRatio = (totalGrowth / futureValue) * 100;

  const headerAnim = useRef(new Animated.Value(0)).current;

  const fetchLivePrices = async (etfList: any[]) => {
    if (!etfList || etfList.length === 0) return;
    try {
      const tickers = etfList.map(e => e.ticker);
      const quotes = await getQuotes(tickers);
      
      const updatedEtfs = etfList.map(etf => {
        const q = quotes[etf.ticker];
        if (q) {
          return { ...etf, price: q.c, change: q.dp };
        }
        return etf;
      });
      
      // Auto-Sort: Highest performing ETF today goes to the top (descending order)
      updatedEtfs.sort((a, b) => {
        const changeA = a.change !== undefined ? a.change : -9999;
        const changeB = b.change !== undefined ? b.change : -9999;
        return changeB - changeA;
      });
      
      setEtfs(updatedEtfs);
    } catch (error) {
      console.error('Error fetching live prices:', error);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('@etflens_profile').then((raw) => {
      if (raw) setProfile(JSON.parse(raw));
    });

    // Cloud Sync: Fetch live categories on startup
    fetchLiveCategories().then(data => {
      if (data && data.length > 0) {
        setCategoriesData(data);
      }
    });

    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    if (selectedCategory) {
      const cat = CATEGORIES_METADATA.find(c => c.id === selectedCategory);
      if (cat && cat.etfs) {
        await fetchLivePrices(cat.etfs);
      }
    }
    setRefreshing(false);
  };

  const [refreshing, setRefreshing] = useState(false);
  const s = styles(C, isDark);

  return (
    <View style={[s.safe, { paddingTop: insets.top }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.green}
            colors={[C.green]}
          />
        }
      >
        {/* ── Header Greeting ──────────────────────── */}
        <Animated.View style={[s.headerRow, { opacity: headerAnim }]}>
          <View style={s.header}>
            <Text style={s.title}>Wealth Oracle</Text>
            <Text style={s.subtitle}>Compounding Simulator</Text>
          </View>
        </Animated.View>

        {/* ── Projected Wealth Card ──────────────────── */}
        <View style={s.portfolioCard}>
          {/* Profile Section Above Value */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm }}>
              <Text style={{ fontSize: 18 }}>{profile?.name ? profile.name.charAt(0).toUpperCase() : '👤'}</Text>
            </View>
            <View>
              <Text style={{ fontFamily: Typography.fontFamily.bodyMedium, fontSize: 12, color: C.textSecondary }}>Good Morning,</Text>
              <Text style={{ fontFamily: Typography.fontFamily.headingSemi, fontSize: 18, color: C.textPrimary }}>{profile?.name || 'Investor'}</Text>
            </View>
          </View>

          <Text style={s.portfolioLabel}>Projected Wealth ({projectionYears}Y)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AnimatedCounter
              value={futureValue}
              currency={currency}
              style={s.portfolioValue}
              isPrivate={isPrivate}
            />
            <TouchableOpacity 
              onPress={() => setIsPrivate(!isPrivate)}
              style={{ padding: 6, borderRadius: 16, backgroundColor: isDark ? '#1F2937' : '#EEF2FF', marginTop: -4 }}
            >
              <Text style={{ fontSize: 16 }}>{isPrivate ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: Spacing.xs, gap: 2 }}>
            <Text style={[s.dailyUSD, { color: C.green }]}>
              {isPrivate ? '' : `Growth: +${CURRENCY_SYMBOL[currency]}${formatValue(totalGrowth, currency)}`}
            </Text>
            <Text style={s.dailyUSD}>
              {isPrivate ? 'Hidden' : `Contribution: ${CURRENCY_SYMBOL[currency]}${formatValue(totalInvested, currency)}`}
            </Text>
          </View>
        </View>

        {/* ── Minimalist Simulation Controls ──────────────────── */}
        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>⚙️ Simulator</Text>
          
          <View style={s.inputRow}>
            <View style={s.amountInputContainer}>
              <Text style={s.currencySymbol}>{CURRENCY_SYMBOL[currency]}</Text>
              <TextInput 
                style={s.amountInput}
                value={investmentAmount}
                onChangeText={setInvestmentAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.textMuted}
              />
            </View>
            
            <TouchableOpacity style={s.dropdownPill} onPress={() => setCurrencyModalVisible(true)}>
              <Text style={s.dropdownPillText}>{currency} ▼</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.dropdownPill} onPress={() => setTypeModalVisible(true)}>
              <Text style={s.dropdownPillText}>{investmentType} ▼</Text>
            </TouchableOpacity>
          </View>
          
          <View style={s.yearsRow}>
            <Text style={s.yearsLabel}>Time Horizon (Years):</Text>
            <TextInput 
              style={s.yearsInput}
              value={projectionYears}
              onChangeText={setProjectionYears}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          <View style={[s.oracleNote, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F0F4FF', marginTop: Spacing.md }]}>
            <Text style={[s.oracleNoteTxt, { color: C.textSecondary }]}>
              💡 At {expectedReturn}% CAGR, your money doubles every {Math.round(72 / expectedReturn)} years. Compounding works best with time, not just amount.
            </Text>
          </View>
        </View>

        {/* ── Watchlist ────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>The Watcher ETF</Text>
          <TouchableOpacity 
            onPress={() => setCategoryModalVisible(true)}
            style={[s.dropdownPill, { height: 32, paddingHorizontal: 12, backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}
          >
            <Text style={s.dropdownPillText}>
              {selectedCategory ? categoriesData.find(c => c.id === selectedCategory)?.label : 'Select Category'} ▼
            </Text>
          </TouchableOpacity>
        </View>

        {etfs.map((etf) => (
          <ETFCard key={etf.ticker} etf={etf} categoryId={selectedCategory || ''} currency={currency} C={C} isDark={isDark} />
        ))}
        {Array.from({ length: Math.max(0, 10 - etfs.length) }).map((_, i) => (
          <EmptyETFCard key={`empty-${i}`} C={C} isDark={isDark} />
        ))}

        {/* ── Currency Modal ──────────────────────── */}
        <Modal visible={currencyModalVisible} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCurrencyModalVisible(false)}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Select Currency</Text>
              <ScrollView>
                {CURRENCIES.map(cur => (
                  <TouchableOpacity 
                    key={cur} 
                    style={[s.modalItem, currency === cur && s.modalItemActive]}
                    onPress={() => {
                      setCurrency(cur);
                      setCurrencyModalVisible(false);
                    }}
                  >
                    <Text style={[s.modalItemText, currency === cur && s.modalItemTextActive]}>
                      {cur} - {CURRENCY_SYMBOL[cur]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Investment Type Modal ──────────────────────── */}
        <Modal visible={typeModalVisible} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setTypeModalVisible(false)}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Investment Type</Text>
              <ScrollView>
                {['Lump Sum', 'Monthly'].map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[s.modalItem, investmentType === type && s.modalItemActive]}
                    onPress={() => {
                      setInvestmentType(type);
                      setTypeModalVisible(false);
                    }}
                  >
                    <Text style={[s.modalItemText, investmentType === type && s.modalItemTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── Category Modal ──────────────────────── */}
        <Modal visible={categoryModalVisible} transparent animationType="fade">
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setCategoryModalVisible(false)}>
            <View style={s.modalContent}>
              <Text style={s.modalTitle}>Oracle ETF Category</Text>
              <ScrollView>
                {categoriesData.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[s.modalItem, selectedCategory === cat.id && s.modalItemActive]}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      setCategoryModalVisible(false);
                      const newEtfs = cat.etfs || [];
                      setEtfs(newEtfs);
                      fetchLivePrices(newEtfs);
                    }}
                  >
                    <Text style={[s.modalItemText, selectedCategory === cat.id && s.modalItemTextActive]}>
                      {cat.icon}  {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Finnhub attribution */}
        <Text style={s.attribution}>
          Market data powered by Finnhub · Prices update every 5 min
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = (C: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.md, paddingBottom: Spacing['3xl'] },

    // Header
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    greeting: {
      fontFamily: Typography.fontFamily.headingSemi,
      fontSize: Typography.size.xl,
      color: C.textPrimary,
    },
    journeyTag: {
      fontFamily: Typography.fontFamily.body,
      fontSize: Typography.size.sm,
      color: C.gold,
      marginTop: 2,
    },
    liveTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    liveText: { fontFamily: Typography.fontFamily.bodySemiBold, fontSize: 10, letterSpacing: 1 },

    // Portfolio Card
    portfolioCard: {
      backgroundColor: isDark ? C.surface : C.surface,
      borderRadius: Radius['2xl'],
      padding: 16,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0,230,118,0.15)' : C.border,
      ...(isDark ? {
        shadowColor: C.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      }),
    },
    portfolioLabel: {
      fontFamily: Typography.fontFamily.body,
      fontSize: Typography.size.sm,
      color: C.textSecondary,
      marginBottom: 4,
    },
    portfolioValue: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.size['4xl'],
      color: C.textPrimary,
      letterSpacing: -1,
      marginBottom: 0,
    },
    // Minimalist Inputs
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: Spacing.md,
      flexWrap: 'wrap',
    },
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      borderRadius: Radius.lg,
      paddingHorizontal: 12,
      height: 44,
      flex: 1,
      minWidth: 100,
    },
    currencySymbol: {
      fontFamily: Typography.fontFamily.bodySemiBold,
      fontSize: 16,
      color: C.textSecondary,
      marginRight: 4,
    },
    amountInput: {
      flex: 1,
      fontFamily: Typography.fontFamily.headingSemi,
      fontSize: 18,
      color: C.textPrimary,
      height: '100%',
    },
    dropdownPill: {
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      height: 44,
      paddingHorizontal: 16,
      borderRadius: Radius.lg,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#E5E7EB',
    },
    dropdownPillText: {
      fontFamily: Typography.fontFamily.bodySemiBold,
      fontSize: 13,
      color: C.textPrimary,
    },
    yearsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
      borderRadius: Radius.lg,
      paddingHorizontal: 12,
      height: 44,
    },
    yearsLabel: {
      fontFamily: Typography.fontFamily.bodyMedium,
      fontSize: 13,
      color: C.textSecondary,
    },
    yearsInput: {
      fontFamily: Typography.fontFamily.headingSemi,
      fontSize: 16,
      color: C.textPrimary,
      width: 40,
      textAlign: 'right',
    },

    oracleMainValue: { fontFamily: Typography.fontFamily.heading, fontSize: 36, marginBottom: 4 },
    oracleSub: { fontFamily: Typography.fontFamily.body, fontSize: 12, marginBottom: Spacing.sm },
    oracleNote: { padding: Spacing.sm, borderRadius: Radius.sm },
    oracleNoteTxt: { fontFamily: Typography.fontFamily.body, fontSize: 11, fontStyle: 'italic', lineHeight: 16 },


    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '70%',
      maxHeight: '60%',
      backgroundColor: C.surface,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: C.border,
    },
    modalTitle: {
      fontFamily: Typography.fontFamily.headingSemi,
      fontSize: 16,
      color: C.textPrimary,
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    modalItem: {
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      alignItems: 'center',
      borderRadius: Radius.md,
    },
    modalItemActive: {
      backgroundColor: isDark ? 'rgba(0,230,118,0.1)' : '#E6F9EE',
      borderBottomWidth: 0,
    },
    modalItemText: {
      fontFamily: Typography.fontFamily.bodyMedium,
      fontSize: 14,
      color: C.textSecondary,
    },
    modalItemTextActive: {
      color: C.green,
      fontFamily: Typography.fontFamily.bodySemiBold,
    },
  });
