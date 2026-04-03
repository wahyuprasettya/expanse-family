// ============================================================
// Profile Screen (Settings, PIN, Categories, Export)
// ============================================================
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSelector, useDispatch } from "react-redux";
import { selectUser, selectProfile, setProfile, setUser, logout as clearAuthState } from "@store/authSlice";
import { updateUserProfile } from "../../services/firebase/users";
import {
  selectLanguage,
  selectTheme,
  setLanguage,
  setTheme,
} from "@store/uiSlice";
import { useTranslation } from "@hooks/useTranslation";
import { saveLanguagePreference } from "@services/language";
import {
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  FONT_FAMILY,
  SPACING,
  SHADOWS,
} from "@constants/theme";
import {
  updateThemePreference,
  updateBiometricEnabled,
} from "@services/firebase/users";
import { logoutUser } from "@services/firebase/auth";
import { useAppTheme } from "@hooks/useAppTheme";
import { useBiometric } from "@hooks/useBiometric";
import { updateProfile } from "firebase/auth";
import { auth } from "@services/firebase/config";

const SettingRow = ({
  colors,
  styles,
  icon,
  label,
  subtitle,
  onPress,
  rightElement,
  color,
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View
      style={[
        styles.settingIcon,
        { backgroundColor: `${color || colors.primary}20` },
      ]}
    >
      <Ionicons name={icon} size={20} color={color || colors.primary} />
    </View>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement ||
      (onPress && (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ))}
  </TouchableOpacity>
);

