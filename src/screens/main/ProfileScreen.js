// ============================================================
// Profile Screen (Settings, PIN, Categories, Export)
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, selectProfile, setProfile } from '@store/authSlice';
import { selectLanguage, selectTheme, setLanguage, setTheme } from '@store/uiSlice';
import { useAuth } from '@hooks/useAuth';
import { useTranslation } from '@hooks/useTranslation';
import { saveLanguagePreference } from '@services/language';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import { updateThemePreference } from '@services/firebase/users';
import { useAppTheme } from '@hooks/useAppTheme';

const SettingRow = ({ colors, styles, icon, label, subtitle, onPress, rightElement, color }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[styles.settingIcon, { backgroundColor: `${color || colors.primary}20` }]}>
      <Ionicons name={icon} size={20} color={color || colors.primary} />
    </View>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />)}
  </TouchableOpacity>
);

export const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t, language, availableLanguages } = useTranslation();
  const { colors, theme } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const activeLanguage = useSelector(selectLanguage);
  const activeTheme = useSelector(selectTheme);
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: logout },
    ]);
  };

  const handleLanguageChange = () => {
    const nextLanguage = activeLanguage === 'id' ? 'en' : 'id';
    dispatch(setLanguage(nextLanguage));
    saveLanguagePreference(nextLanguage);
  };

  const handleThemeChange = async (enabled) => {
    const nextTheme = enabled ? 'dark' : 'light';
    const previousTheme = activeTheme;

    dispatch(setTheme(nextTheme));
    if (profile) {
      dispatch(setProfile({ ...profile, theme: nextTheme }));
    }

    if (!user?.uid) return;

    const { error } = await updateThemePreference(user.uid, nextTheme);
    if (error) {
      dispatch(setTheme(previousTheme));
      if (profile) {
        dispatch(setProfile({ ...profile, theme: previousTheme }));
      }
      Alert.alert(t('common.error'), error);
    }
  };

  const initials = user?.displayName?.split(' ')
    .map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={colors.gradients.primary} style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLetters}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.displayName || t('profile.fallbackUser')}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            <Text style={styles.memberText}>{t('profile.member')}</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Account Section */}
          <Text style={styles.sectionTitle}>{t('profile.account')}</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              colors={colors}
              styles={styles}
              icon="person-outline"
              label={t('profile.editProfile')}
              subtitle={user?.displayName}
              color={colors.primary}
              onPress={() => {}}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="keypad-outline"
              label={t('profile.changePin')}
              subtitle={t('profile.updateSecurityPin')}
              color={colors.info}
              onPress={() => navigation.navigate('Pin', { mode: 'setup' })}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="finger-print-outline"
              label={t('profile.biometricLogin')}
              subtitle={t('profile.fingerprintFaceId')}
              color={colors.secondary}
              onPress={() => {}}
              rightElement={
                <Switch
                  value={profile?.biometricEnabled || false}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
          </View>

          {/* Preferences */}
          <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              colors={colors}
              styles={styles}
              icon="notifications-outline"
              label={t('profile.pushNotifications')}
              color={colors.warning}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="moon-outline"
              label={t('profile.darkMode')}
              color={colors.primaryLight}
              rightElement={
                <Switch
                  value={theme === 'dark'}
                  onValueChange={handleThemeChange}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="language-outline"
              label={t('profile.language')}
              subtitle={t('profile.currentLanguage', { language: availableLanguages[language] })}
              color={colors.info}
              onPress={handleLanguageChange}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="flag-outline"
              label={t('profile.currency')}
              subtitle={t('profile.currencyValue')}
              color={colors.income}
              onPress={() => {}}
            />
          </View>

          {/* Data Section */}
          <Text style={styles.sectionTitle}>{t('profile.dataPrivacy')}</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              colors={colors}
              styles={styles}
              icon="people-outline"
              label={t('profile.household')}
              subtitle={profile?.householdRole === 'partner' ? t('profile.householdConnected') : t('profile.householdInvite')}
              color={colors.primary}
              onPress={() => navigation.navigate('Household')}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="folder-outline"
              label={t('profile.categories')}
              subtitle={t('profile.manageCategories')}
              color={colors.info}
              onPress={() => navigation.navigate('Categories')}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="scan-outline"
              label={t('profile.scanReceipt')}
              subtitle={t('profile.receiptScanner')}
              color={colors.secondary}
              onPress={() => navigation.navigate('ScanReceipt')}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="cloud-upload-outline"
              label={t('profile.backupSync')}
              subtitle={t('profile.lastSynced', { time: t('common.justNow') })}
              color={colors.primary}
              onPress={() => {}}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="download-outline"
              label={t('profile.exportData')}
              subtitle={t('profile.csvPdf')}
              color={colors.warning}
              onPress={() => navigation.navigate('Reports')}
            />
          </View>

          <Text style={styles.sectionTitle}>{t('profile.about')}</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutIconWrap}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.aboutText}>{t('profile.dedication')}</Text>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.expense} />
            <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
          </TouchableOpacity>

          <Text style={styles.version}>WP App v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: SPACING.md,
  },
  avatarLetters: { color: '#FFF', fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  name: { color: '#FFF', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  email: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.sm, marginTop: 4 },
  memberBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6,
    marginTop: SPACING.sm,
  },
  memberText: { color: '#FFF', fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.medium },
  content: { padding: SPACING.lg },
  sectionTitle: {
    color: colors.textMuted, fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: SPACING.sm, marginTop: SPACING.md,
  },
  settingsCard: {
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...SHADOWS.sm,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 38, height: 38, borderRadius: BORDER_RADIUS.md,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  settingInfo: { flex: 1 },
  settingLabel: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  settingSubtitle: { color: colors.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  aboutCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  aboutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}18`,
    marginBottom: SPACING.sm,
  },
  aboutText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    lineHeight: 22,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: `${colors.expense}15`,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginTop: SPACING.xl,
    borderWidth: 1, borderColor: `${colors.expense}30`,
  },
  logoutText: { color: colors.expense, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  version: {
    color: colors.textMuted, fontSize: FONT_SIZE.xs,
    textAlign: 'center', marginTop: SPACING.lg, marginBottom: SPACING.xl,
  },
});

export default ProfileScreen;
