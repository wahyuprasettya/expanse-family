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
import { Colors, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';

export const RemindersScreen = ({ navigation }) => {
  const dispatch = useDispatch();
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
      Alert.alert('Error', 'Please fill required fields');
      return;
    }
    setLoading(true);
    const { error } = await addReminder(user.uid, {
      ...form,
      amount: parseFloat(form.amount) || 0,
      daysBefore: parseInt(form.daysBefore) || 1,
    });
    setLoading(false);
    if (error) Alert.alert('Error', error);
    else { setShowAddModal(false); setForm({ name: '', amount: '', category: 'Bills', dueDate: new Date().toISOString(), daysBefore: '1', isRecurring: true }); }
  };

  const handleDelete = (r) => {
    Alert.alert('Delete Reminder', `Remove "${r.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteReminder(r.id, r.notificationId);
          dispatch(removeReminderLocal(r.id));
        },
      },
    ]);
  };

  const daysUntilDue = (dueDate) => {
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Due today';
    return `${diff} day${diff !== 1 ? 's' : ''} left`;
  };

  const getDueColor = (dueDate) => {
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return Colors.expense;
    if (diff <= 3) return Colors.warning;
    return Colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <Text style={styles.title}>Bill Reminders</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      {reminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No reminders yet</Text>
          <Text style={styles.emptySubtext}>Add bill schedules to stay on track</Text>
          <Button title="Add Reminder" onPress={() => setShowAddModal(true)} style={styles.emptyBtn} fullWidth={false} />
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
                  <Ionicons name="receipt-outline" size={22} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.reminderName}>{r.name}</Text>
                  <Text style={styles.reminderCategory}>{r.category}</Text>
                  <Text style={styles.reminderDate}>Due: {formatDateSmart(r.dueDate)}</Text>
                </View>
              </View>
              <View style={styles.reminderRight}>
                <Text style={styles.reminderAmount}>{formatCurrency(r.amount)}</Text>
                <Text style={[styles.dueStatus, { color: getDueColor(r.dueDate) }]}>
                  {daysUntilDue(r.dueDate)}
                </Text>
                {r.isRecurring && (
                  <View style={styles.recurringBadge}>
                    <Ionicons name="repeat" size={10} color={Colors.primary} />
                    <Text style={styles.recurringText}>Monthly</Text>
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
              <Text style={styles.modalTitle}>New Bill Reminder</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input label="Bill Name" value={form.name} onChangeText={setField('name')} placeholder="e.g. Electricity Bill" icon="document-text-outline" />
            <Input label="Amount (Rp)" value={form.amount} onChangeText={setField('amount')} placeholder="0" keyboardType="numeric" icon="wallet-outline" prefix="Rp" />
            <Input label="Category" value={form.category} onChangeText={setField('category')} placeholder="Bills & Utilities" icon="folder-outline" />
            <Input label="Remind me (days before)" value={form.daysBefore} onChangeText={setField('daysBefore')} keyboardType="numeric" icon="alarm-outline" />

            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Due Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.duePicker}>
                <Text style={styles.duePickerText}>{formatDateSmart(form.dueDate)}</Text>
                <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
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
              <Text style={styles.toggleLabel}>Recurring Monthly</Text>
              <Switch
                value={form.isRecurring}
                onValueChange={setField('isRecurring')}
                trackColor={{ true: Colors.primary }}
                thumbColor="#FFF"
              />
            </View>

            <Button title="Add Reminder" onPress={handleAdd} loading={loading} style={{ marginTop: SPACING.md }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  reminderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: Colors.border, ...SHADOWS.sm,
  },
  reminderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  reminderIcon: {
    width: 44, height: 44, borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  reminderName: { color: Colors.textPrimary, fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.md },
  reminderCategory: { color: Colors.textMuted, fontSize: FONT_SIZE.xs },
  reminderDate: { color: Colors.textSecondary, fontSize: FONT_SIZE.xs, marginTop: 2 },
  reminderRight: { alignItems: 'flex-end' },
  reminderAmount: { color: Colors.expense, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md },
  dueStatus: { fontSize: FONT_SIZE.xs, marginTop: 2 },
  recurringBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${Colors.primary}20`, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  recurringText: { color: Colors.primary, fontSize: 9 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 60, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  emptySubtext: { color: Colors.textMuted, fontSize: FONT_SIZE.md, marginBottom: SPACING.lg, textAlign: 'center' },
  emptyBtn: {},
  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  dueRow: { marginBottom: SPACING.md },
  dueLabel: { color: Colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', marginBottom: 6 },
  duePicker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: Colors.border,
  },
  duePickerText: { color: Colors.textPrimary, fontSize: FONT_SIZE.md },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  toggleLabel: { color: Colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
});

export default RemindersScreen;
