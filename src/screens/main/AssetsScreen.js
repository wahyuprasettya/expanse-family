// ============================================================
// Assets Screen
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Alert, FlatList, useWindowDimensions
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
import { fetchGoldPricePerGramInIdr } from '@services/market/gold';

const ASSET_TYPES = ['gold', 'cash', 'property', 'vehicle', 'crypto', 'other'];
const GRAM_UNITS = ['g', 'gr', 'gram', 'grams'];
const ASSET_TYPE_META = {
  gold: { icon: 'diamond-outline', gradientKey: 'gold' },
  cash: { icon: 'wallet-outline', gradientKey: 'income' },
  property: { icon: 'home-outline', gradientKey: 'primary' },
  vehicle: { icon: 'car-sport-outline', gradientKey: 'secondary', iconColorKey: 'primary' },
  crypto: { icon: 'logo-bitcoin', gradientKey: 'primary' },
  other: { icon: 'layers-outline', gradientKey: 'dark' },
};

const formatMoney = (value, language) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
const isGramUnit = (unit) => GRAM_UNITS.includes(String(unit || '').trim().toLowerCase());
const getAssetMeta = (colors, type) => {
  const meta = ASSET_TYPE_META[type] || ASSET_TYPE_META.other;
  const palette = colors.gradients[meta.gradientKey] || colors.gradients.card;
  const accentColor = meta.iconColorKey ? colors[meta.iconColorKey] : (meta.iconColor || palette[0]);

  return {
    ...meta,
    palette,
    cardGradient: [`${palette[0]}20`, `${palette[1]}08`],
    badgeBackground: `${palette[0]}18`,
    iconColor: accentColor,
  };
};

