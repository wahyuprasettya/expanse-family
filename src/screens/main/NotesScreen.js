// ============================================================
// Notes Screen (Simple Kanban)
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { addNote, deleteNote, subscribeToNotes, updateNote } from '@services/firebase/notes';

const BOARD_COLUMNS = ['todo', 'doing', 'done'];

export const NotesScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;
  const [notes, setNotes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
  });

  useEffect(() => {
    if (!accountId) return undefined;

    const unsubscribe = subscribeToNotes(accountId, setNotes);
    return unsubscribe;
  }, [accountId]);

  const groupedNotes = useMemo(
    () => BOARD_COLUMNS.reduce((acc, status) => {
      acc[status] = notes.filter((note) => note.status === status);
      return acc;
    }, {}),
    [notes]
  );

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAddNote = async () => {
    if (!form.title.trim()) {
      Alert.alert(t('common.error'), t('notes.titleRequired'));
      return;
    }

    setLoading(true);
    const { error } = await addNote({
      accountId,
      userId: user?.uid,
      authorName: user?.displayName || user?.email || t('profile.fallbackUser'),
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }

    setForm({ title: '', description: '', status: 'todo' });
    setShowAddModal(false);
  };

  const handleMoveNote = async (note, nextStatus) => {
    const { error } = await updateNote(note.id, { status: nextStatus });
    if (error) {
      Alert.alert(t('common.error'), error);
    }
  };

  const handleDeleteNote = (note) => {
    Alert.alert(
      t('notes.deleteTitle'),
      t('notes.deleteMessage', { title: note.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteNote(note.id);
            if (error) {
              Alert.alert(t('common.error'), error);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>{t('notes.title')}</Text>
          <Text style={styles.subtitle}>{t('notes.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.board}>
        {BOARD_COLUMNS.map((status) => (
          <View key={status} style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>{t(`notes.status.${status}`)}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{groupedNotes[status]?.length || 0}</Text>
              </View>
            </View>

            {groupedNotes[status]?.length ? groupedNotes[status].map((note) => (
              <TouchableOpacity
                key={note.id}
                activeOpacity={0.88}
                onLongPress={() => handleDeleteNote(note)}
                style={styles.noteCard}
              >
                <Text style={styles.noteTitle}>{note.title}</Text>
                {note.description ? (
                  <Text style={styles.noteDescription} numberOfLines={4}>{note.description}</Text>
                ) : null}
                <Text style={styles.noteMeta}>{note.authorName || t('profile.fallbackUser')}</Text>
                <View style={styles.noteActions}>
                  {status !== 'todo' ? (
                    <TouchableOpacity style={styles.noteActionBtn} onPress={() => handleMoveNote(note, BOARD_COLUMNS[BOARD_COLUMNS.indexOf(status) - 1])}>
                      <Ionicons name="arrow-back" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : <View style={styles.noteActionSpacer} />}
                  {status !== 'done' ? (
                    <TouchableOpacity style={styles.noteActionBtn} onPress={() => handleMoveNote(note, BOARD_COLUMNS[BOARD_COLUMNS.indexOf(status) + 1])}>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </TouchableOpacity>
                  ) : <View style={styles.noteActionSpacer} />}
                </View>
              </TouchableOpacity>
            )) : (
              <View style={styles.emptyColumn}>
                <Text style={styles.emptyColumnText}>{t('notes.emptyColumn')}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notes.newNote')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('notes.noteTitle')}</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={setField('title')}
              placeholder={t('notes.noteTitlePlaceholder')}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.inputLabel}>{t('common.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={setField('description')}
              placeholder={t('notes.noteDescriptionPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.inputLabel}>{t('notes.startIn')}</Text>
            <View style={styles.statusRow}>
              {BOARD_COLUMNS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusChip, form.status === status && styles.statusChipActive]}
                  onPress={() => setField('status')(status)}
                >
                  <Text style={[styles.statusChipText, form.status === status && styles.statusChipTextActive]}>
                    {t(`notes.status.${status}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddNote} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? t('common.loading') : t('notes.addNote')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTextWrap: { flex: 1 },
  title: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold },
  subtitle: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.primary}18`,
  },
  board: { padding: SPACING.lg, gap: SPACING.md },
  column: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  columnTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.semibold },
  countBadge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
  },
  countText: { color: colors.primary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.semibold },
  noteCard: {
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.sm,
  },
  noteTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.semibold },
  noteDescription: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginTop: 6, lineHeight: 20 },
  noteMeta: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 10 },
  noteActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  noteActionBtn: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteActionSpacer: { width: 32, height: 32 },
  emptyColumn: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyColumnText: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  modalTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold },
  inputLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.medium, marginBottom: 6, marginTop: SPACING.sm },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    color: colors.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontFamily: FONT_FAMILY.regular,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipActive: { backgroundColor: `${colors.primary}18`, borderColor: colors.primary },
  statusChipText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.medium },
  statusChipTextActive: { color: colors.primary },
  saveBtn: {
    marginTop: SPACING.lg,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.semibold },
});

export default NotesScreen;
