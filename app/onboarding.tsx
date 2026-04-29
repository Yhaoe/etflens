/**
 * ETFLens — Investor Profile Interview Screen
 * Screen: Onboarding (Step-by-step motivational interview)
 * Design: High-spirit, emoji-rich, beginner-friendly + advanced-adaptive
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, ThemeColors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Interview Questions ──────────────────────────────────────────────────────
interface Question {
  id: string;
  emoji: string;
  question: string;
  subtext: string;
  options: { label: string; emoji: string; value: string }[];
  motivation: string; // shown after answering
}

const QUESTIONS: Question[] = [
  {
    id: 'experience',
    emoji: '🌱',
    question: "How long have you been investing?",
    subtext: "No right or wrong answer — every legend started somewhere!",
    options: [
      { label: "Just Starting", emoji: '🌱', value: 'beginner' },
      { label: "1–3 Years",     emoji: '📈', value: 'intermediate' },
      { label: "3–5 Years",     emoji: '🚀', value: 'advanced' },
      { label: "5+ Years",      emoji: '💎', value: 'expert' },
    ],
    motivation: "You're already ahead of 90% of people just by showing up! 💪",
  },
  {
    id: 'goal',
    emoji: '🎯',
    question: "What's your main investing goal?",
    subtext: "Your goal shapes everything — let's align your journey perfectly.",
    options: [
      { label: "Grow Wealth",          emoji: '📊', value: 'growth' },
      { label: "Passive Income",       emoji: '💰', value: 'income' },
      { label: "Retire Comfortably",   emoji: '🏖️', value: 'retirement' },
      { label: "Reach $1 Million",     emoji: '🏆', value: 'million' },
    ],
    motivation: "A clear goal is your compass. You've just set yours! 🧭",
  },
  {
    id: 'risk',
    emoji: '⚖️',
    question: "How do you handle market dips?",
    subtext: "Markets go up AND down. Knowing yourself is your superpower.",
    options: [
      { label: "Sleep Fine",         emoji: '😴', value: 'low' },
      { label: "A Bit Anxious",      emoji: '😅', value: 'moderate' },
      { label: "Hold & Trust",       emoji: '🧘', value: 'balanced' },
      { label: "Buy The Dip!",       emoji: '🛒', value: 'aggressive' },
    ],
    motivation: "Self-awareness is a superpower most investors never develop. You have it! ⚡",
  },
  {
    id: 'horizon',
    emoji: '⏳',
    question: "How long will you hold your ETFs?",
    subtext: "Time in the market beats timing the market — always.",
    options: [
      { label: "Under 1 Year",   emoji: '⚡', value: 'short' },
      { label: "1–5 Years",      emoji: '🌤️', value: 'medium' },
      { label: "5–15 Years",     emoji: '🌳', value: 'long' },
      { label: "15+ Years",      emoji: '🌲', value: 'verylong' },
    ],
    motivation: "Compound interest rewards patience. You're playing the long game! 🎯",
  },
  {
    id: 'currency',
    emoji: '💱',
    question: "What's your home currency?",
    subtext: "We'll show your portfolio in the currency that matters to you most.",
    options: [
      { label: "USD ($)",    emoji: '🇺🇸', value: 'USD' },
      { label: "MYR (RM)",   emoji: '🇲🇾', value: 'MYR' },
      { label: "EUR (€)",    emoji: '🇪🇺', value: 'EUR' },
      { label: "Other",      emoji: '🌍', value: 'OTHER' },
    ],
    motivation: "Perfect! Your dashboard will speak your language 🌐",
  },
  {
    id: 'focus',
    emoji: '🌐',
    question: "Which markets interest you most?",
    subtext: "ETFLens covers them all — global is the new local.",
    options: [
      { label: "US Markets",        emoji: '🇺🇸', value: 'us' },
      { label: "Global / World",    emoji: '🌍', value: 'global' },
      { label: "Asia & Emerging",   emoji: '🌏', value: 'asia' },
      { label: "Mix of Everything", emoji: '🎯', value: 'mixed' },
    ],
    motivation: "Diversification is your shield. Smart move! 🛡️",
  },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const motivationAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const totalSteps = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentStep];
  const progress = (currentStep / totalSteps);

  // Animate progress bar on step change
  const animateProgress = (toValue: number) => {
    Animated.spring(progressAnim, {
      toValue,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const handleOptionSelect = (value: string) => {
    setSelectedOption(value);

    // Flash motivation text in
    Animated.sequence([
      Animated.timing(motivationAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleNext = async () => {
    if (!selectedOption) return;

    const newAnswers = { ...answers, [currentQuestion.id]: selectedOption };
    setAnswers(newAnswers);

    if (currentStep < totalSteps - 1) {
      // Animate slide out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentStep(currentStep + 1);
        setSelectedOption(null);
        motivationAnim.setValue(0);
        slideAnim.setValue(30);

        // Animate slide in
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();

        animateProgress((currentStep + 1) / totalSteps);
      });
    } else {
      // All done — save profile and navigate to main app
      await AsyncStorage.setItem('@etflens_profile', JSON.stringify(newAnswers));
      await AsyncStorage.setItem('@etflens_onboarding_done', 'true');
      router.replace('/(tabs)');
    }
  };

  const s = styles(C, isDark);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.appName}>🔭 ETFLens</Text>
          <Text style={s.headerSub}>Your Millionaire Journey Starts Here</Text>
        </View>

        {/* ── Progress Bar ───────────────────────── */}
        <View style={s.progressContainer}>
          <View style={s.progressTrack}>
            <Animated.View
              style={[
                s.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={s.progressText}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>

        {/* ── Question Card ──────────────────────── */}
        <Animated.View
          style={[
            s.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={s.questionEmoji}>{currentQuestion.emoji}</Text>
          <Text style={s.questionText}>{currentQuestion.question}</Text>
          <Text style={s.questionSub}>{currentQuestion.subtext}</Text>

          {/* ── Options ─────────────────────────── */}
          <View style={s.optionsGrid}>
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.optionBtn, isSelected && s.optionBtnSelected]}
                  onPress={() => handleOptionSelect(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={s.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[s.optionLabel, isSelected && s.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Motivation Text ─────────────────── */}
          {selectedOption && (
            <Animated.View style={[s.motivationBox, { opacity: motivationAnim }]}>
              <Text style={s.motivationText}>{currentQuestion.motivation}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ── Next Button ────────────────────────── */}
        <TouchableOpacity
          style={[s.nextBtn, !selectedOption && s.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!selectedOption}
          activeOpacity={0.85}
        >
          <Text style={[s.nextBtnText, !selectedOption && s.nextBtnTextDisabled]}>
            {currentStep === totalSteps - 1 ? "Let's Go! 🚀" : "Next →"}
          </Text>
        </TouchableOpacity>

        {/* ── Footer Quote ───────────────────────── */}
        <Text style={s.footerQuote}>
          "The best time to invest was yesterday. The second best time is now." 💡
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = (C: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: C.background,
    },
    scroll: {
      padding: Spacing.md,
      paddingBottom: Spacing['3xl'],
    },

    // Header
    header: {
      alignItems: 'center',
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    appName: {
      fontFamily: Typography.fontFamily.heading,
      fontSize: Typography.size['2xl'],
      color: C.textPrimary,
      letterSpacing: 0.5,
    },
    headerSub: {
      fontFamily: Typography.fontFamily.body,
      fontSize: Typography.size.sm,
      color: C.green,
      marginTop: 4,
      letterSpacing: 0.3,
    },

    // Progress
    progressContainer: {
      marginBottom: Spacing.lg,
    },
    progressTrack: {
      height: 6,
      backgroundColor: isDark ? C.surfaceElevated : C.border,
      borderRadius: Radius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: C.green,
      borderRadius: Radius.full,
    },
    progressText: {
      fontFamily: Typography.fontFamily.bodyMedium,
      fontSize: Typography.size.xs,
      color: C.textSecondary,
      textAlign: 'right',
      marginTop: 6,
    },

    // Question Card
    card: {
      backgroundColor: C.surface,
      borderRadius: Radius['2xl'],
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: C.border,
      ...(isDark && {
        shadowColor: C.green,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      }),
      ...(!isDark && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
      }),
    },
    questionEmoji: {
      fontSize: 40,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    questionText: {
      fontFamily: Typography.fontFamily.headingSemi,
      fontSize: Typography.size.xl,
      color: C.textPrimary,
      textAlign: 'center',
      marginBottom: Spacing.xs,
      lineHeight: Typography.size.xl * Typography.lineHeight.tight,
    },
    questionSub: {
      fontFamily: Typography.fontFamily.body,
      fontSize: Typography.size.sm,
      color: C.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
      lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
    },

    // Options Grid (2x2)
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    optionBtn: {
      width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.lg * 2 - Spacing.sm) / 2,
      backgroundColor: isDark ? C.surfaceElevated : C.background,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: C.border,
      position: 'relative',
    },
    optionBtnSelected: {
      borderColor: C.green,
      backgroundColor: C.greenGlow,
    },
    optionEmoji: {
      fontSize: 28,
      marginBottom: 6,
    },
    optionLabel: {
      fontFamily: Typography.fontFamily.bodyMedium,
      fontSize: Typography.size.sm,
      color: C.textSecondary,
      textAlign: 'center',
    },
    optionLabelSelected: {
      color: C.green,
      fontFamily: Typography.fontFamily.bodySemiBold,
    },
    checkmark: {
      position: 'absolute',
      top: 8,
      right: 10,
      color: C.green,
      fontSize: 14,
      fontFamily: Typography.fontFamily.bodySemiBold,
    },

    // Motivation
    motivationBox: {
      marginTop: Spacing.md,
      padding: Spacing.sm,
      backgroundColor: C.greenGlow,
      borderRadius: Radius.md,
      borderLeftWidth: 3,
      borderLeftColor: C.green,
    },
    motivationText: {
      fontFamily: Typography.fontFamily.body,
      fontSize: Typography.size.sm,
      color: C.green,
      lineHeight: Typography.size.sm * Typography.lineHeight.relaxed,
      fontStyle: 'italic',
    },

    // Next Button
    nextBtn: {
      backgroundColor: C.green,
      borderRadius: Radius.full,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginBottom: Spacing.md,
      shadowColor: C.green,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    nextBtnDisabled: {
      backgroundColor: isDark ? C.surfaceElevated : C.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    nextBtnText: {
      fontFamily: Typography.fontFamily.headingSemi,
      fontSize: Typography.size.md,
      color: '#0A0E1A',
      letterSpacing: 0.3,
    },
    nextBtnTextDisabled: {
      color: C.textMuted,
    },

    // Footer
    footerQuote: {
      fontFamily: Typography.fontFamily.body,
      fontSize: Typography.size.xs,
      color: C.textMuted,
      textAlign: 'center',
      paddingHorizontal: Spacing.lg,
      fontStyle: 'italic',
      lineHeight: Typography.size.xs * Typography.lineHeight.relaxed,
    },
  });
