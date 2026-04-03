// ============================================================
// Assets Screen
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import { addAssetLocal, removeAssetLocal, selectAssets, selectAssetsLoading } from '@store/assetSlice';
import { addAsset, removeAsset } from '@services/firebase/assets';
import { sendHouseholdNotification } from '@services/firebase/notifications';
import { selectProfile, selectUser } from '@store/authSlice';
import LoadingState from '@components/common/LoadingState';
import { formatRupiahInput, parseAmount } from '@utils/formatters';

const ASSET_TYPES = ['gold', 'cash', 'property', 'vehicle', 'crypto', 'other'];

const formatMoney = (value, language) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);

export const AssetsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const assets = useSelector(selectAssets);
  const assetsLoading = useSelector(selectAssetsLoading);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);
  const accountId = profile?.householdId || user?.uid;
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'gold',
    unit: 'gram',
    quantity: '',
    buyPrice: '',
    currentPrice: '',
    notes: '',
  });

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const assetRows = useMemo(() => assets.map((asset) => {
    const qty = Number(asset.quantity) || 0;
    const buyPrice = Number(asset.buyPrice) || 0;
    const currentPrice = Number(asset.currentPrice) || 0;
    const cost = qty * buyPrice;
    const value = qty * currentPrice;
    const profit = value - cost;
    const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
    return { ...asset, qty, buyPrice, currentPrice, cost, value, profit, profitPct };
  }), [assets]);

  const totalValue = assetRows.reduce((sum, item) => sum + item.value, 0);
  const totalCost = assetRows.reduce((sum, item) => sum + item.cost, 0);
  const totalProfit = totalValue - totalCost;

  if (assetsLoading && assets.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('assets.title')}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </LinearGradient>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const handleAdd = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common.error'), t('assets.nameRequired'));
      return;
    }
    if (!form.quantity || !form.buyPrice || !form.currentPrice) {
      Alert.alert(t('common.error'), t('assets.fillAllFields'));
      return;
    }

    const assetPayload = {
      ...form,
      quantity: Number(form.quantity),
      buyPrice: parseAmount(form.buyPrice),
      currentPrice: parseAmount(form.currentPrice),
    };

    dispatch(addAssetLocal(assetPayload));
    if (user?.uid) {
      const { id, error } = await addAsset(user.uid, assetPayload);
      if (error) {
        Alert.alert(t('common.error'), error);
      } else {
        try {
          await sendHouseholdNotification(accountId, user.uid, {
            title: t('assetNotification.householdAddedTitle', {
              name: user.displayName || t('profile.fallbackUser'),
            }),
            body: t('assetNotification.householdAddedBody', {
              asset: assetPayload.name,
              amount: formatMoney(assetPayload.currentPrice * assetPayload.quantity, language),
            }),
            data: {
              type: 'household_asset',
              action: 'added',
              assetId: id,
            },
          });
        } catch (sideEffectError) {
          console.warn('Asset household notification failed:', sideEffectError);
        }
      }
    }
    setForm({ name: '', type: 'gold', unit: 'gram', quantity: '', buyPrice: '', currentPrice: '', notes: '' });
    setShowAddModal(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('assets.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{t('assets.portfolioValue')}</Text>
          <Text style={styles.summaryValue}>{formatMoney(totalValue, language)}</Text>
          <Text style={styles.summarySub}>{t('assets.totalGain', { amount: formatMoney(totalProfit, language) })}</Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t('assets.myAssets')}</Text>
        </View>

        {assetRows.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💼</Text>
            <Text style={styles.emptyText}>{t('assets.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('assets.emptySubtitle')}</Text>
          </View>
        ) : (
          <FlatList
            data={assetRows}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.assetCard}>
                <View style={styles.assetTop}>
                  <View>
                    <Text style={styles.assetName}>{item.name}</Text>
                    <Text style={styles.assetMeta}>{t(`assets.types.${item.type}`)} · {item.qty} {item.unit}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      dispatch(removeAssetLocal(item.id));
                      const { error } = await removeAsset(item.id);
                      if (error) {
                        Alert.alert(t('common.error'), error);
                      } else {
                        try {
                          await sendHouseholdNotification(accountId, user.uid, {
                            title: t('assetNotification.householdDeletedTitle', {
                              name: user.displayName || t('profile.fallbackUser'),
                            }),
                            body: t('assetNotification.householdDeletedBody', {
                              asset: item.name,
                            }),
                            data: {
                              type: 'household_asset',
                              action: 'deleted',
                              assetId: item.id,
                            },
                          });
                        } catch (sideEffectError) {
                          console.warn('Asset delete household notification failed:', sideEffectError);
                        }
                      }
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.expense} />
                  </TouchableOpacity>
                </View>
                <View style={styles.assetMetrics}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>{t('assets.buyPrice')}</Text>
                    <Text style={styles.metricValue}>{formatMoney(item.buyPrice, language)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>{t('assets.currentPrice')}</Text>
                    <Text style={styles.metricValue}>{formatMoney(item.currentPrice, language)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>{t('assets.profit')}</Text>
                    <Text style={[styles.metricValue, { color: item.profit >= 0 ? colors.income : colors.expense }]}>
                      {formatMoney(item.profit, language)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
            />
          )}
          <View style={{height:20}}></View>
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('assets.addAsset')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>{t('assets.assetName')}</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={setField('name')} placeholder={t('assets.assetNamePlaceholder')} placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>{t('assets.assetType')}</Text>
              <View style={styles.chipRow}>
                {ASSET_TYPES.map((type) => (
                  <TouchableOpacity key={type} style={[styles.chip, form.type === type && styles.chipActive]} onPress={() => setField('type')(type)}>
                    <Text style={[styles.chipText, form.type === type && styles.chipTextActive]}>{t(`assets.types.${type}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.fieldLabel}>{t('assets.unit')}</Text>
              <TextInput style={styles.input} value={form.unit} onChangeText={setField('unit')} placeholder="gram / pcs / unit" placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>{t('assets.quantity')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.quantity} onChangeText={setField('quantity')} placeholder="0" placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>{t('assets.buyPrice')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.buyPrice} onChangeText={(value) => setField('buyPrice')(formatRupiahInput(value))} placeholder="1.000.000" placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>{t('assets.currentPrice')}</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={form.currentPrice} onChangeText={(value) => setField('currentPrice')(formatRupiahInput(value))} placeholder="1.000.000" placeholderTextColor={colors.textMuted} />
              <Text style={styles.fieldLabel}>{t('assets.notes')}</Text>
              <TextInput style={[styles.input, styles.textArea]} multiline value={form.notes} onChangeText={setField('notes')} placeholder={t('assets.notesPlaceholder')} placeholderTextColor={colors.textMuted} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20` },
  container: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  summaryCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: colors.border, ...SHADOWS.sm },
  summaryLabel: { color: colors.textMuted, fontFamily: FONT_FAMILY.regular },
  summaryValue: { color: colors.textPrimary, fontFamily: FONT_FAMILY.extrabold, fontSize: FONT_SIZE.xxl, marginTop: 6 },
  summarySub: { color: colors.income, marginTop: 4, fontFamily: FONT_FAMILY.regular},
  sectionTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold, marginBottom: SPACING.sm },
  sectionRow: { marginTop: SPACING.xs, marginBottom: SPACING.sm },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyIcon: { fontSize: 44, marginBottom: SPACING.sm },
  emptyText: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold },
  emptySub: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, textAlign: 'center', marginTop: 4 },
  assetCard: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: colors.border, marginBottom: SPACING.sm },
  assetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assetName: { color: colors.textPrimary, fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.md },
  assetMeta: { color: colors.textMuted, fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.xs, marginTop: 2 },
  assetMetrics: { flexDirection: 'row', gap: 8, marginTop: SPACING.md },
  metricBox: { flex: 1, backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  metricLabel: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  metricValue: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: BORDER_RADIUS.xl, borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold },
  fieldLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.medium, marginTop: SPACING.sm, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: BORDER_RADIUS.md, color: colors.textPrimary, paddingHorizontal: SPACING.md, paddingVertical: 12, fontFamily: FONT_FAMILY.regular },
  textArea: { minHeight: 88, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  chipText: { color: colors.textSecondary, fontFamily: FONT_FAMILY.medium, fontSize: FONT_SIZE.xs },
  chipTextActive: { color: colors.primary },
  helper: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 6 },
  saveBtn: { marginTop: SPACING.lg, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.md },
});

export default AssetsScreen;
