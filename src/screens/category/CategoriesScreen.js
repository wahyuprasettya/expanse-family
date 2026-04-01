// ============================================================
// Categories Screen (manage default + custom categories)
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { selectCategories, setCategories, addCategoryLocal, removeCategoryLocal } from '@store/categorySlice';
import { subscribeToCategories, addCategory, deleteCategory } from '@services/firebase/categories';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import { Colors, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';

// Available icons for category picker
const ICON_OPTIONS = ['🏠','🍔','🚗','🎬','💊','📚','✈️','🛍️','👕','💆','🎁','💼','💻','📈','🏢','🏘️','🎉','💰','📦','🐾','⚽','🎵','🍷','☕','🏋️','🌿','💡','🔧'];
const COLOR_OPTIONS = Colors.chart;

export const CategoriesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const categories = useSelector(selectCategories);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    icon: '📦',
    color: Colors.primary,
    type: 'expense',
  });
  const [activeType, setActiveType] = useState('expense');

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToCategories(user.uid, (cats) => {
      dispatch(setCategories(cats));
    });
    return unsubscribe;
  }, [user?.uid, dispatch]);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Category name is required'); return; }
    setLoading(true);
    const { id, error } = await addCategory(user.uid, form);
    setLoading(false);
    if (error) Alert.alert('Error', error);
    else {
      dispatch(addCategoryLocal({ id, ...form, isCustom: true }));
      setShowAddModal(false);
      setForm({ name: '', icon: '📦', color: Colors.primary, type: 'expense' });
    }
  };

  const handleDelete = (cat) => {
    if (cat.isDefault) { Alert.alert('Cannot Delete', 'Default categories cannot be removed'); return; }
    Alert.alert('Delete Category', `Remove "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteCategory(cat.id);
          dispatch(removeCategoryLocal(cat.id));
        },
      },
    ]);
  };

  const filtered = categories.filter((c) => c.type === activeType || c.type === 'both');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Type Toggle */}
      <View style={styles.typeToggle}>
        {['expense', 'income'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, activeType === t && styles.typeBtnActive]}
            onPress={() => setActiveType(t)}
          >
            <Text style={[styles.typeBtnText, activeType === t && styles.typeBtnTextActive]}>
              {t === 'expense' ? '💸 Expense' : '💰 Income'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.categoryCard}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBg, { backgroundColor: `${item.color}25` }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={styles.catName} numberOfLines={2}>{item.name}</Text>
            {item.isCustom && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
            {!item.isDefault && (
              <TouchableOpacity
                style={styles.deleteIcon}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="close-circle" size={16} color={Colors.expense} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Add Category Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Category</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label="Category Name"
              value={form.name}
              onChangeText={setField('name')}
              placeholder="e.g. Coffee & Cafe"
              icon="pricetag-outline"
            />

            {/* Type for new category */}
            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.modalTypeToggle}>
              {['expense', 'income', 'both'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.modalTypeBtn, form.type === t && styles.modalTypeBtnActive]}
                  onPress={() => setField('type')(t)}
                >
                  <Text style={[styles.modalTypeBtnText, form.type === t && { color: Colors.primary }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon picker */}
            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconPicker}>
              {ICON_OPTIONS.map((ico) => (
                <TouchableOpacity
                  key={ico}
                  style={[styles.iconOption, form.icon === ico && styles.iconOptionSelected]}
                  onPress={() => setField('icon')(ico)}
                >
                  <Text style={styles.iconOptionText}>{ico}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color picker */}
            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorPicker}>
              {COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, form.color === color && styles.colorSwatchSelected]}
                  onPress={() => setField('color')(color)}
                />
              ))}
            </View>

            {/* Preview */}
            <View style={styles.preview}>
              <View style={[styles.previewIcon, { backgroundColor: `${form.color}25` }]}>
                <Text style={{ fontSize: 28 }}>{form.icon}</Text>
              </View>
              <Text style={[styles.previewName, { color: form.color }]}>{form.name || 'Category Name'}</Text>
            </View>

            <Button title="Add Category" onPress={handleAdd} loading={loading} />
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
  typeToggle: {
    flexDirection: 'row', margin: SPACING.lg,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: 4, borderWidth: 1, borderColor: Colors.border,
  },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  typeBtnActive: { backgroundColor: Colors.primary },
  typeBtnText: { color: Colors.textMuted, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  typeBtnTextActive: { color: '#FFF' },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl },
  categoryCard: {
    flex: 1, margin: 6, alignItems: 'center', padding: SPACING.md,
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: Colors.border, minHeight: 100,
    position: 'relative', ...SHADOWS.sm,
  },
  iconBg: { width: 52, height: 52, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon: { fontSize: 26 },
  catName: { color: Colors.textSecondary, fontSize: FONT_SIZE.xs, textAlign: 'center', fontWeight: FONT_WEIGHT.medium },
  customBadge: {
    backgroundColor: `${Colors.primary}20`, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2, marginTop: 4,
  },
  customBadgeText: { color: Colors.primary, fontSize: 9, fontWeight: FONT_WEIGHT.bold },
  deleteIcon: { position: 'absolute', top: 4, right: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  fieldLabel: { color: Colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', marginBottom: SPACING.sm },
  modalTypeToggle: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  modalTypeBtn: {
    flex: 1, paddingVertical: 8, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  modalTypeBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  modalTypeBtnText: { color: Colors.textMuted, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  iconPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.md },
  iconOption: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 1.5, borderColor: 'transparent' },
  iconOptionSelected: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  iconOptionText: { fontSize: 22 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.lg },
  colorSwatch: { width: 30, height: 30, borderRadius: 15 },
  colorSwatchSelected: { borderWidth: 3, borderColor: '#FFF' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md, padding: SPACING.md, backgroundColor: Colors.background, borderRadius: BORDER_RADIUS.lg },
  previewIcon: { width: 48, height: 48, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
});

export default CategoriesScreen;
