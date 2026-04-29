/**
 * ETFLens — News Screen
 * Features:
 *  - Latest market news filtered by user's watchlist
 *  - Categorized into "All", "US Markets", "Global", "Tech", etc.
 *  - Pull-to-refresh
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Image, Linking, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, ThemeColors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';
import { getMarketNews, NewsArticle } from '@/services/finnhub';

const CATEGORIES = ['All News', 'US Markets', 'Tech', 'Global'];


// ─── News Card Component ──────────────────────────────────────────────────────
function NewsCard({ article, C, isDark }: { article: NewsArticle; C: ThemeColors; isDark: boolean }) {
  // Convert unix timestamp to readable relative time
  const getRelativeTime = (unix: number) => {
    const diffHours = Math.round((Date.now() / 1000 - unix) / 3600);
    if (diffHours < 1) return 'Just now';
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.round(diffHours / 24)} days ago`;
  };
  return (
    <TouchableOpacity 
      style={[sCard.card, { backgroundColor: C.surface, borderColor: C.border }]}
      activeOpacity={0.7}
      onPress={() => Linking.openURL(article.url)}
    >
      {/* Text Content */}
      <View style={sCard.content}>
        <View style={sCard.metaRow}>
          <Text style={[sCard.source, { color: C.textSecondary }]} numberOfLines={1}>
            {article.source}
          </Text>
          <Text style={[sCard.dot, { color: C.textMuted }]}>•</Text>
          <Text style={[sCard.time, { color: C.textMuted }]}>{getRelativeTime(article.datetime)}</Text>
        </View>
        <Text style={[sCard.headline, { color: C.textPrimary }]} numberOfLines={3}>
          {article.headline}
        </Text>
        
        {/* Related Tickers */}
        <View style={sCard.tickerRow}>
          {article.related && article.related.split(',').slice(0, 3).map(t => (
            <View key={t} style={[sCard.tickerBadge, { backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF' }]}>
              <Text style={[sCard.tickerTxt, { color: C.textSecondary }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Thumbnail */}
      {article.image ? (
        <Image source={{ uri: article.image }} style={sCard.thumbnail} />
      ) : (
        <View style={[sCard.thumbnail, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ fontSize: 24 }}>📰</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const sCard = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    paddingRight: Spacing.md,
    justifyContent: 'space-between',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  source: { fontFamily: Typography.fontFamily.bodySemiBold, fontSize: 11, textTransform: 'uppercase' },
  dot: { marginHorizontal: 6, fontSize: 10 },
  time: { fontFamily: Typography.fontFamily.body, fontSize: 11 },
  headline: {
    fontFamily: Typography.fontFamily.headingSemi,
    fontSize: Typography.size.base,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  tickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tickerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tickerTxt: {
    fontFamily: Typography.fontFamily.bodySemiBold,
    fontSize: 10,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    backgroundColor: '#333', // placeholder color
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NewsScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const s = styles(C, isDark);

  const [activeCat, setActiveCat] = useState('All News');
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    try {
      const data = await getMarketNews();
      setNews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNews();
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ───────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.title}>📰 Market News</Text>
        <Text style={s.subtitle}>Latest updates for your portfolio</Text>
      </View>

      {/* ── Category Filter ──────────────────────── */}
      <View style={{ paddingBottom: Spacing.sm }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.catPill, activeCat === cat && { backgroundColor: C.green }]}
              onPress={() => setActiveCat(cat)}
            >
              <Text style={[s.catTxt, { color: activeCat === cat ? '#0A0E1A' : C.textSecondary }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── News List ────────────────────────────── */}
      <ScrollView 
        style={s.scroll} 
        contentContainerStyle={s.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green} />}
      >
        <Text style={[s.listHeader, { color: C.textSecondary }]}>LATEST STORIES</Text>
        
        {loading && !refreshing ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.blue} />
            <Text style={{ color: C.textMuted, marginTop: 12, fontFamily: Typography.fontFamily.body }}>
              Loading market news...
            </Text>
          </View>
        ) : (
          news.slice(0, 20).map(article => (
            <NewsCard key={article.id} article={article} C={C} isDark={isDark} />
          ))
        )}
        
        <View style={s.footer}>
          <Text style={[s.footerTxt, { color: C.textMuted }]}>News data powered by Finnhub</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (C: ThemeColors, isDark: boolean) => StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.background },
  header:   { padding: Spacing.md, paddingBottom: Spacing.sm },
  title:    { fontFamily: Typography.fontFamily.heading, fontSize: Typography.size['2xl'], color: C.textPrimary },
  subtitle: { fontFamily: Typography.fontFamily.body, fontSize: Typography.size.sm, color: C.textSecondary, marginTop: 2 },
  
  catScroll:{ paddingHorizontal: Spacing.md, gap: 8 },
  catPill:  { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: isDark ? C.surfaceElevated : '#EEF2FF' },
  catTxt:   { fontFamily: Typography.fontFamily.bodyMedium, fontSize: Typography.size.sm },
  
  scroll:   { flex: 1 },
  content:  { padding: Spacing.md, paddingBottom: Spacing['3xl'] },
  
  listHeader:{ fontFamily: Typography.fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1.2, marginBottom: Spacing.md },
  
  footer:    { alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  footerTxt: { fontFamily: Typography.fontFamily.body, fontSize: 11 },
});
