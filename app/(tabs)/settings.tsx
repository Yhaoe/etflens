/**
 * ETFLens — Settings Screen
 * API Key Vault replacing individual key fields.
 * All encrypted on-device via expo-secure-store
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Alert, Platform, Switch, Modal
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors, ThemeColors } from '@/constants/Colors';
import { Typography, Spacing, Radius } from '@/constants/Typography';

const VAULT_META_KEY = '@etflens_vault_meta';

export const PROVIDERS = [
  { id: 'FINNHUB', name: 'Finnhub', emoji: '📡', color: '#3B82F6' },
  { id: 'GROK', name: 'Grok', emoji: '🤖', color: '#A855F7' },
  { id: 'GEMINI', name: 'Gemini', emoji: '✨', color: '#00E676' },
  { id: 'CLAUDE', name: 'Claude', emoji: '🧡', color: '#F97316' },
  { id: 'YAHOO', name: 'Yahoo Finance', emoji: '📈', color: '#60A5FA' },
];

interface VaultKey {
  id: string;
  name: string;
  provider: string;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme ?? 'dark'];
  const isDark = colorScheme === 'dark';
  const s = styles(C, isDark);

  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const [pulseAlerts, setPulseAlerts] = useState(true);

  // Vault State
  const [vault, setVault] = useState<VaultKey[]>([]);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0].id);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkNotifStatus();
    loadVault();
  }, []);

  const checkNotifStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifsEnabled(status === 'granted');
  };

  const toggleNotifs = async () => {
    if (!notifsEnabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in settings to receive Oracle alerts.');
        return;
      }
    }
    setNotifsEnabled(!notifsEnabled);
  };

  const loadVault = async () => {
    const raw = await AsyncStorage.getItem(VAULT_META_KEY);
    if (raw) setVault(JSON.parse(raw));
  };

  const saveToVault = async () => {
    if (!newName.trim() || !newKey.trim()) {
      Alert.alert('Missing Info', 'Please provide both a custom name and the API key.');
      return;
    }
    const id = Date.now().toString();
    const newEntry: VaultKey = { id, name: newName.trim(), provider: selectedProvider };
    
    try {
      // Save secret to SecureStore
      await SecureStore.setItemAsync(`etflens_vault_${id}`, newKey.trim());
      // Save metadata to AsyncStorage
      const updatedVault = [...vault, newEntry];
      await AsyncStorage.setItem(VAULT_META_KEY, JSON.stringify(updatedVault));
      
      setVault(updatedVault);
      setNewName('');
      setNewKey('');
      Alert.alert('✅ Saved to Vault', 'Your key is securely encrypted and saved.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save key securely.');
    }
  };

  const deleteFromVault = (id: string, name: string) => {
    Alert.alert('Delete Key', `Are you sure you want to permanently delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await SecureStore.deleteItemAsync(`etflens_vault_${id}`);
        const updated = vault.filter(v => v.id !== id);
        await AsyncStorage.setItem(VAULT_META_KEY, JSON.stringify(updated));
        setVault(updated);
      }}
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>⚙️ Settings</Text>
          <Text style={s.sub}>Customize your ETFLens experience</Text>
        </View>

        {/* Security notice */}
        <View style={[s.secBanner, {backgroundColor: isDark ? 'rgba(0,230,118,0.06)':'#F0FFF7', borderColor:C.green}]}>
          <Text style={{fontSize:22}}>🛡️</Text>
          <View style={{flex:1}}>
            <Text style={[s.secTitle, {color:C.green}]}>Hardware-Level Security Active</Text>
            <Text style={[s.secText, {color:C.textSecondary}]}>
              Your keys are encrypted using **AES-256-GCM** via your phone's Secure Enclave/Keystore.
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[s.auditBox, { backgroundColor: isDark ? C.surface : '#fff', borderColor: C.border }]}
          onPress={() => Alert.alert(
            "🔒 Security Transparency",
            "1. LOCAL ONLY: Your keys never leave this device except when sent directly to AI providers.\n\n2. ENCRYPTED: We use hardware-backed storage.\n\n3. NO SERVER: ETFLens has no backend server."
          )}
        >
          <Text style={{ fontSize: 18 }}>🔍</Text>
          <Text style={{ fontSize: 12, color: C.textPrimary, fontFamily: Typography.fontFamily.bodyMedium }}>View Technical Security Audit</Text>
        </TouchableOpacity>

        {/* ── API KEY VAULT ─────────────────────────────── */}
        <Text style={[s.groupLabel, {color:C.textSecondary}]}>API KEY VAULT</Text>
        <View style={[s.sectionCard, {backgroundColor:C.surface, borderColor:C.border}]}>
          <Text style={[s.cardTitle, {color:C.textPrimary, marginBottom: Spacing.sm}]}>Add New Key</Text>
          
          <TextInput
            style={[s.input, {color:C.textPrimary, borderColor:C.border, backgroundColor: isDark ? C.surfaceElevated : '#F4F6FA'}]}
            placeholder="Custom Name (e.g. My Premium Finnhub)"
            placeholderTextColor={C.textMuted}
            value={newName}
            onChangeText={setNewName}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: Spacing.sm}}>
            {PROVIDERS.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.providerBtn, selectedProvider === p.id ? {borderColor: p.color, backgroundColor: p.color + '1A'} : {borderColor: C.border}]}
                onPress={() => setSelectedProvider(p.id)}
              >
                <Text style={{fontSize: 16, marginRight: 4}}>{p.emoji}</Text>
                <Text style={{fontFamily: Typography.fontFamily.bodyMedium, fontSize: 12, color: selectedProvider === p.id ? p.color : C.textSecondary}}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={[s.input, {color:C.textPrimary, borderColor:C.border, backgroundColor: isDark ? C.surfaceElevated : '#F4F6FA'}]}
            placeholder="Paste API Key here..."
            placeholderTextColor={C.textMuted}
            value={newKey}
            onChangeText={setNewKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity style={[s.saveVaultBtn, {backgroundColor:C.blue}]} onPress={saveToVault}>
            <Text style={{fontFamily: Typography.fontFamily.headingSemi, color:'#fff'}}>Save to Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{alignItems: 'center', marginTop: Spacing.md}} onPress={() => setShowInstructions(true)}>
            <Text style={{color: C.gold, fontFamily: Typography.fontFamily.bodyMedium, fontSize: 12, textDecorationLine: 'underline'}}>
              How does the API Vault work?
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vault List */}
        {vault.length > 0 && (
          <View style={[s.sectionCard, {backgroundColor:C.surface, borderColor:C.border}]}>
            <Text style={[s.cardTitle, {color:C.textPrimary, marginBottom: Spacing.sm}]}>Your Saved Keys</Text>
            {vault.map(v => {
              const p = PROVIDERS.find(x => x.id === v.provider);
              return (
                <View key={v.id} style={[s.vaultRow, {borderColor: C.border, backgroundColor: isDark ? C.surfaceElevated : '#F4F6FA'}]}>
                  <Text style={{fontSize: 20}}>{p?.emoji || '🔑'}</Text>
                  <View style={{flex:1, marginLeft: Spacing.sm}}>
                    <Text style={{fontFamily: Typography.fontFamily.headingSemi, color: C.textPrimary, fontSize: 14}}>{v.name}</Text>
                    <Text style={{fontFamily: Typography.fontFamily.body, color: C.textSecondary, fontSize: 10}}>{p?.name || 'Unknown'} Key</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteFromVault(v.id, v.name)} style={{padding: 8}}>
                    <Text style={{fontSize: 16}}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Notifications */}
        <Text style={[s.groupLabel, {color:C.textSecondary, marginTop: Spacing.lg}]}>SMART ALERTS</Text>
        <View style={[s.sectionCard, {backgroundColor:C.surface, borderColor:C.border}]}>
          <View style={s.settingRow}>
            <View style={{flex:1}}>
              <Text style={[s.cardTitle, {color:C.textPrimary}]}>Push Notifications</Text>
              <Text style={[s.cardSub, {color:C.textSecondary}]}>Master switch for all alerts</Text>
            </View>
            <Switch value={notifsEnabled} onValueChange={toggleNotifs} />
          </View>
          
          <View style={[s.settingRow, {marginTop:16, borderTopWidth:1, borderTopColor:C.border, paddingTop:16, opacity: notifsEnabled ? 1 : 0.5}]}>
            <View style={{flex:1}}>
              <Text style={[s.cardTitle, {color:C.textPrimary}]}>Market Pulse Alerts</Text>
              <Text style={[s.cardSub, {color:C.textSecondary}]}>Alert when ETF hits "BUY" or "HOT" zones</Text>
            </View>
            <Switch value={pulseAlerts} onValueChange={setPulseAlerts} disabled={!notifsEnabled} />
          </View>
        </View>

        {/* Profile */}
        <Text style={[s.groupLabel, {color:C.textSecondary}]}>PROFILE</Text>
        <TouchableOpacity style={[s.profileBtn, {backgroundColor:C.surface, borderColor:C.border}]}
          onPress={() => router.push('/auth')}>
          <Text style={{fontSize:24}}>👤</Text>
          <View style={{flex:1}}>
            <Text style={[s.cardTitle, {color:C.textPrimary}]}>Account & Sync</Text>
            <Text style={[s.cardSub, {color:C.textSecondary}]}>Sign Up · Login · Bind Social Accounts</Text>
          </View>
          <Text style={{color:C.textMuted, fontSize:22}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.profileBtn, {backgroundColor:C.surface, borderColor:C.border}]}
          onPress={() => router.push('/onboarding')}>
          <Text style={{fontSize:24}}>🎯</Text>
          <View style={{flex:1}}>
            <Text style={[s.cardTitle, {color:C.textPrimary}]}>Edit Investor Profile</Text>
            <Text style={[s.cardSub, {color:C.textSecondary}]}>Goals · Risk · Currency · Market focus</Text>
          </View>
          <Text style={{color:C.textMuted, fontSize:22}}>›</Text>
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={[s.footerTxt, {color:C.textMuted}]}>ETFLens v1.0.0 · ETF Portfolio Tracker</Text>
          <Text style={[s.footerTxt, {color:C.textMuted}]}>All data stored locally. Never shared.</Text>
        </View>
      </ScrollView>

      {/* ── INSTRUCTIONS MODAL ───────────────────────── */}
      <Modal visible={showInstructions} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, {backgroundColor: isDark ? 'rgba(20,24,39,0.95)' : 'rgba(255,255,255,0.95)'}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontFamily: Typography.fontFamily.heading, fontSize: 22, color: C.textPrimary}}>Vault Instructions</Text>
              <TouchableOpacity onPress={() => setShowInstructions(false)}><Text style={{fontSize: 24, color: C.textMuted}}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.modalSection}>
                <Text style={[s.modalHeading, {color: C.blue}]}>1. How to use</Text>
                <Text style={[s.modalBody, {color: C.textSecondary}]}>
                  Give your key any Custom Name (e.g., "My Finnhub"). Select the matching Provider from the scrolling list (e.g., 📡 Finnhub). Paste your secret key and tap Save. The app will automatically use the correct key when needed.
                </Text>
              </View>

              <View style={s.modalSection}>
                <Text style={[s.modalHeading, {color: C.gold}]}>2. How to edit</Text>
                <Text style={[s.modalBody, {color: C.textSecondary}]}>
                  For security reasons, actual API keys are permanently hidden once saved. To "edit" a key, simply tap the 🗑️ Trash icon to delete it, and add a new one.
                </Text>
              </View>

              <View style={s.modalSection}>
                <Text style={[s.modalHeading, {color: C.green}]}>3. How it works</Text>
                <Text style={[s.modalBody, {color: C.textSecondary}]}>
                  Your secret keys are encrypted using military-grade AES-256-GCM. They are stored in your phone's hardware Secure Enclave. Only the Custom Name and Provider are stored in visible metadata. Your keys NEVER touch our servers.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={{backgroundColor: C.blue, padding: 14, borderRadius: Radius.full, alignItems: 'center', marginTop: 10}}
              onPress={() => setShowInstructions(false)}
            >
              <Text style={{color: '#fff', fontFamily: Typography.fontFamily.headingSemi}}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = (C: ThemeColors, isDark: boolean) => StyleSheet.create({
  safe:       { flex:1, backgroundColor:C.background },
  scroll:     { flex:1 },
  content:    { padding:Spacing.md, paddingBottom:Spacing['3xl'] },
  header:     { paddingVertical:Spacing.md, marginBottom:Spacing.sm },
  title:      { fontFamily:Typography.fontFamily.heading, fontSize:Typography.size['2xl'], color:C.textPrimary },
  sub:        { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.sm, color:C.textSecondary, marginTop:2 },
  secBanner:  { flexDirection:'row', alignItems:'flex-start', gap:Spacing.sm, borderWidth:1, borderRadius:Radius.lg, padding:Spacing.sm, marginBottom:Spacing.lg },
  secTitle:   { fontFamily:Typography.fontFamily.bodySemiBold, fontSize:Typography.size.sm, marginBottom:3 },
  secText:    { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.xs, lineHeight:16 },
  groupLabel: { fontFamily:Typography.fontFamily.bodySemiBold, fontSize:10, letterSpacing:1.2, marginBottom:Spacing.sm, marginTop:Spacing.xs },
  sectionCard:{ borderRadius:Radius.xl, padding:Spacing.md, borderWidth:1, marginBottom:Spacing.md },
  cardTitle:  { fontFamily:Typography.fontFamily.headingSemi, fontSize:Typography.size.md },
  cardSub:    { fontFamily:Typography.fontFamily.body, fontSize:Typography.size.xs },
  
  // Vault
  input: {
    borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontFamily: Typography.fontFamily.body, fontSize: 14, marginBottom: Spacing.sm
  },
  providerBtn: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1, marginRight: 8
  },
  saveVaultBtn: { paddingVertical: 14, borderRadius: Radius.full, alignItems: 'center', marginTop: Spacing.sm },
  vaultRow: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.sm,
    borderWidth: 1, borderRadius: Radius.md, marginBottom: Spacing.sm
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalSection: { marginBottom: Spacing.lg },
  modalHeading: { fontFamily: Typography.fontFamily.headingSemi, fontSize: 16, marginBottom: 4 },
  modalBody:    { fontFamily: Typography.fontFamily.body, fontSize: 13, lineHeight: 20 },

  profileBtn: { flexDirection:'row', alignItems:'center', gap:Spacing.sm, borderRadius:Radius.xl, padding:Spacing.md, borderWidth:1, marginBottom:Spacing.lg },
  footer:     { alignItems:'center', gap:4, paddingTop:Spacing.md },
  footerTxt:  { fontFamily:Typography.fontFamily.body, fontSize:11 },
  auditBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.lg, borderStyle: 'dashed' },
  settingRow: { flexDirection: 'row', alignItems: 'center' },
});
