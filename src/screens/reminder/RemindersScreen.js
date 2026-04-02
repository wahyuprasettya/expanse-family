// ============================================================
// Reminders Screen (Bill Schedules)
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { selectReminders, setReminders, addReminderLocal, removeReminderLocal } from '@store/reminderSlice';
import { subscribeToReminders, addReminder, deleteReminder } from '@services/firebase/reminders';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { formatCurrency, formatDateSmart } from '@utils/formatters';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

export const RemindersScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const reminders = useSelector(selectReminders);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    amount: '',
    category: 'Bills & Utilities',
    dueDate: new Date().toISOString(),
    daysBefore: '1',
    isRecurring: true,
  });

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToReminders(user.uid, (data) => dispatch(setReminders(data)));
    return unsub;
  }, [user?.uid, dispatch]);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleAdd = async () => {
    if (!form.name.trim() || !form.amount) {
      Alert.alert(t('common.error'), t('reminders.fillRequired'));
      return;
    }
    setLoading(true);
    const { error } = await addReminder(user.uid, {
      ...form,
      amount: parseFloat(form.amount) || 0,
      daysBefore: parseInt(form.daysBefore) || 1,
    }, t);
    setLoading(false);
    if (error) Alert.alert(t('common.error'), error);
    else { setShowAddModal(false); setForm({ name: '', amount: '', category: 'Bills', dueDate: new Date().toISOString(), daysBefore: '1', isRecurring: true }); }
  };

  const handleDelete = (r) => {
    Alert.alert(t('reminders.deleteTitle'), t('reminders.deleteMessage', { name: r.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          await deleteReminder(r.id, r.notificationId);
          dispatch(removeReminderLocal(r.id));
        },
      },
    ]);
  };

  const daysUntilDue = (dueDate) => {
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return t('reminders.overdue');
    if (diff === 0) return t('reminders.dueToday');
    return t('reminders.daysLeft', { count: diff });
  };

  const getDueColor = (dueDate) => {
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return colors.expense;
    if (diff <= 3) return colors.warning;
    return colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <Text style={styles.title}>{t('reminders.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>{t('reminders.emptyTitle')}</Text>
          <Text style={styles.emptySubtext}>{t('reminders.emptySubtitle')}</Text>
          <Button title={t('reminders.addReminder')} onPress={() => setShowAddModal(true)} style={styles.emptyBtn} fullWidth={false} />
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: r }) => (
            <TouchableOpacity onLongPress={() => handleDelete(r)} style={styles.reminderCard}>
              <View style={styles.reminderLeft}>
                <View style={styles.reminderIcon}>
                  <Ionicons name="receipt-outline" size={22} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.reminderName}>{r.name}</Text>
                  <Text style={styles.reminderCategory}>{r.category}</Text>
                  <Text style={styles.reminderDate}>{t('home.dueLabel', { date: formatDateSmart(r.dueDate, language) })}</Text>
                </View>
              </View>
              <View style={styles.reminderRight}>
                <Text style={styles.reminderAmount}>{formatCurrency(r.amount, 'IDR', language)}</Text>
                <Text style={[styles.dueStatus, { color: getDueColor(r.dueDate) }]}>
                  {daysUntilDue(r.dueDate)}
                </Text>
                {r.isRecurring && (
                  <View style={styles.recurringBadge}>
                    <Ionicons name="repeat" size={10} color={colors.primary} />
                    <Text style={styles.recurringText}>{t('reminders.monthly')}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add Reminder Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('reminders.newReminder')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input label={t('reminders.billName')} value={form.name} onChangeText={setField('name')} placeholder={t('reminders.billPlaceholder')} icon="document-text-outline" />
            <Input label={t('reminders.amount')} value={form.amount} onChangeText={setField('amount')} placeholder="0" keyboardType="numeric" icon="wallet-outline" prefix="Rp" />
            <Input label={t('common.category')} value={form.category} onChangeText={setField('category')} placeholder="Bills & Utilities" icon="folder-outline" />
            <Input label={t('reminders.remindBefore')} value={form.daysBefore} onChangeText={setField('daysBefore')} keyboardType="numeric" icon="alarm-outline" />

            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>{t('reminders.dueDate')}</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.duePicker}>
                <Text style={styles.duePickerText}>{formatDateSmart(form.dueDate, language)}</Text>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={new Date(form.dueDate)}
                mode="date"
                onChange={(e, d) => { setShowDatePicker(false); if (d) setField('dueDate')(d.toISOString()); }}
              />
            )}

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>{t('reminders.recurringMonthly')}</Text>
              <Switch
                value={form.isRecurring}
                onValueChange={setField('isRecurring')}
                trackColor={{ true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>

            <Button title={t('reminders.addReminder')} onPress={handleAdd} loading={loading} style={{ marginTop: SPACING.md }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  reminderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: colors.border, ...SHADOWS.sm,
  },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reminderIcon: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  reminderName: { color: colors.textPrimary, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold, fontSize: FONT_SIZE.md },
  reminderCategory: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  reminderDate: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  reminderRight: { alignItems: 'flex-end' },
  reminderAmount: { color: colors.expense, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, fontSize: FONT_SIZE.md },
  dueStatus: { fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  recurringBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${colors.primary}20`, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  recurringText: { color: colors.primary, fontSize: 9, fontFamily: FONT_FAMILY.regular },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 60, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  emptySubtext: { color: colors.textMuted, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular, marginBottom: SPACING.lg, textAlign: 'center' },
  emptyBtn: {},
  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  dueRow: { marginBottom: SPACING.md },
  dueLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium, marginBottom: 6 },
  duePicker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: colors.border,
  },
  duePickerText: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  toggleLabel: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
});

export default RemindersScreen;
