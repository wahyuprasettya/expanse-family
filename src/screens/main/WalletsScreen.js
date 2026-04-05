// ============================================================
// Wallets Screen
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import {
  removeWalletLocal,
  selectTotalWalletBalance,
  selectWallets,
  selectWalletsLoading,
  updateWalletLocal,
} from '@store/walletSlice';
import { selectTransactions } from '@store/transactionSlice';
import {
  addWallet,
  deleteWallet,
  updateWallet,
} from '@services/firebase/wallets';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import LoadingState from '@components/common/LoadingState';
import { BORDER_RADIUS, FONT_SIZE, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency, formatRupiahInput, parseAmount } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

const createInitialWalletForm = () => ({
  name: '',
  balance: '',
});

export const WalletsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const { colors } = useAppTheme();
  const styles = createStyles(colors, { isCompact, isNarrow, bottomInset: insets.bottom });
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const wallets = useSelector(selectWallets);
  const walletsLoading = useSelector(selectWalletsLoading);
  const totalWalletBalance = useSelector(selectTotalWalletBalance);
  const transactions = useSelector(selectTransactions);
  const accountId = profile?.householdId || user?.uid;
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(createInitialWalletForm);
  const [editingWallet, setEditingWallet] = useState(null);
  const [loading, setLoading] = useState(false);

  const walletStats = useMemo(() => {
    const counts = transactions.reduce((accumulator, transaction) => {
      const walletIds = transaction.type === 'transfer'
        ? [
            transaction.transferMeta?.sourceWalletId || transaction.walletId,
            transaction.transferMeta?.destinationWalletId,
          ].filter(Boolean)
        : [transaction.walletId].filter(Boolean);

      walletIds.forEach((walletId) => {
        accumulator[walletId] = (accumulator[walletId] || 0) + 1;
      });
      return accumulator;
    }, {});

    return wallets.map((wallet) => ({
      ...wallet,
      transactionCount: counts[wallet.id] || 0,
    }));
  }, [transactions, wallets]);

  const resetForm = () => {
    setForm(createInitialWalletForm());
    setEditingWallet(null);
    setShowModal(false);
  };

  const openAddModal = () => {
    setForm(createInitialWalletForm());
    setEditingWallet(null);
    setShowModal(true);
  };

  const openEditModal = (wallet) => {
    setEditingWallet(wallet);
    setForm({
      name: wallet.name || '',
      balance: formatRupiahInput(String(wallet.balance || '')),
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common.error'), t('wallets.nameRequired'));
      return;
    }

    if (!form.balance || parseAmount(form.balance) <= 0) {
      Alert.alert(t('common.error'), t('wallets.balanceRequired'));
      return;
    }

    const payload = {
      name: form.name.trim(),
      balance: parseAmount(form.balance),
    };

    setLoading(true);
    if (editingWallet) {
      const { error } = await updateWallet(editingWallet.id, payload);
      setLoading(false);
      if (error) {
        Alert.alert(t('common.error'), error);
        return;
      }

      dispatch(updateWalletLocal({
        id: editingWallet.id,
        ...payload,
      }));
      resetForm();
      return;
    }

    const { id, error } = await addWallet(accountId, payload);
    setLoading(false);
    if (error || !id) {
      Alert.alert(t('common.error'), error || t('common.error'));
      return;
    }

    resetForm();
  };

  const handleDelete = (wallet) => {
    Alert.alert(t('wallets.deleteTitle'), t('wallets.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteWallet(wallet.id);
          if (error) {
            Alert.alert(t('common.error'), error);
            return;
          }
          dispatch(removeWalletLocal(wallet.id));
        },
      },
    ]);
  };

  if (walletsLoading && wallets.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('wallets.title')}</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </TouchableOpacity>
        </LinearGradient>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('wallets.title')}</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addBtn}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.content}>
        <LinearGradient colors={colors.gradients.primary} style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{t('wallets.subtitle')}</Text>
          <Text style={styles.heroLabel}>{t('wallets.totalBalance')}</Text>
          <Text style={styles.heroValue}>{formatCurrency(totalWalletBalance, 'IDR', language)}</Text>
        </LinearGradient>

        {walletStats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👛</Text>
            <Text style={styles.emptyTitle}>{t('wallets.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('wallets.emptySubtitle')}</Text>
            <Button title={t('wallets.addWallet')} onPress={openAddModal} fullWidth={false} />
          </View>
        ) : (
          <FlatList
            data={walletStats}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            style={styles.listView}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
                <View style={styles.walletCard}>
                  <View style={styles.walletHeader}>
                    <View style={styles.walletAvatar}>
                      <Text style={styles.walletAvatarText}>
                        {(String(item.name || 'W').trim().charAt(0) || 'W').toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.walletMeta} numberOfLines={2}>
                        {t('wallets.txCount', { count: item.transactionCount })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </View>
                  <View style={styles.walletFooter}>
                    <Text style={styles.walletFooterLabel}>{t('wallets.availableBalance')}</Text>
                    <Text
                      style={styles.walletBalance}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.78}
                    >
                      {formatCurrency(item.balance, 'IDR', language)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingWallet ? t('wallets.editWalletTitle') : t('wallets.addWalletTitle')}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label={t('wallets.walletName')}
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder={t('wallets.walletNamePlaceholder')}
              icon="wallet-outline"
            />

            <Input
              label={t('wallets.balance')}
              value={form.balance}
              onChangeText={(value) => setForm((prev) => ({ ...prev, balance: value }))}
              placeholder={t('wallets.balancePlaceholder')}
              keyboardType="numeric"
              formatAsRupiah
              prefix="Rp"
              icon="cash-outline"
            />

            <Button
              title={editingWallet ? t('wallets.updateWallet') : t('wallets.saveWallet')}
              onPress={handleSubmit}
              loading={loading}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, isNarrow, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Math.max(bottomInset, SPACING.md),
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium },
  heroLabel: { color: 'rgba(255,255,255,0.86)', fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold, marginTop: 10 },
  heroValue: {
    color: '#FFF',
    fontSize: isNarrow ? FONT_SIZE.xxl : FONT_SIZE.xxxl,
    fontFamily: FONT_FAMILY.extrabold,
    marginTop: 8,
  },
  listView: {
    flex: 1,
  },
  list: {
    paddingBottom: Math.max(bottomInset + SPACING.xxl, 88),
  },
  walletCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  walletAvatar: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletAvatarText: { color: colors.primary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold },
  walletInfo: { flex: 1, minWidth: 0 },
  walletName: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.semibold },
  walletMeta: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  walletFooter: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  walletFooterLabel: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  walletBalance: {
    color: colors.textPrimary,
    fontSize: isCompact ? FONT_SIZE.lg : FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: { fontSize: 54 },
  emptyTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.sm,
    paddingBottom: Math.max(bottomInset, SPACING.md) + SPACING.lg,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  modalTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold },
});

export default WalletsScreen;
