// ============================================================
// Categories Screen (manage default + custom categories)
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput, ScrollView, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { selectCategories, selectCategoriesLoading } from '@store/categorySlice';
import { addCategory, deleteCategory } from '@services/firebase/categories';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import LoadingState from '@components/common/LoadingState';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

// Available icons for category picker
const ICON_OPTIONS = ['🏠','🍔','🚗','🎬','💊','📚','✈️','🛍️','👕','💆','🎁','💼','💻','📈','🏢','🏘️','🎉','💰','📦','🐾','⚽','🎵','🍷','☕','🏋️','🌿','💡','🔧'];
export const CategoriesScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1100;
  const numColumns = isLargeTablet ? 5 : isTablet ? 4 : 3;
  const user = useSelector(selectUser);
  const categories = useSelector(selectCategories);
  const categoriesLoading = useSelector(selectCategoriesLoading);
  const { colors } = useAppTheme();
  const styles = createStyles(colors, { isTablet, isLargeTablet });
  const { t } = useTranslation();
  const COLOR_OPTIONS = colors.chart;
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    icon: '📦',
    color: colors.primary,
    type: 'expense',
  });
  const [activeType, setActiveType] = useState('expense');

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const getCategoryDisplayName = (category) => {
    // If it's a default category, use translation, otherwise use the custom name
    if (category.isDefault && category.id) {
      const translatedName = t(`categories.names.${category.id}`);
      // If translation key doesn't exist, it returns the key itself, so check if it's different
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category.name;
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert(t('common.error'), t('categories.categoryNameRequired')); return; }
    setLoading(true);
    const { id, error } = await addCategory(user.uid, form);
    setLoading(false);
    if (error) Alert.alert(t('common.error'), error);
    else {
      setShowAddModal(false);
      setForm({ name: '', icon: '📦', color: colors.primary, type: 'expense' });
    }
  };

  const handleDelete = (cat) => {
    if (cat.isDefault) { Alert.alert(t('categories.cannotDelete'), t('categories.defaultCategoriesNoDelete')); return; }
    Alert.alert(t('categories.deleteCategory'), t('categories.removeCategory', { name: getCategoryDisplayName(cat) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
        },
      },
    ]);
  };

  const filtered = categories.filter((c) => c.type === activeType || c.type === 'both');

  if (categoriesLoading && filtered.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('categories.title')}</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: `${colors.primary}20` }]} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </LinearGradient>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('categories.title')}</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: `${colors.primary}20` }]} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Type Toggle */}
      <View style={[styles.typeToggle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {['expense', 'income'].map((typeVal) => (
          <TouchableOpacity
            key={typeVal}
            style={[styles.typeBtn, activeType === typeVal && { backgroundColor: colors.primary }]}
            onPress={() => setActiveType(typeVal)}
          >
            <Text style={[styles.typeBtnText, { color: activeType === typeVal ? '#FFF' : colors.textMuted }]}>
              {typeVal === 'expense' ? `💸 ${t('common.expense')}` : `💰 ${t('common.income')}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        key={`categories-${numColumns}`}
        numColumns={numColumns}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBg, { backgroundColor: `${item.color}25` }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={[styles.catName, { color: colors.textSecondary }]} numberOfLines={2}>{getCategoryDisplayName(item)}</Text>
            {item.isCustom && (
              <View style={[styles.customBadge, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.customBadgeText, { color: colors.primary }]}>{t('categories.custom')}</Text>
              </View>
            )}
            {!item.isDefault && (
              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="close-circle" size={16} color={colors.expense} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Add Category Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('categories.newCategory')}</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <Input
                label={t('categories.categoryName')}
                value={form.name}
                onChangeText={setField('name')}
                placeholder={t('categories.placeholder_category')}
                icon="pricetag-outline"
              />

              {/* Type for new category */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('categories.type')}</Text>
              <View style={styles.modalTypeToggle}>
                {['expense', 'income', 'both'].map((typeVal) => (
                  <TouchableOpacity
                    key={typeVal}
                    style={[
                      styles.modalTypeBtn,
                      {
                        borderColor: colors.border,
                        backgroundColor: form.type === typeVal ? `${colors.primary}15` : colors.background,
                      },
                      form.type === typeVal && { borderColor: colors.primary }
                    ]}
                    onPress={() => setField('type')(typeVal)}
                  >
                    <Text style={[
                      styles.modalTypeBtnText,
                      form.type === typeVal && { color: colors.primary },
                      { color: form.type === typeVal ? colors.primary : colors.textMuted }
                    ]}>
                      {typeVal === 'expense' ? t('common.expense') : typeVal === 'income' ? t('common.income') : t('common.both')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon picker */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('categories.icon')}</Text>
              <View style={styles.iconPicker}>
                {ICON_OPTIONS.map((ico) => (
                  <TouchableOpacity
                    key={ico}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: colors.background,
                        borderColor: form.icon === ico ? colors.primary : 'transparent'
                      },
                      form.icon === ico && { backgroundColor: `${colors.primary}20` }
                    ]}
                    onPress={() => setField('icon')(ico)}
                  >
                    <Text style={styles.iconOptionText}>{ico}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color picker */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('categories.color')}</Text>
              <View style={styles.colorPicker}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      form.color === color && styles.colorSwatchSelected
                    ]}
                    onPress={() => setField('color')(color)}
                  />
                ))}
              </View>

              {/* Preview */}
              <View style={[styles.preview, { backgroundColor: colors.background }]}>
                <View style={[styles.previewIcon, { backgroundColor: `${form.color}25` }]}>
                  <Text style={{ fontSize: 28 }}>{form.icon}</Text>
                </View>
                <Text style={[styles.previewName, { color: form.color }]}>{form.name || t('categories.categoryName')}</Text>
              </View>

              <Button title={t('categories.addCategory')} onPress={handleAdd} loading={loading} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isTablet, isLargeTablet }) => StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    marginVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4, borderWidth: 1,
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
  },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  typeBtnActive: { },
  typeBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  typeBtnTextActive: { },
  list: {
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.md,
    paddingBottom: SPACING.xxl,
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
  },
  categoryCard: {
    flex: 1, margin: 6, alignItems: 'center', padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, minHeight: 100,
    position: 'relative', ...SHADOWS.sm,
  },
  iconBg: { width: 52, height: 52, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon: { fontSize: 26 },
  catName: { fontSize: FONT_SIZE.xs, textAlign: 'center', fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  customBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  customBadgeText: { fontSize: 9, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
  deleteIcon: { position: 'absolute', top: 4, right: 4 },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '90%',
    width: '100%',
    maxWidth: isTablet ? 720 : '100%',
    alignSelf: 'center',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold },
  fieldLabel: { fontSize: FONT_SIZE.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium, marginBottom: SPACING.sm },
  modalTypeToggle: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  modalTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, alignItems: 'center',
  },
  modalTypeBtnActive: { },
  modalTypeBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  iconPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  iconOption: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  iconOptionSelected: { },
  iconOptionText: { fontSize: 22 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.lg },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  colorSwatchSelected: { borderWidth: 3, borderColor: colors.textPrimary },
  preview: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg },
  previewIcon: { width: 48, height: 48, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold },
});

export default CategoriesScreen;
