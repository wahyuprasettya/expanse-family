// ============================================================
// Insights Screen
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useInsights } from '@hooks/useInsights';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const InsightsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const insights = useInsights();
  const insightCards = insights.insightCards || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{t('insights.title')}</Text>
            <Text style={styles.subtitle}>{t('insights.subtitle')}</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={insightCards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          insightCards.length > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{t('insights.totalCount')}</Text>
              <Text style={styles.summaryValue}>{insightCards.length}</Text>
            </View>
          ) : null
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.icon} {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            ) : null}
          </View>
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>{t('insights.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('insights.emptySubtitle')}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.md,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerInfo: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  list: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    flexGrow: 1,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  summaryValue: {
    color: colors.primary,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: 22,
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 8,
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIcon: { fontSize: 44, marginBottom: SPACING.md },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
    textAlign: 'center',
  },
});

export default InsightsScreen;
