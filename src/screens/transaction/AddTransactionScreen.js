// ============================================================
// Add Transaction Screen
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
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
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import { parseAmount, formatDate } from '@utils/formatters';
import DateTimePicker from '@react-native-community/datetimepicker';

const TRANSACTION_TYPES = ['expense', 'income', 'debt'];

export const AddTransactionScreen = ({ navigation, route }) => {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);
  const categories = useSelector(selectCategories);
  const { addTransaction } = useTransactions();

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });
  const [creditorName, setCreditorName] = useState('');
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState('transaction');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isDebt = type === 'debt';

  const filteredCategories = useMemo(() => categories.filter((category) => {
    if (isDebt) return category.type === 'expense' || category.type === 'both' || category.id === 'debt';
    return category.type === type || category.type === 'both';
  }), [categories, isDebt, type]);

  useEffect(() => {
    const prefill = route?.params?.prefill;
    if (!prefill) return;

    if (prefill.type) setType(prefill.type);
    if (prefill.amount) setAmount(String(prefill.amount));
    if (prefill.description) setDescription(prefill.description);
    if (prefill.date) setDate(new Date(prefill.date));
  }, [route?.params?.prefill]);

  const validate = () => {
    const newErrors = {};
    if (!amount || parseAmount(amount) <= 0) newErrors.amount = t('addTransaction.amountRequired');
    if (!selectedCategory) newErrors.category = t('addTransaction.categoryRequired');
    if (isDebt) {
      if (!creditorName.trim()) newErrors.creditorName = t('addTransaction.creditorRequired');
      if (!dueDate) newErrors.dueDate = t('addTransaction.dueDateRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangeType = (nextType) => {
    setType(nextType);
    if (nextType === 'debt') {
      setSelectedCategory(categories.find((category) => category.id === 'debt') || null);
    } else {
      setSelectedCategory(null);
    }
    setErrors({});
  };

  const openDatePicker = (target) => {
    setDatePickerTarget(target);
    setShowDatePicker(true);
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
      debtMeta: isDebt ? {
        creditorName: creditorName.trim(),
        dueDate: dueDate.toISOString(),
        remindDaysBefore: parseInt(remindDaysBefore, 10) || 3,
      } : null,
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
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('addTransaction.title')}</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            {TRANSACTION_TYPES.map((txType) => (
              <TouchableOpacity
                key={txType}
                style={[
                  styles.typeBtn,
                  type === txType && {
                    backgroundColor: txType === 'income'
                      ? colors.income
                      : txType === 'debt'
                        ? colors.warning
                        : colors.expense,
                  },
                ]}
                onPress={() => handleChangeType(txType)}
              >
                <Text style={[styles.typeBtnText, type === txType && styles.typeBtnTextActive]}>
                  {txType === 'expense' ? t('common.expense') : txType === 'income' ? t('common.income') : t('addTransaction.typeDebt')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>{t('addTransaction.amount')}</Text>
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
            <Text style={styles.fieldLabel}>{t('common.category')}</Text>
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
                <Text style={styles.categoryPlaceholder}>{t('addTransaction.selectCategory')}</Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Date Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('common.date')}</Text>
            <TouchableOpacity style={styles.dateSelector} onPress={() => openDatePicker('transaction')}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.dateText}>
                {formatDate(date, 'EEEE, dd MMMM yyyy', language)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={datePickerTarget === 'due' ? dueDate : date}
              mode="date"
              display="default"
              maximumDate={datePickerTarget === 'transaction' ? new Date() : undefined}
              minimumDate={datePickerTarget === 'due' ? new Date() : undefined}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (!selectedDate) return;
                if (datePickerTarget === 'due') setDueDate(selectedDate);
                else setDate(selectedDate);
              }}
            />
          )}

          {isDebt ? (
            <View style={styles.debtSection}>
              <Text style={styles.sectionTitle}>{t('addTransaction.debtSection')}</Text>
              <Input
                label={t('addTransaction.creditorName')}
                value={creditorName}
                onChangeText={setCreditorName}
                placeholder={t('addTransaction.creditorPlaceholder')}
                icon="person-outline"
                error={errors.creditorName}
              />
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('addTransaction.dueDate')}</Text>
                <TouchableOpacity
                  style={[styles.dateSelector, errors.dueDate && styles.fieldError]}
                  onPress={() => openDatePicker('due')}
                >
                  <Ionicons name="alarm-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.dateText}>
                    {formatDate(dueDate, 'EEEE, dd MMMM yyyy', language)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {errors.dueDate ? <Text style={styles.errorText}>{errors.dueDate}</Text> : null}
              </View>
              <Input
                label={t('addTransaction.remindBefore')}
                value={remindDaysBefore}
                onChangeText={setRemindDaysBefore}
                placeholder={t('addTransaction.remindPlaceholder')}
                keyboardType="numeric"
                icon="notifications-outline"
                hint={t('addTransaction.daysBeforeSuffix')}
              />
            </View>
          ) : null}

          {/* Description */}
          <Input
            label={t('addTransaction.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={isDebt ? t('addTransaction.debtDescriptionPlaceholder') : t('addTransaction.descriptionPlaceholder')}
            icon="document-text-outline"
            multiline
            numberOfLines={3}
          />

          <Button
            title={isDebt ? t('addTransaction.addDebtBtn') : t('addTransaction.addBtn')}
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
                <Text style={styles.modalTitle}>{t('addTransaction.selectCategory')}</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
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

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  content: { padding: SPACING.lg },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textMuted,
  },
  typeBtnTextActive: { color: '#FFFFFF', fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  amountContainer: { marginBottom: SPACING.lg },
  amountLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium, marginBottom: 6 },
  amountInput: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  currencySymbol: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textSecondary,
    marginTop: -16,
  },
  amountText: { fontSize: FONT_SIZE.xxxl, fontWeight: FONT_WEIGHT.extrabold, fontFamily: FONT_FAMILY.extrabold, color: colors.textPrimary },
  fieldContainer: { marginBottom: SPACING.md },
  fieldLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium, marginBottom: 6 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACING.md,
  },
  debtSection: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
  },
  fieldError: { borderColor: colors.expense },
  selectedCategory: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedCategoryIcon: { fontSize: 22 },
  selectedCategoryName: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  categoryPlaceholder: { color: colors.textMuted, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular },
  errorText: { color: colors.expense, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
  },
  dateText: { flex: 1, color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  submitBtn: { marginTop: SPACING.lg, marginBottom: SPACING.xl },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  categoryGrid: { padding: SPACING.md },
  categoryItem: {
    flex: 1,
    margin: 6,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryItemSelected: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  categoryItemIcon: { fontSize: 28, marginBottom: 6 },
  categoryItemName: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default AddTransactionScreen;
