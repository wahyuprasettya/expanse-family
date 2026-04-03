// ============================================================
// Notes Screen (Simple Kanban)
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import {
  BORDER_RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  SPACING,
  SHADOWS,
} from '@constants/theme';
import {
  addNote,
  deleteNote,
  subscribeToNotes,
  updateNote,
} from '@services/firebase/notes';
import { getHouseholdMembers } from '@services/firebase/users';
import LoadingState from '@components/common/LoadingState';

const BOARD_COLUMNS = ['todo', 'doing', 'done'];

const emptyForm = {
  title: '',
  description: '',
  status: 'todo',
  assignedToUid: '',
  assignedToName: '',
};

export const NotesScreen = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;
  const [notes, setNotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!accountId) {
      setNotes([]);
      setNotesLoading(false);
      return undefined;
    }

    setNotesLoading(true);
    const unsubscribe = subscribeToNotes(accountId, (items) => {
      setNotes(items);
      setNotesLoading(false);
    });
    return unsubscribe;
  }, [accountId]);

  useEffect(() => {
    let isMounted = true;

    const loadMembers = async () => {
      setMembersLoading(true);
      const { members: fetchedMembers, error } = await getHouseholdMembers(accountId);

      if (!isMounted) return;

      if (error) {
        setMembers([]);
        setMembersLoading(false);
        return;
      }

      setMembers(fetchedMembers);
      setMembersLoading(false);
    };

    if (accountId) {
      loadMembers();
    } else {
      setMembers([]);
      setMembersLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [accountId]);

  const groupedNotes = useMemo(
    () => BOARD_COLUMNS.reduce((acc, status) => {
      acc[status] = notes.filter((note) => note.status === status);
      return acc;
    }, {}),
    [notes]
  );

  const setField = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(emptyForm);
  };

  const getCurrentUserName = () => user?.displayName || user?.email || t('profile.fallbackUser');

  const handleAssignMember = (member) => {
    setForm((prev) => ({
      ...prev,
      assignedToUid: member?.uid || '',
      assignedToName: member?.displayName || '',
    }));
  };

  const closeManageModal = () => {
    setSelectedNote(null);
    resetForm();
    setShowManageModal(false);
  };

  const handleAddNote = async () => {
    if (!form.title.trim()) {
      Alert.alert(t('common.error'), t('notes.titleRequired'));
      return;
    }

    setLoading(true);
    const { error } = await addNote({
      accountId,
      userId: user?.uid,
      authorName: getCurrentUserName(),
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      assignedToUid: form.assignedToUid || null,
      assignedToName: form.assignedToName || '',
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleMoveNote = async (note, nextStatus) => {
    const { error } = await updateNote(note.id, { status: nextStatus }, {
      userId: user?.uid,
      authorName: getCurrentUserName(),
    });
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

  const openManageModal = (note) => {
    setSelectedNote(note);
    setForm({
      title: note.title || '',
      description: note.description || '',
      status: note.status || 'todo',
      assignedToUid: note.assignedToUid || '',
      assignedToName: note.assignedToName || '',
    });
    setShowManageModal(true);
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;
    if (!form.title.trim()) {
      Alert.alert(t('common.error'), t('notes.titleRequired'));
      return;
    }

    setLoading(true);
    const { error } = await updateNote(selectedNote.id, {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      assignedToUid: form.assignedToUid || null,
      assignedToName: form.assignedToName || '',
    }, {
      userId: user?.uid,
      authorName: getCurrentUserName(),
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }

    closeManageModal();
  };

  const renderAssigneeSelector = () => (
    <View style={styles.statusRow}>
      <TouchableOpacity
        style={[styles.statusChip, !form.assignedToUid && styles.statusChipActive]}
        onPress={() => handleAssignMember(null)}
      >
        <Text style={[styles.statusChipText, !form.assignedToUid && styles.statusChipTextActive]}>
          {t('notes.noAssignee')}
        </Text>
      </TouchableOpacity>
      {members.map((member) => {
        const isActive = form.assignedToUid === member.uid;
        return (
          <TouchableOpacity
            key={member.uid}
            style={[styles.statusChip, isActive && styles.statusChipActive]}
            onPress={() => handleAssignMember(member)}
          >
            <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
              {member.displayName}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const canCollaborate = members.length > 1;
  const columnWidth = Math.min(320, Math.max(260, screenWidth - (SPACING.lg * 2)));
  const boardMinHeight = Math.max(320, screenHeight - 220);

  if ((notesLoading || membersLoading) && notes.length === 0) {
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
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <LoadingState />
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          style={styles.addBtn}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.boardWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.board, { minHeight: boardMinHeight }]}
          style={styles.boardScroll}
        >
          {BOARD_COLUMNS.map((status) => (
            <View key={status} style={[styles.column, { width: columnWidth }]}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnTitle}>{t(`notes.status.${status}`)}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{groupedNotes[status]?.length || 0}</Text>
                </View>
              </View>

              <ScrollView
                style={styles.columnScroll}
                contentContainerStyle={[
                  styles.columnContent,
                  !groupedNotes[status]?.length && styles.columnContentEmpty,
                ]}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {groupedNotes[status]?.length ? groupedNotes[status].map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    activeOpacity={0.88}
                    onPress={() => openManageModal(note)}
                    onLongPress={() => handleDeleteNote(note)}
                    style={styles.noteCard}
                  >
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    {note.description ? (
                      <Text style={styles.noteDescription} numberOfLines={4}>{note.description}</Text>
                    ) : null}
                    <Text style={styles.noteMeta}>
                      {t('notes.noteCreatedBy', { name: note.authorName || t('profile.fallbackUser') })}
                    </Text>
                    <View style={styles.assigneeBadge}>
                      <Ionicons name="person-outline" size={12} color={colors.primary} />
                      <Text style={styles.assigneeBadgeText}>
                        {note.assignedToName
                          ? t('notes.noteAssignedTo', { name: note.assignedToName })
                          : t('notes.noAssignee')}
                      </Text>
                    </View>
                    <View style={styles.noteActions}>
                      {status !== 'todo' ? (
                        <TouchableOpacity
                          style={styles.noteActionBtn}
                          onPress={() => handleMoveNote(note, BOARD_COLUMNS[BOARD_COLUMNS.indexOf(status) - 1])}
                        >
                          <Ionicons name="arrow-back" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      ) : <View style={styles.noteActionSpacer} />}
                      {status !== 'done' ? (
                        <TouchableOpacity
                          style={styles.noteActionBtn}
                          onPress={() => handleMoveNote(note, BOARD_COLUMNS[BOARD_COLUMNS.indexOf(status) + 1])}
                        >
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
              </ScrollView>
            </View>
          ))}
        </ScrollView>
      </View>

      {!canCollaborate ? (
        <View style={styles.infoBanner}>
          <Ionicons name="people-outline" size={16} color={colors.primary} />
          <Text style={styles.infoBannerText}>{t('notes.householdOnly')}</Text>
        </View>
      ) : null}

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

            <Text style={styles.inputLabel}>{t('notes.assignedTo')}</Text>
            <Text style={styles.inputHint}>{t('notes.assignHint')}</Text>
            {renderAssigneeSelector()}

            <TouchableOpacity style={styles.saveBtn} onPress={handleAddNote} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? t('common.loading') : t('notes.addNote')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showManageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('notes.editNote')}</Text>
              <TouchableOpacity onPress={closeManageModal}>
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

            <Text style={styles.inputLabel}>{t('notes.statusLabel')}</Text>
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

            <Text style={styles.inputLabel}>{t('notes.assignedTo')}</Text>
            {renderAssigneeSelector()}

            <TouchableOpacity
              style={[styles.saveBtn, styles.secondaryBtn]}
              onPress={() => handleAssignMember({ uid: user?.uid, displayName: getCurrentUserName() })}
            >
              <Text style={styles.secondaryBtnText}>{t('notes.assignToMe')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateNote} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? t('common.loading') : t('notes.saveChanges')}</Text>
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
  boardWrap: { flex: 1 },
  boardScroll: { flex: 1 },
  board: { padding: SPACING.lg, gap: SPACING.md, alignItems: 'stretch' },
  column: {
    flexShrink: 0,
    height: '100%',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  columnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  columnScroll: { flex: 1 },
  columnContent: { paddingBottom: SPACING.xs },
  columnContentEmpty: { flexGrow: 1 },
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
  assigneeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.primary}14`,
  },
  assigneeBadgeText: { color: colors.primary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.medium },
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
    flex: 1,
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
  inputHint: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginBottom: 2 },
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
  secondaryBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: SPACING.md,
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.semibold },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    marginTop: -SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  infoBannerText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
  },
});

export default NotesScreen;
