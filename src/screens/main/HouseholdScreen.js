// ============================================================
// Household Screen
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { selectProfile, selectUser, setProfile } from '@store/authSlice';
import { useAppTheme } from '@hooks/useAppTheme';
import { BORDER_RADIUS, FONT_SIZE, FONT_FAMILY, SHADOWS, SPACING } from '@constants/theme';
import {
  disconnectSharedHousehold,
  getHouseholdMembers,
  getUserProfileByShareCode,
  joinSharedHousehold,
} from '@services/firebase/users';
import { registerForPushNotifications } from '@services/firebase/notifications';
import { useTranslation } from '@hooks/useTranslation';

export const HouseholdScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, { isCompact, isNarrow });
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  const isOwner = (profile?.householdRole || 'owner') === 'owner';
  const isPartner = profile?.householdRole === 'partner';
  const shareCode = profile?.shareCode || '-';
  const otherMembers = members.filter((member) => member.uid !== user?.uid);
  const isSharedConnected = isPartner || otherMembers.length > 0;
  const disconnectActionKey = isPartner
    ? 'householdScreen.disconnectPartnerAction'
    : 'householdScreen.disconnectOwnerAction';
  const disconnectActionLabel = t(disconnectActionKey);
  const resolvedDisconnectActionLabel = disconnectActionLabel === disconnectActionKey
    ? (isPartner ? 'Keluar dari akun bersama' : 'Putuskan koneksi partner')
    : disconnectActionLabel;

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      if (!profile?.householdId) {
        if (!cancelled) setMembers([]);
        return;
      }

      const { members: fetchedMembers } = await getHouseholdMembers(profile.householdId);
      if (!cancelled) {
        setMembers(fetchedMembers);
      }
    };

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [profile?.householdId]);

  const handleJoin = async () => {
    if (!user?.uid) return;
    if (!joinCode.trim()) {
      Alert.alert(t('common.error'), t('householdScreen.errors.codeRequired'));
      return;
    }
    if (joinCode.trim().toUpperCase() === shareCode) {
      Alert.alert(t('common.error'), t('householdScreen.errors.ownCode'));
      return;
    }

    setLoading(true);
    const { profile: ownerProfile, error: findError } = await getUserProfileByShareCode(joinCode);
    if (findError || !ownerProfile) {
      setLoading(false);
      Alert.alert(t('common.error'), findError || t('householdScreen.errors.notFound'));
      return;
    }

    const { profileUpdates, error } = await joinSharedHousehold({
      userId: user.uid,
      ownerProfile,
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }

    dispatch(setProfile({
      ...profile,
      ...profileUpdates,
    }));

    // Pastikan token push tersimpan juga setelah akun berhasil dipasangkan
    await registerForPushNotifications(user.uid);

    setJoinCode('');
    Alert.alert(t('common.success'), t('householdScreen.successConnected'));
  };

  const handleDisconnect = () => {
    if (!user?.uid || !profile?.householdId) return;

    Alert.alert(
      t('householdScreen.disconnectTitle'),
      t(isPartner ? 'householdScreen.disconnectPartnerMessage' : 'householdScreen.disconnectOwnerMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: resolvedDisconnectActionLabel,
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await disconnectSharedHousehold({
              userId: user.uid,
              profile,
            });
            setLoading(false);

            if (result.error) {
              Alert.alert(t('common.error'), result.error);
              return;
            }

            if (result.selfProfileUpdates) {
              dispatch(setProfile({
                ...profile,
                ...result.selfProfileUpdates,
              }));
              setMembers([]);
            } else if (!isPartner) {
              setMembers((previous) => previous.filter((member) => member.uid === user.uid));
            }

            Alert.alert(
              t('common.success'),
              t('householdScreen.disconnectSuccess', {
                members: result.detachedCount,
                transactions: result.movedTransactionCount,
                wallets: result.movedWalletCount,
              })
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('householdScreen.title')}</Text>
        <View style={styles.backBtn} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t('householdScreen.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('householdScreen.heroSubtitle')}
          </Text>
        </View>

        {isOwner ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('householdScreen.yourCode')}</Text>
            <Text style={styles.codeValue} selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{shareCode}</Text>
            <Text style={styles.sectionHint}>
              {t('householdScreen.yourCodeHint')}
            </Text>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('householdScreen.statusTitle')}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('householdScreen.roleLabel')}</Text>
            <Text style={styles.statusValue}>{isOwner ? t('householdScreen.roleOwner') : t('householdScreen.rolePartner')}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('householdScreen.householdNameLabel')}</Text>
            <Text style={styles.statusValue}>{profile?.householdName || profile?.displayName || '-'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t('householdScreen.householdIdLabel')}</Text>
            <Text style={styles.statusValue}>{profile?.householdId || user?.uid || '-'}</Text>
          </View>
        </View>

        {!isSharedConnected ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('householdScreen.joinTitle')}</Text>
            <Input
              label={t('householdScreen.joinCodeLabel')}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder={t('householdScreen.joinCodePlaceholder')}
              autoCapitalize="characters"
              icon="people-outline"
            />
            <Button
              title={t('householdScreen.connectAction')}
              onPress={handleJoin}
              loading={loading}
            />
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('householdScreen.connectedTitle')}</Text>
            <Text style={styles.sectionHint}>
              {t(isPartner ? 'householdScreen.connectedHint' : 'householdScreen.ownerConnectedHint', {
                count: otherMembers.length,
              })}
            </Text>
            {otherMembers.length > 0 ? (
              <View style={styles.memberList}>
                {otherMembers.map((member) => (
                  <View key={member.uid} style={styles.memberChip}>
                    <Ionicons name="person-outline" size={14} color={colors.primary} />
                    <Text style={styles.memberChipText} numberOfLines={1}>{member.displayName}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Button
              title={resolvedDisconnectActionLabel}
              onPress={handleDisconnect}
              loading={loading}
              variant="destructive"
              style={styles.disconnectBtn}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, isNarrow }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    marginBottom: SPACING.sm,
  },
  codeValue: {
    color: colors.primary,
    fontSize: isNarrow ? FONT_SIZE.xxl : FONT_SIZE.xxxl,
    fontFamily: FONT_FAMILY.extrabold,
    letterSpacing: isNarrow ? 1.5 : 3,
    marginBottom: SPACING.sm,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isCompact ? 'flex-start' : 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: isCompact ? 4 : SPACING.sm,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  statusValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    maxWidth: isCompact ? '100%' : '58%',
    textAlign: isCompact ? 'left' : 'right',
    flexShrink: 1,
  },
  memberList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}22`,
    maxWidth: '100%',
  },
  memberChipText: {
    color: colors.primary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    flexShrink: 1,
  },
  disconnectBtn: {
    marginTop: SPACING.md,
  },
});

export default HouseholdScreen;
