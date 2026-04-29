import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  SafeAreaView, KeyboardAvoidingView, Platform, Dimensions,
  ImageBackground, Alert
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async () => {
    if (!email || !password || (mode === 'signup' && !name)) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }
    
    try {
      // Save profile info to hardware-backed store
      const profile = { name: mode === 'signup' ? name : 'User', email };
      await SecureStore.setItemAsync('etflens_user_profile', JSON.stringify(profile));
      await SecureStore.setItemAsync('etflens_auth_status', 'logged_in');
      
      Alert.alert('✅ Securely Stored', mode === 'login' ? 'Welcome back! Your session is hardware-encrypted.' : 'Account created & encrypted successfully!');
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Encryption Error', 'Failed to secure your data.');
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: isDark ? '#000' : '#F4F7FF' }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <Text style={[s.logo, { color: C.gold }]}>⚔️</Text>
            <Text style={[s.title, { color: C.textPrimary }]}>
              {mode === 'login' ? 'Welcome to Oracle' : 'Join the Elite'}
            </Text>
            <Text style={[s.sub, { color: C.textSecondary }]}>
              {mode === 'login' ? 'Your quantitative fortress awaits.' : 'Start your science-backed wealth journey.'}
            </Text>
          </View>

          {/* Form */}
          <View style={[s.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: C.border }]}>
            {mode === 'signup' && (
              <View style={s.inputWrap}>
                <Text style={[s.label, { color: C.textMuted }]}>FULL NAME</Text>
                <TextInput 
                  style={[s.input, { color: C.textPrimary, backgroundColor: isDark ? '#111' : '#F9FAFB' }]}
                  placeholder="John Doe"
                  placeholderTextColor={C.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={s.inputWrap}>
              <Text style={[s.label, { color: C.textMuted }]}>EMAIL ADDRESS</Text>
              <TextInput 
                style={[s.input, { color: C.textPrimary, backgroundColor: isDark ? '#111' : '#F9FAFB' }]}
                placeholder="oracle@example.com"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={s.inputWrap}>
              <Text style={[s.label, { color: C.textMuted }]}>PASSWORD</Text>
              <TextInput 
                style={[s.input, { color: C.textPrimary, backgroundColor: isDark ? '#111' : '#F9FAFB' }]}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity style={[s.mainBtn, { backgroundColor: C.gold }]} onPress={handleAuth}>
              <Text style={s.mainBtnTxt}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={[s.toggleTxt, { color: C.textSecondary }]}>
                {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Social Bind Options */}
          <View style={s.socialSection}>
            <View style={s.dividerRow}>
              <View style={[s.line, { backgroundColor: C.border }]} />
              <Text style={[s.dividerTxt, { color: C.textMuted }]}>OR BIND WITH</Text>
              <View style={[s.line, { backgroundColor: C.border }]} />
            </View>

            <View style={s.socialRow}>
              <TouchableOpacity style={[s.socialBtn, { backgroundColor: isDark ? '#111' : '#fff', borderColor: C.border }]}>
                <Text style={s.socialIcon}>📧</Text>
                <Text style={[s.socialLabel, { color: C.textPrimary }]}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.socialBtn, { backgroundColor: isDark ? '#111' : '#fff', borderColor: C.border }]}>
                <Text style={s.socialIcon}>🍎</Text>
                <Text style={[s.socialLabel, { color: C.textPrimary }]}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.guestBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={[s.guestTxt, { color: C.textMuted }]}>Continue as Guest (Local Only)</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 48, marginBottom: 16 },
  title: { fontFamily: Typography.fontFamily.heading, fontSize: 28, textAlign: 'center' },
  sub: { fontFamily: Typography.fontFamily.body, fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.8 },
  card: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1, elevation: 4 },
  inputWrap: { marginBottom: Spacing.md },
  label: { fontSize: 10, fontFamily: Typography.fontFamily.bodyBold, letterSpacing: 1, marginBottom: 8 },
  input: { height: 50, borderRadius: Radius.md, paddingHorizontal: 16, fontFamily: Typography.fontFamily.body },
  mainBtn: { height: 54, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 20 },
  mainBtnTxt: { fontFamily: Typography.fontFamily.bodyBold, color: '#000', fontSize: 16 },
  toggleTxt: { textAlign: 'center', fontSize: 13, fontFamily: Typography.fontFamily.bodyMedium },
  socialSection: { marginTop: 40 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  line: { flex: 1, height: 1 },
  dividerTxt: { fontSize: 10, fontFamily: Typography.fontFamily.bodyBold },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: { flex: 1, height: 50, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  socialIcon: { fontSize: 20 },
  socialLabel: { fontFamily: Typography.fontFamily.bodySemiBold, fontSize: 14 },
  guestBtn: { marginTop: 32, alignSelf: 'center' },
  guestTxt: { fontSize: 12, fontFamily: Typography.fontFamily.bodyMedium, textDecorationLine: 'underline' },
});