export const AssetsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const isNarrow = width < 350;
  const isTablet = width >= 768;
  const assets = useSelector(selectAssets);
  const assetsLoading = useSelector(selectAssetsLoading);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors, { isCompact, isNarrow, isTablet });
  const accountId = profile?.householdId || user?.uid;
  const [showAddModal, setShowAddModal] = useState(false);
  const [goldMarket, setGoldMarket] = useState({
    isLoading: false,
    pricePerGramIdr: null,
    updatedAt: null,
    updatedAtLabel: '',
    source: '',
    isFallback: false,
    error: null,
  });
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
  const applyLiveGoldPrice = () => {
    if (!goldMarket.pricePerGramIdr) return;

    setForm((prev) => ({
      ...prev,
      unit: isGramUnit(prev.unit) ? prev.unit : 'gram',
      currentPrice: formatRupiahInput(String(goldMarket.pricePerGramIdr)),
    }));
  };

  const loadGoldPrice = async () => {
    setGoldMarket((prev) => ({ ...prev, isLoading: true, error: null }));

    const { data, error } = await fetchGoldPricePerGramInIdr();
    if (error) {
      setGoldMarket((prev) => ({
        ...prev,
        isLoading: false,
        error,
      }));
      return;
    }

    setGoldMarket({
      isLoading: false,
      pricePerGramIdr: data.pricePerGramIdr,
      updatedAt: data.updatedAt,
      updatedAtLabel: data.updatedAtLabel || '',
      source: data.source || '',
      isFallback: Boolean(data.isFallback),
      error: null,
    });
  };

  const handleSelectType = (type) => {
    setForm((prev) => {
      const nextForm = { ...prev, type };

      if (type === 'gold') {
        nextForm.unit = isGramUnit(prev.unit) ? prev.unit : 'gram';
        if (!prev.currentPrice && goldMarket.pricePerGramIdr) {
          nextForm.currentPrice = formatRupiahInput(String(goldMarket.pricePerGramIdr));
        }
      }

      return nextForm;
    });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      setGoldMarket((prev) => ({ ...prev, isLoading: true, error: null }));
      const { data, error } = await fetchGoldPricePerGramInIdr();

      if (!isMounted) return;

      if (error) {
        setGoldMarket((prev) => ({
          ...prev,
          isLoading: false,
          error,
        }));
        return;
      }

      setGoldMarket({
        isLoading: false,
        pricePerGramIdr: data.pricePerGramIdr,
        updatedAt: data.updatedAt,
        updatedAtLabel: data.updatedAtLabel || '',
        source: data.source || '',
        isFallback: Boolean(data.isFallback),
        error: null,
      });
    };

    fetchPrice();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showAddModal || form.type !== 'gold' || form.currentPrice || !goldMarket.pricePerGramIdr) return;

    setForm((prev) => ({
      ...prev,
      unit: isGramUnit(prev.unit) ? prev.unit : 'gram',
      currentPrice: formatRupiahInput(String(goldMarket.pricePerGramIdr)),
    }));
  }, [form.currentPrice, form.type, goldMarket.pricePerGramIdr, showAddModal]);

  const formattedGoldUpdatedAt = useMemo(() => {
    if (goldMarket.updatedAtLabel) return goldMarket.updatedAtLabel;
    if (!goldMarket.updatedAt) return '';
    return new Date(goldMarket.updatedAt).toLocaleString(language === 'en' ? 'en-US' : 'id-ID');
  }, [goldMarket.updatedAt, goldMarket.updatedAtLabel, language]);

  const goldSourceName = useMemo(() => {
    if (goldMarket.source === 'antam') return t('assets.goldSourceAntam');
    if (goldMarket.source === 'spot') {
      return goldMarket.isFallback
        ? `${t('assets.goldSourceSpot')} (${t('assets.fallback')})`
        : t('assets.goldSourceSpot');
    }
    return '';
  }, [goldMarket.isFallback, goldMarket.source, t]);

  const goldMarketMetaText = useMemo(() => {
    const parts = [];
    if (goldSourceName) {
      parts.push(t('assets.goldSourceLabel', { source: goldSourceName }));
    }
    if (formattedGoldUpdatedAt) {
      parts.push(formattedGoldUpdatedAt);
    }
    return parts.join(' · ');
  }, [formattedGoldUpdatedAt, goldSourceName, t]);

  const assetRows = useMemo(() => assets.map((asset) => {
    const qty = Number(asset.quantity) || 0;
    const buyPrice = Number(asset.buyPrice) || 0;
    const savedCurrentPrice = Number(asset.currentPrice) || 0;
    const useLiveGoldPrice = asset.type === 'gold' && isGramUnit(asset.unit) && Number(goldMarket.pricePerGramIdr) > 0;
    const currentPrice = useLiveGoldPrice ? goldMarket.pricePerGramIdr : savedCurrentPrice;
    const cost = qty * buyPrice;
    const value = qty * currentPrice;
    const profit = value - cost;
    const profitPct = cost > 0 ? (profit / cost) * 100 : 0;
    return {
      ...asset,
      qty,
      buyPrice,
      currentPrice,
      cost,
      value,
      profit,
      profitPct,
      isLivePriceApplied: useLiveGoldPrice,
    };
  }), [assets, goldMarket.pricePerGramIdr]);

  const totalValue = assetRows.reduce((sum, item) => sum + item.value, 0);
  const totalCost = assetRows.reduce((sum, item) => sum + item.cost, 0);
  const totalProfit = totalValue - totalCost;
  const portfolioRoi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const topAsset = assetRows.reduce((highest, item) => (!highest || item.value > highest.value ? item : highest), null);

  if (assetsLoading && assets.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t('assets.title')}
          </Text>
          <View style={styles.headerSpacer} />
        </LinearGradient>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const handleAdd = async () => {
    const liveGoldCurrentPrice = form.type === 'gold' && isGramUnit(form.unit) && goldMarket.pricePerGramIdr
      ? goldMarket.pricePerGramIdr
      : 0;

    if (!form.name.trim()) {
      Alert.alert(t('common.error'), t('assets.nameRequired'));
      return;
    }
    if (!form.quantity || !form.buyPrice || (!form.currentPrice && !liveGoldCurrentPrice)) {
      Alert.alert(t('common.error'), t('assets.fillAllFields'));
      return;
    }

    const assetPayload = {
      ...form,
      quantity: Number(form.quantity),
      buyPrice: parseAmount(form.buyPrice),
      currentPrice: form.currentPrice ? parseAmount(form.currentPrice) : liveGoldCurrentPrice,
    };

    dispatch(addAssetLocal(assetPayload));
    if (accountId && user?.uid) {
      const { id, error } = await addAsset(accountId, assetPayload);
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
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {t('assets.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={colors.gradients.header} style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>{t('assets.portfolioBreakdown')}</Text>
              <Text style={styles.heroTitle}>{t('assets.portfolioValue')}</Text>
            </View>
            <TouchableOpacity style={styles.heroAddBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={18} color={colors.textInverse} />
            </TouchableOpacity>
          </View>

          <Text
            style={styles.heroValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatMoney(totalValue, language)}
          </Text>

          <View style={styles.heroPerformanceRow}>
            <View style={[styles.heroPill, { backgroundColor: `${totalProfit >= 0 ? colors.income : colors.expense}16` }]}>
              <Ionicons
                name={totalProfit >= 0 ? 'trending-up-outline' : 'trending-down-outline'}
                size={14}
                color={totalProfit >= 0 ? colors.income : colors.expense}
              />
              <Text style={[styles.heroPillText, { color: totalProfit >= 0 ? colors.income : colors.expense }]}>
                {totalProfit >= 0 ? '+' : ''}{formatMoney(totalProfit, language)}
              </Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="stats-chart-outline" size={14} color={colors.primary} />
              <Text style={[styles.heroPillText, { color: colors.primary }]}>
                {portfolioRoi >= 0 ? '+' : ''}{portfolioRoi.toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsGrid}>
            <View style={[styles.heroStatCard, styles.heroStatCardAccent]}>
              <Text style={styles.heroStatLabel}>{t('assets.totalValue')}</Text>
              <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {formatMoney(totalValue, language)}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>{t('assets.totalCost')}</Text>
              <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {formatMoney(totalCost, language)}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>{t('assets.myAssets')}</Text>
              <Text style={styles.heroStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {assetRows.length}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel} numberOfLines={1}>{topAsset ? topAsset.name : 'ROI'}</Text>
              <Text
                style={[styles.heroStatValue, { color: topAsset ? colors.textPrimary : (portfolioRoi >= 0 ? colors.income : colors.expense) }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {topAsset ? formatMoney(topAsset.value, language) : `${portfolioRoi.toFixed(1)}%`}
              </Text>
            </View>
          </View>

          {goldMarket.pricePerGramIdr ? (
            <View style={styles.liveMarketBanner}>
              <View style={styles.liveMarketIcon}>
                <Ionicons name="flash-outline" size={16} color={colors.warning} />
              </View>
              <View style={styles.liveMarketTextWrap}>
                <Text style={styles.liveMarketTitle}>{t('assets.goldHint', {
                  price: formatMoney(goldMarket.pricePerGramIdr, language),
                  unit: 'gram',
                })}</Text>
                <Text style={styles.liveMarketMeta}>{goldMarketMetaText}</Text>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.sectionRow}>
          <View>
            <Text style={styles.sectionTitle}>{t('assets.myAssets')}</Text>
            <Text style={styles.sectionCaption}>
              {assetRows.length > 0
                ? (language === 'en' ? `${assetRows.length} assets tracked` : `${assetRows.length} aset tercatat`)
                : t('assets.emptySubtitle')}
            </Text>
          </View>
        </View>

        {assetRows.length === 0 ? (
          <LinearGradient colors={colors.gradients.card} style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="briefcase-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyText}>{t('assets.emptyTitle')}</Text>
            <Text style={styles.emptySub}>{t('assets.emptySubtitle')}</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.emptyActionText}>{t('assets.addAsset')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <FlatList
            data={assetRows}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.assetList}
            renderItem={({ item }) => {
              const assetMeta = getAssetMeta(colors, item.type);

              return (
                <View style={styles.assetCardShell}>
                  <LinearGradient colors={assetMeta.cardGradient} style={styles.assetCard}>
                    <View style={styles.assetTop}>
                      <View style={styles.assetIdentity}>
                      <View style={[styles.assetIconWrap, { backgroundColor: assetMeta.badgeBackground }]}>
                        <Ionicons name={assetMeta.icon} size={18} color={assetMeta.iconColor} />
                      </View>
                      <View style={styles.assetInfo}>
                          <Text style={styles.assetName} numberOfLines={2}>{item.name}</Text>
                          <View style={styles.assetBadgeRow}>
                            <View style={styles.assetBadge}>
                              <Text style={styles.assetBadgeText}>{t(`assets.types.${item.type}`)}</Text>
                            </View>
                            <View style={styles.assetBadge}>
                              <Text style={styles.assetBadgeText}>{item.qty} {item.unit}</Text>
                            </View>
                            {item.isLivePriceApplied ? (
                              <View style={[styles.assetBadge, { backgroundColor: `${colors.warning}16`, borderColor: `${colors.warning}24` }]}>
                                <Text style={[styles.assetBadgeText, { color: colors.warning }]}>
                                  {goldMarket.isFallback ? t('assets.fallback') : t('assets.live')}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBtn}
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

                    <View style={styles.assetHeroRow}>
                    <View style={styles.assetHeroMain}>
                        <Text style={styles.assetHeroLabel}>{t('assets.totalValue')}</Text>
                        <Text style={styles.assetHeroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                          {formatMoney(item.value, language)}
                        </Text>
                      </View>

                      <View style={[styles.assetProfitBadge, { backgroundColor: `${item.profit >= 0 ? colors.income : colors.expense}16` }]}>
                        <Ionicons
                          name={item.profit >= 0 ? 'arrow-up-outline' : 'arrow-down-outline'}
                          size={14}
                          color={item.profit >= 0 ? colors.income : colors.expense}
                        />
                        <Text style={[styles.assetProfitValue, { color: item.profit >= 0 ? colors.income : colors.expense }]}>
                          {item.profit >= 0 ? '+' : ''}{formatMoney(item.profit, language)}
                        </Text>
                        <Text style={[styles.assetProfitPct, { color: item.profit >= 0 ? colors.income : colors.expense }]}>
                          {item.profitPct >= 0 ? '+' : ''}{item.profitPct.toFixed(1)}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.assetMetrics}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricLabel}>{t('assets.quantity')}</Text>
                        <Text style={styles.metricValue}>{item.qty} {item.unit}</Text>
                    </View>
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
                  </LinearGradient>
                </View>
              );
            }}
            />
          )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
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
                  <TouchableOpacity key={type} style={[styles.chip, form.type === type && styles.chipActive]} onPress={() => handleSelectType(type)}>
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
              {form.type === 'gold' && (
                <>
                  <TouchableOpacity
                    style={styles.livePriceCard}
                    activeOpacity={0.8}
                    disabled={goldMarket.isLoading}
                    onPress={goldMarket.pricePerGramIdr ? applyLiveGoldPrice : loadGoldPrice}
                  >
                    <View style={styles.livePriceContent}>
                      <Ionicons name="flash-outline" size={16} color={goldMarket.pricePerGramIdr ? colors.primary : colors.textMuted} />
                      <Text style={[styles.helper, goldMarket.pricePerGramIdr && styles.helperAccent]}>
                        {goldMarket.isLoading
                          ? t('common.loading')
                          : goldMarket.pricePerGramIdr
                            ? t('assets.goldHint', {
                                price: formatMoney(goldMarket.pricePerGramIdr, language),
                                unit: 'gram',
                              })
                            : t('assets.livePriceUnavailable')}
                      </Text>
                    </View>
                    <Text style={[styles.livePriceAction, !goldMarket.pricePerGramIdr && styles.livePriceActionMuted]}>
                      {goldMarket.pricePerGramIdr ? t('assets.useLivePrice') : t('assets.refresh')}
                    </Text>
                  </TouchableOpacity>
                  {goldMarketMetaText ? (
                    <Text style={styles.helper}>{goldMarketMetaText}</Text>
                  ) : null}
                </>
              )}
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

const createStyles = (colors, { isCompact, isNarrow, isTablet }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isCompact ? SPACING.md : SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerSpacer: { width: 40, height: 40 },
  title: {
    color: colors.textPrimary,
    fontSize: isNarrow ? FONT_SIZE.lg : FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    flex: 1,
    textAlign: 'center',
  },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}20` },
  container: { flex: 1 },
  content: {
    padding: isCompact ? SPACING.md : SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: '100%',
    maxWidth: isTablet ? 920 : '100%',
    alignSelf: 'center',
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: isCompact ? SPACING.md : SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  heroTitleWrap: { flex: 1 },
  heroEyebrow: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  heroTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold, marginTop: 4 },
  heroAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...SHADOWS.sm,
  },
  heroValue: {
    color: colors.textPrimary,
    fontFamily: FONT_FAMILY.extrabold,
    fontSize: isNarrow ? FONT_SIZE.xxl : FONT_SIZE.display,
    marginTop: SPACING.md,
  },
  heroPerformanceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}18`,
    maxWidth: '100%',
    flexShrink: 1,
  },
  heroPillText: { fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.xs, flexShrink: 1 },
  heroStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  heroStatCard: {
    width: isTablet ? '23%' : '48%',
    minWidth: 0,
    backgroundColor: `${colors.surface}CC`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroStatCardAccent: { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}24` },
  heroStatLabel: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  heroStatValue: { color: colors.textPrimary, fontSize: isNarrow ? FONT_SIZE.xs : FONT_SIZE.sm, fontFamily: FONT_FAMILY.bold, marginTop: 6 },
  liveMarketBanner: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    backgroundColor: `${colors.warning}10`,
    borderWidth: 1,
    borderColor: `${colors.warning}24`,
    flexDirection: isNarrow ? 'column' : 'row',
    alignItems: isNarrow ? 'stretch' : 'flex-start',
    gap: SPACING.sm,
  },
  liveMarketIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.warning}16`,
  },
  liveMarketTextWrap: { flex: 1 },
  liveMarketTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold },
  liveMarketMeta: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  sectionTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold },
  sectionCaption: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  sectionRow: { marginTop: SPACING.xs, marginBottom: SPACING.md },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}14`,
    marginBottom: SPACING.md,
  },
  emptyText: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.semibold },
  emptySub: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  emptyActionBtn: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.full,
  },
  emptyActionText: { color: '#FFF', fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold },
  assetList: { gap: SPACING.md },
  assetCardShell: {
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: colors.surface,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: colors.background === '#0F172A' ? 0.22 : 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  assetCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  assetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  assetIdentity: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  assetIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.border}CC`,
  },
  assetInfo: { flex: 1, minWidth: 0, paddingRight: SPACING.xs },
  assetName: { color: colors.textPrimary, fontFamily: FONT_FAMILY.bold, fontSize: FONT_SIZE.md },
  assetBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  assetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.surface}CC`,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetBadgeText: { color: colors.textSecondary, fontFamily: FONT_FAMILY.medium, fontSize: FONT_SIZE.xs },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.expense}12`,
    borderWidth: 1,
    borderColor: `${colors.expense}20`,
  },
  assetHeroRow: {
    marginTop: SPACING.md,
    flexDirection: isCompact ? 'column' : 'row',
    alignItems: isCompact ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  assetHeroMain: { flex: 1, minWidth: 0 },
  assetHeroLabel: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium, textTransform: 'uppercase', letterSpacing: 0.3 },
  assetHeroValue: { color: colors.textPrimary, fontSize: isNarrow ? FONT_SIZE.xl : FONT_SIZE.xxl, fontFamily: FONT_FAMILY.extrabold, marginTop: 4 },
  assetProfitBadge: {
    alignSelf: isCompact ? 'flex-start' : 'stretch',
    minWidth: isCompact ? 0 : 150,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  assetProfitValue: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.bold },
  assetProfitPct: { fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium },
  assetMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.md,
  },
  metricBox: {
    width: isCompact ? '100%' : '48%',
    backgroundColor: `${colors.surface}D9`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  metricValue: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: isCompact ? SPACING.md : SPACING.lg,
    maxHeight: '90%',
    width: '100%',
    maxWidth: isTablet ? 720 : '100%',
    alignSelf: 'center',
  },
  modalScrollContent: { paddingBottom: SPACING.xl },
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
  helperAccent: { color: colors.textSecondary },
  livePriceCard: {
    marginTop: 8,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: isNarrow ? 'column' : 'row',
    alignItems: isNarrow ? 'stretch' : 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  livePriceContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePriceAction: { color: colors.primary, fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.xs, alignSelf: isNarrow ? 'flex-start' : 'auto' },
  livePriceActionMuted: { color: colors.textMuted },
  saveBtn: { marginTop: SPACING.lg, backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.lg, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.md },
  bottomSpacer: { height: 32 },
});

export default AssetsScreen;
