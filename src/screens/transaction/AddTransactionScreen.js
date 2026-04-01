// ============================================================
// Add Transaction Screen
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, FlatList, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectCategories } from '@store/categorySlice';
import { useTransactions } from '@hooks/useTransactions';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { Colors, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import { parseAmount } from '@utils/formatters';
import DateTimePicker from '@react-native-community/datetimepicker';

export const AddTransactionScreen = ({ navigation, route }) => {
  const categories = useSelector(selectCategories);
  const { addTransaction } = useTransactions();

  const [type, setType] = useState('expense'); // 'income' | 'expense'
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const filteredCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );

  const validate = () => {
    const newErrors = {};
    if (!amount || parseAmount(amount) <= 0) newErrors.amount = 'Enter a valid amount';
    if (!selectedCategory) newErrors.category = 'Please select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    const { error } = await addTransaction({
      amount: parseAmount(amount),
      type,
      category: selectedCategory.name,
      categoryId: selectedCategory.id,
      categoryIcon: selectedCategory.icon,
      categoryColor: selectedCategory.color,
      description: description.trim(),
      date: date.toISOString(),
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Header */}
        <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Transaction</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            {['expense', 'income'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive(t)]}
                onPress={() => { setType(t); setSelectedCategory(null); }}
              >
                <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive(t)]}>
                  {t === 'expense' ? '💸 Expense' : '💰 Income'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySymbol}>Rp</Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="numeric"
                inputStyle={styles.amountText}
                style={{ flex: 1, marginBottom: 0 }}
                error={errors.amount}
              />
            </View>
          </View>

          {/* Category Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              style={[styles.categorySelector, errors.category && styles.fieldError]}
              onPress={() => setShowCategoryModal(true)}
            >
              {selectedCategory ? (
                <View style={styles.selectedCategory}>
                  <Text style={styles.selectedCategoryIcon}>{selectedCategory.icon}</Text>
                  <Text style={styles.selectedCategoryName}>{selectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={styles.categoryPlaceholder}>Select a category</Text>
              )}
              <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Date Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.dateText}>
                {date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
              <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          {/* Description */}
          <Input
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What was this for?"
            icon="document-text-outline"
            multiline
            numberOfLines={3}
          />

          <Button
            title="Add Transaction"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>

        {/* Category Modal */}
        <Modal visible={showCategoryModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                numColumns={3}
                contentContainerStyle={styles.categoryGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategory?.id === item.id && styles.categoryItemSelected,
                      { borderColor: item.color },
                    ]}
                    onPress={() => { setSelectedCategory(item); setShowCategoryModal(false); }}
                  >
                    <Text style={styles.categoryItemIcon}>{item.icon}</Text>
                    <Text style={styles.categoryItemName} numberOfLines={2}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  content: { padding: SPACING.lg },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  typeBtnActive: (t) => ({
    backgroundColor: t === 'expense' ? Colors.expense : Colors.income,
  }),
  typeBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    color: Colors.textMuted,
  },
  typeBtnTextActive: (t) => ({ color: '#FFFFFF', fontWeight: FONT_WEIGHT.bold }),
  amountContainer: { marginBottom: SPACING.lg },
  amountLabel: { color: Colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', marginBottom: 6 },
  amountInput: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  currencySymbol: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: Colors.textSecondary,
    marginTop: -16,
  },
  amountText: { fontSize: FONT_SIZE.xxxl, fontWeight: FONT_WEIGHT.extrabold, color: Colors.textPrimary },
  fieldContainer: { marginBottom: SPACING.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', marginBottom: 6 },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  fieldError: { borderColor: Colors.expense },
  selectedCategory: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedCategoryIcon: { fontSize: 22 },
  selectedCategoryName: { color: Colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  categoryPlaceholder: { color: Colors.textMuted, fontSize: FONT_SIZE.md },
  errorText: { color: Colors.expense, fontSize: FONT_SIZE.xs, marginTop: 4 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  dateText: { flex: 1, color: Colors.textPrimary, fontSize: FONT_SIZE.sm },
  submitBtn: { marginTop: SPACING.lg, marginBottom: SPACING.xl },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  categoryGrid: { padding: SPACING.md },
  categoryItem: {
    flex: 1,
    margin: 6,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: Colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryItemSelected: { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary },
  categoryItemIcon: { fontSize: 28, marginBottom: 6 },
  categoryItemName: {
    color: Colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default AddTransactionScreen;
