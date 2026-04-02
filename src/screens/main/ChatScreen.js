// ============================================================
// Household Chat Screen
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { deleteChatMessage, getChatThreadId, sendChatMessage, subscribeToChatMessages } from '@services/firebase/chat';

export const ChatScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const householdId = profile?.householdId || user?.uid;
  const threadId = useMemo(() => getChatThreadId(householdId), [householdId]);

  useEffect(() => {
    if (!householdId) return undefined;
    const unsub = subscribeToChatMessages(threadId, setMessages);
    return unsub;
  }, [threadId, householdId]);

  const handleSend = async () => {
    const value = text.trim();
    if (!value) return;
    const { error } = await sendChatMessage({
      threadId,
      householdId,
      senderUid: user?.uid,
      senderName: user?.displayName || user?.email || t('profile.fallbackUser'),
      text: value,
    });
    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }
    setText('');
  };

  const handleDeleteMessage = (message) => {
    if (message.senderUid !== user?.uid) return;

    Alert.alert(
      t('common.delete'),
      t('chat.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteChatMessage(message.id);
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>{t('chat.title')}</Text>
            <Text style={styles.subtitle}>{t('chat.subtitle')}</Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isMine = item.senderUid === user?.uid;
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onLongPress={() => handleDeleteMessage(item)}
                style={[styles.bubble, isMine ? styles.mine : styles.theirs]}
              >
                <View style={styles.bubbleTop}>
                  <Text
                    style={[styles.sender, isMine ? styles.senderMine : styles.senderTheirs]}
                    numberOfLines={1}
                  >
                    {item.senderName}
                  </Text>
                  {isMine ? (
                    <View style={styles.myBadge}>
                      <Text style={styles.myBadgeText}>{t('chat.me')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.message, isMine ? styles.messageMine : styles.messageTheirs]}>
                  {item.text}
                </Text>
                {isMine ? <Text style={styles.hint}>{t('chat.deleteHint')}</Text> : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>{t('chat.empty')}</Text>}
        />

        <View style={styles.composerShell}>
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.85}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
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
    gap: 12,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTextWrap: { flex: 1 },
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
  title: { color: colors.textPrimary, fontFamily: FONT_FAMILY.bold, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold },
  subtitle: { color: colors.textMuted, fontFamily: FONT_FAMILY.regular, fontSize: FONT_SIZE.xs, marginTop: 2 },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl, backgroundColor: colors.background },
  bubble: {
    maxWidth: '84%',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderRadius: 22,
    marginBottom: SPACING.md,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: `${colors.primary}88`,
    shadowColor: colors.primary,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderBottomRightRadius: 8,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    borderBottomLeftRadius: 8,
  },
  bubbleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  sender: {
    flex: 1,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.semibold,
  },
  senderMine: { color: 'rgba(255,255,255,0.82)' },
  senderTheirs: { color: colors.textMuted },
  message: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    lineHeight: 22,
  },
  messageMine: { color: '#FFFFFF' },
  messageTheirs: { color: colors.textPrimary },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 10,
  },
  myBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  myBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontFamily: FONT_FAMILY.regular },
  composerShell: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.xs,
    backgroundColor: colors.background,
  },
  composer: {
    flexDirection: 'row',
    gap: 10,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: FONT_FAMILY.regular,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

export default ChatScreen;