export const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t, language, availableLanguages } = useTranslation();
  const { colors, themeMode } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const activeLanguage = useSelector(selectLanguage);
  const activeTheme = useSelector(selectTheme);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isBiometricSupported } = useBiometric();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const notAuthenticatedMessage = language === "en" ? "Please sign in again." : "Silakan login kembali.";

  const handleConfirmLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      dispatch(clearAuthState());
      return;
    }

    Alert.alert(t("common.error"), error);
  };

  const handleLogout = () => {
    Alert.alert(t("profile.signOutTitle"), t("profile.signOutMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("profile.signOut"), style: "destructive", onPress: handleConfirmLogout },
    ]);
  };

  const handleLanguageChange = () => {
    const nextLanguage = activeLanguage === "id" ? "en" : "id";
    dispatch(setLanguage(nextLanguage));
    saveLanguagePreference(nextLanguage);
  };

  const handleThemeChange = async (nextTheme) => {
    const previousTheme = activeTheme;

    dispatch(setTheme(nextTheme));
    if (profile) {
      dispatch(setProfile({ ...profile, theme: nextTheme }));
    }

    if (!user?.uid) return;

    const { error } = await updateThemePreference(user.uid, nextTheme);
    if (error) {
      dispatch(setTheme(previousTheme));
      if (profile) {
        dispatch(setProfile({ ...profile, theme: previousTheme }));
      }
      Alert.alert(t("common.error"), error);
    }
  };

  const openThemePicker = () => {
    Alert.alert(
      t("profile.themeMode"),
      t("profile.themeModeSubtitle"),
      [
        { text: t("profile.themeSystem"), onPress: () => handleThemeChange("system") },
        { text: t("profile.themeLight"), onPress: () => handleThemeChange("light") },
        { text: t("profile.themeDark"), onPress: () => handleThemeChange("dark") },
        { text: t("common.cancel"), style: "cancel" },
      ]
    );
  };

  const handleBiometricChange = async (enabled) => {
    if (!isBiometricSupported) {
      Alert.alert(t("common.error"), t("profile.biometricNotSupported"));
      return;
    }

    const previousValue = profile?.biometricEnabled || false;

    // Update local state immediately
    if (profile) {
      dispatch(setProfile({ ...profile, biometricEnabled: enabled }));
    }

    if (!user?.uid) return;

    const { error } = await updateBiometricEnabled(user.uid, enabled);
    if (error) {
      // Revert on error
      if (profile) {
        dispatch(setProfile({ ...profile, biometricEnabled: previousValue }));
      }
      Alert.alert(t("common.error"), error);
    }
  };

  const handleEditProfile = () => {
    setEditName(user?.displayName || "");
    setEditEmail(user?.email || "");
    setShowEditModal(true);
  };

  // const handleSaveProfile = async () => {
  //   if (!editName.trim()) {
  //     Alert.alert(t("common.error"), t("profile.nameRequired"));
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     // Update Firebase Auth profile
  //     await updateProfile(auth.currentUser, {
  //       displayName: editName.trim(),
  //     });

  //     // Update Firestore profile
  //     const { error } = await updateUserProfile(user.uid, {
  //       displayName: editName.trim(),
  //     });

  //     try {
  //       await updateUserProfile(user.uid, {
  //         displayName: editName.trim(),
  //       });
  //     } catch (error) {
  //       console.log(error);
  //     }

  //     if (error) {
  //       Alert.alert(t("common.error"), error);
  //       return;
  //     }

  //     // Update local state
  //     dispatch(setProfile({ ...profile, displayName: editName.trim() }));

  //     setShowEditModal(false);
  //     Alert.alert(t("common.success"), t("profile.profileUpdated"));
  //   } catch (error) {
  //     Alert.alert(t("common.error"), error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert(t("common.error"), t("profile.nameRequired"));
      return;
    }

    if (!user?.uid || !auth.currentUser) {
      Alert.alert(t("common.error"), notAuthenticatedMessage);
      return;
    }

    const nextDisplayName = editName.trim();

    setLoading(true);
    try {
      // Update Firebase Auth
      await updateProfile(auth.currentUser, {
        displayName: nextDisplayName,
      });

      // Update Firestore
      const { error } = await updateUserProfile(user.uid, {
        displayName: nextDisplayName,
      });

      if (error) {
        Alert.alert(t("common.error"), error);
        return;
      }

      // Keep auth and profile state in sync so the new name appears immediately.
      dispatch(setUser({
        ...user,
        displayName: nextDisplayName,
      }));
      dispatch(setProfile(profile ? { ...profile, displayName: nextDisplayName } : { displayName: nextDisplayName }));

      setShowEditModal(false);
      Alert.alert(t("common.success"), t("profile.profileUpdated"));
    } catch (error) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setLoading(false);
    }
  };

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <LinearGradient colors={colors.gradients.primary} style={styles.header}>

          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLetters}>{initials}</Text>
          </View>
          <Text style={styles.name}>
            {user?.displayName || t("profile.fallbackUser")}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.memberBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#FFF" />
            <Text style={styles.memberText}>{t("profile.member")}</Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Account Section */}
          <Text style={styles.sectionTitle}>{t("profile.account")}</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              colors={colors}
              styles={styles}
              icon="person-outline"
              label={t("profile.editProfile")}
              subtitle={user?.displayName}
              color={colors.primary}
              onPress={handleEditProfile}
            />
            {/* <SettingRow
              colors={colors}
              styles={styles}
              icon="keypad-outline"
              label={t("profile.changePin")}
              subtitle={t("profile.updateSecurityPin")}
              color={colors.info}
              onPress={() => navigation.navigate("Pin", { mode: "setup" })}
            /> */}
            {/* <SettingRow
              colors={colors}
              styles={styles}
              icon="finger-print-outline"
              label={t("profile.biometricLogin")}
              subtitle={t("profile.fingerprintFaceId")}
              color={colors.secondary}
              onPress={() => {}}
              rightElement={
                <Switch
                  value={profile?.biometricEnabled || false}
                  onValueChange={handleBiometricChange}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            /> */}
          </View>

          {/* Preferences */}
          <Text style={styles.sectionTitle}>{t("profile.preferences")}</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              colors={colors}
              styles={styles}
              icon="notifications-outline"
              label={t("profile.pushNotifications")}
              color={colors.warning}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ true: colors.primary }}
                  thumbColor="#FFF"
                />
              }
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="moon-outline"
              label={t("profile.themeMode")}
              subtitle={t(`profile.themeValue.${themeMode}`)}
              color={colors.primaryLight}
              onPress={openThemePicker}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="language-outline"
              label={t("profile.language")}
              subtitle={t("profile.currentLanguage", {
                language: availableLanguages[language],
              })}
              color={colors.info}
              onPress={handleLanguageChange}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="flag-outline"
              label={t("profile.currency")}
              subtitle={t("profile.currencyValue")}
              color={colors.income}
              onPress={() => { }}
            />
          </View>

          {/* Data Section */}
          <Text style={styles.sectionTitle}>{t("profile.dataPrivacy")}</Text>
          <View style={styles.settingsCard}>
            <SettingRow
              colors={colors}
              styles={styles}
              icon="people-outline"
              label={t("profile.household")}
              subtitle={
                profile?.householdRole === "partner"
                  ? t("profile.householdConnected")
                  : t("profile.householdInvite")
              }
              color={colors.primary}
              onPress={() => navigation.navigate("Household")}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="clipboard-outline"
              label={t("notes.title")}
              subtitle={t("notes.subtitle")}
              color={colors.warning}
              onPress={() => navigation.navigate("Notes")}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="folder-outline"
              label={t("profile.categories")}
              subtitle={t("profile.manageCategories")}
              color={colors.info}
              onPress={() => navigation.navigate("Categories")}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="diamond-outline"
              label={t("profile.assets")}
              subtitle={t("profile.manageAssets")}
              color={colors.warning}
              onPress={() => navigation.navigate("Assets")}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="cloud-upload-outline"
              label={t("profile.backupSync")}
              subtitle={t("profile.lastSynced", { time: t("common.justNow") })}
              color={colors.primary}
              onPress={() => { }}
            />
            <SettingRow
              colors={colors}
              styles={styles}
              icon="download-outline"
              label={t("profile.exportData")}
              subtitle={t("profile.csvPdf")}
              color={colors.warning}
              onPress={() => navigation.navigate("Reports")}
            />
          </View>

          <Text style={styles.sectionTitle}>{t("profile.about")}</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutIconWrap}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.aboutText}>{t("profile.dedication")}</Text>
          </View>

          {/* Sign Out */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.expense} />
            <Text style={styles.logoutText}>{t("profile.signOut")}</Text>
          </TouchableOpacity>

          <Text style={styles.version}>WP App v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.editForm}>
              <Text style={styles.inputLabel}>{t("profile.displayName")}</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t("profile.enterDisplayName")}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <Text style={styles.inputLabel}>{t("profile.email")}</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  value={editEmail}
                  editable={false}
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.emailNote}>
                  {t("profile.emailCannotChange")}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>{t("common.save")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scrollContent: {
      paddingBottom: SPACING.xxl,
    },
    header: {
      alignItems: "center",
      paddingTop: SPACING.xl,
      paddingBottom: SPACING.xxl,
      paddingHorizontal: SPACING.lg,

    },
    avatarLarge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.3)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.5)",
      marginBottom: SPACING.md,
    },
    avatarLetters: {
      color: "#FFF",
      fontSize: FONT_SIZE.xxl,
      // fontWeight: FONT_WEIGHT.bold,
      fontFamily: FONT_FAMILY.bold,
    },
    name: {
      color: "#FFF",
      fontSize: FONT_SIZE.xl,
      // fontWeight: FONT_WEIGHT.bold,
      fontFamily: FONT_FAMILY.bold,
    },
    email: {
      color: "rgba(255,255,255,0.75)",
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.regular,
      marginTop: 4,
    },
    memberBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: BORDER_RADIUS.full,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: SPACING.sm,
      fontFamily: FONT_FAMILY.medium,
    },
    memberText: {
      color: "#FFF",
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.medium,
      fontFamily: FONT_FAMILY.medium,
    },
    content: { padding: SPACING.lg },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.xs,
      fontWeight: FONT_WEIGHT.semibold,
      fontFamily: FONT_FAMILY.semibold,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginBottom: SPACING.sm,
      marginTop: SPACING.md,
    },
    settingsCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      ...SHADOWS.sm,
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingIcon: {
      width: 38,
      height: 38,
      borderRadius: BORDER_RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: SPACING.md,
    },
    settingInfo: { flex: 1 },
    settingLabel: {
      color: colors.textPrimary,
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.medium,
      fontFamily: FONT_FAMILY.medium,
    },
    settingSubtitle: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.regular,
      marginTop: 2,
    },
    aboutCard: {
      backgroundColor: colors.surface,
      borderRadius: BORDER_RADIUS.xl,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...SHADOWS.sm,
    },
    aboutIconWrap: {
      width: 38,
      height: 38,
      borderRadius: BORDER_RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}18`,
      marginBottom: SPACING.sm,
    },
    aboutText: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.sm,
      fontFamily: FONT_FAMILY.regular,
      lineHeight: 22,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      backgroundColor: `${colors.expense}15`,
      borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      marginTop: SPACING.xl,
      borderWidth: 1,
      borderColor: `${colors.expense}30`,
    },
    logoutText: {
      color: colors.expense,
      fontSize: FONT_SIZE.md,
      fontWeight: FONT_WEIGHT.semibold,
      fontFamily: FONT_FAMILY.semibold,
    },
    version: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.regular,
      textAlign: "center",
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      maxHeight: "80%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: SPACING.lg,
    },
    modalTitle: {
      fontSize: FONT_SIZE.lg,
      fontWeight: FONT_WEIGHT.bold,
      fontFamily: FONT_FAMILY.bold,
      color: colors.textPrimary,
    },
    editForm: { marginBottom: SPACING.lg },
    inputLabel: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.sm,
      fontWeight: FONT_WEIGHT.medium,
      fontFamily: FONT_FAMILY.medium,
      marginBottom: SPACING.xs,
      marginTop: SPACING.sm,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
    },
    inputIcon: { marginRight: SPACING.sm },
    input: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: FONT_SIZE.md,
      fontFamily: FONT_FAMILY.regular,
      paddingVertical: SPACING.md,
    },
    inputDisabled: { color: colors.textMuted },
    emailNote: {
      position: "absolute",
      right: SPACING.md,
      color: colors.textMuted,
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.regular,
    },
    modalActions: {
      flexDirection: "row",
      gap: SPACING.md,
    },
    modalBtn: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      alignItems: "center",
    },
    cancelBtn: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelBtnText: {
      color: colors.textPrimary,
      fontWeight: FONT_WEIGHT.medium,
      fontFamily: FONT_FAMILY.medium,
    },
    saveBtn: { backgroundColor: colors.primary },
    saveBtnText: { color: "#FFFFFF", fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  });

export default ProfileScreen;
