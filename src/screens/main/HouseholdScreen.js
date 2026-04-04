// ============================================================
// Household Screen
// ============================================================
import React, { useState } from 'react';
import {
  Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { selectProfile, selectUser, setProfile } from '@store/authSlice';
import { useAppTheme } from '@hooks/useAppTheme';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SHADOWS, SPACING } from '@constants/theme';
import { getUserProfileByShareCode, joinSharedHousehold } from '@services/firebase/users';
import { registerForPushNotifications } from '@services/firebase/notifications';

export const HouseholdScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isOwner = (profile?.householdRole || 'owner') === 'owner';
  const shareCode = profile?.shareCode || '-';

  const handleJoin = async () => {
    if (!user?.uid) return;
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Masukkan kode pasangan terlebih dahulu.');
      return;
    }
    if (joinCode.trim().toUpperCase() === shareCode) {
      Alert.alert('Error', 'Anda tidak bisa memakai kode akun sendiri.');
      return;
    }

    setLoading(true);
    const { profile: ownerProfile, error: findError } = await getUserProfileByShareCode(joinCode);
    if (findError || !ownerProfile) {
      setLoading(false);
      Alert.alert('Error', findError || 'Kode pasangan tidak ditemukan.');
      return;
    }

    const { profileUpdates, error } = await joinSharedHousehold({
      userId: user.uid,
      ownerProfile,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    dispatch(setProfile({
      ...profile,
      ...profileUpdates,
    }));

    // Pastikan token push tersimpan juga setelah akun berhasil dipasangkan
    await registerForPushNotifications(user.uid);

    setJoinCode('');
    Alert.alert('Berhasil', 'Akun berhasil terhubung ke pengeluaran bersama.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Akun Bersama</Text>
        <View style={styles.backBtn} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Pengeluaran Suami Istri</Text>
          <Text style={styles.heroSubtitle}>
            Hubungkan akun pasangan agar transaksi yang ditambahkan istri langsung masuk ke dompet keluarga yang sama.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Kode Pasangan Anda</Text>
          <Text style={styles.codeValue} selectable>{shareCode}</Text>
          <Text style={styles.sectionHint}>
            Bagikan kode ini ke istri Anda. Setelah ia memasukkan kode ini, transaksi kalian akan masuk ke rumah tangga yang sama.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status Rumah Tangga</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Peran</Text>
            <Text style={styles.statusValue}>{isOwner ? 'Owner' : 'Partner'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Nama Rumah Tangga</Text>
            <Text style={styles.statusValue}>{profile?.householdName || profile?.displayName || '-'}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Household ID</Text>
            <Text style={styles.statusValue}>{profile?.householdId || user?.uid || '-'}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gabung dengan Kode Pasangan</Text>
          <Input
            label="Kode pasangan"
            value={joinCode}
            onChangeText={setJoinCode}
            placeholder="Contoh: A1B2C3"
            autoCapitalize="characters"
            icon="people-outline"
          />
          <Button
            title="Hubungkan Akun"
            onPress={handleJoin}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
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
    fontWeight: FONT_WEIGHT.bold,
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
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
    marginBottom: SPACING.sm,
  },
  codeValue: {
    color: colors.primary,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.extrabold,
    fontFamily: FONT_FAMILY.extrabold,
    letterSpacing: 3,
    marginBottom: SPACING.sm,
  },
  sectionHint: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  statusValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
    maxWidth: '58%',
    textAlign: 'right',
  },
});

export default HouseholdScreen;
