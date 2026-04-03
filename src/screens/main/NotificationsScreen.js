// ============================================================
// Notifications Screen
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { selectAppNotifications, selectAppNotificationsLoading, selectUnreadAppNotificationCount } from '@store/appNotificationSlice';
import { deleteAllAppNotifications, deleteAppNotification, markAppNotificationAsRead } from '@services/firebase/appNotifications';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import LoadingState from '@components/common/LoadingState';

export const NotificationsScreen = () => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { t } = useTranslation();
  const user = useSelector(selectUser);
  const notifications = useSelector(selectAppNotifications);
  const activeCount = useSelector(selectUnreadAppNotificationCount);
  const notificationsLoading = useSelector(selectAppNotificationsLoading);

  const handlePressNotification = async (item) => {
    if (item.isRead) return;
    await markAppNotificationAsRead(item.id);
  };

  const handleDeleteNotification = (item) => {
    Alert.alert(
      t('notifications.deleteTitle'),
      t('notifications.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAppNotification(item.id);
            if (error) {
              Alert.alert(t('common.error'), error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllNotifications = () => {
    if (!user?.uid || notifications.length === 0) return;

    Alert.alert(
      t('notifications.clearAllTitle'),
      t('notifications.clearAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAllAppNotifications(user.uid);
            if (error) {
              Alert.alert(t('common.error'), error);
            }
          },
        },
      ]
    );
  };

  const activeCountLabel = activeCount > 99 ? '99+' : String(activeCount);

  if (notificationsLoading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerInfo}>
              <Text style={styles.title}>{t('notifications.title')}</Text>
              <Text style={styles.subtitle}>{t('notifications.subtitle')}</Text>
            </View>
          </View>
        </View>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{t('notifications.title')}</Text>
            <Text style={styles.subtitle}>{t('notifications.subtitle')}</Text>
          </View>
          {notifications.length > 0 ? (
            <TouchableOpacity onPress={handleDeleteAllNotifications} style={styles.clearAllBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.expense} />
              <Text style={styles.clearAllText}>{t('notifications.clearAll')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {activeCount > 0 ? (
          <Text style={styles.activeCount}>{t('notifications.unreadCount', { count: activeCountLabel })}</Text>
        ) : null}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => handlePressNotification(item)}
            style={[styles.card, !item.isRead && styles.cardUnread]}
          >
            <View style={styles.row}>
              <Text style={styles.action}>{item.action || item.entityType}</Text>
              <TouchableOpacity onPress={() => handleDeleteNotification(item)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={colors.expense} />
              </TouchableOpacity>
            </View>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.footerRow}>
              <Text style={styles.meta}>{t('notifications.by', { name: item.actorName })}</Text>
              <Text style={styles.time}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{t('notifications.empty')}</Text>}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, paddingBottom: SPACING.md },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACING.sm },
  headerInfo: { flex: 1, paddingRight: SPACING.sm },
  title: { color: colors.textPrimary, fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold },
  subtitle: { color: colors.textMuted, marginTop: 4, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  activeCount: { color: colors.primary, marginTop: 8, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.expense}10`,
    borderWidth: 1,
    borderColor: `${colors.expense}25`,
  },
  clearAllText: { color: colors.expense, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.semibold },
  list: { padding: SPACING.lg },
  card: { backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: colors.border, ...SHADOWS.sm },
  cardUnread: { borderColor: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.expense}10`,
  },
  action: { color: colors.primary, fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.xs },
  time: { color: colors.textMuted, fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.xs },
  titleText: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.semibold },
  body: { color: colors.textSecondary, marginTop: 4, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 },
  meta: { color: colors.textMuted, marginTop: 8, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontFamily: FONT_FAMILY.regular },
});

export default NotificationsScreen;
