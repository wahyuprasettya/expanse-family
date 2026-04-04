// ============================================================
// Profile Screen (Settings, PIN, Categories, Export)
// ============================================================
import React, { useEffect, useRef, useState } from "react";
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
import Constants from "expo-constants";
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
import {
  registerForPushNotifications,
  getPushDebugStatus,
  sendPushNotificationToToken,
} from "@services/firebase/notifications";
import { logoutUser } from "@services/firebase/auth";
import { useAppTheme } from "@hooks/useAppTheme";
import { useBiometric } from "@hooks/useBiometric";
import { updateProfile } from "firebase/auth";
import { auth } from "@services/firebase/config";
import { getOCRApiKey, saveOCRApiKey } from "@services/ocr";

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
  const [pushDebugLoading, setPushDebugLoading] = useState(false);
  const [pushDebugInfo, setPushDebugInfo] = useState(null);
  const [showDebugTools, setShowDebugTools] = useState(false);
  const [showOCRApiKeyModal, setShowOCRApiKeyModal] = useState(false);
  const [ocrApiKey, setOcrApiKey] = useState("");
  const [ocrApiKeySaving, setOcrApiKeySaving] = useState(false);
  const lastVersionTapRef = useRef(0);
  const notAuthenticatedMessage = language === "en" ? "Please sign in again." : "Silakan login kembali.";
  const affirmativeLabel = language === "en" ? "Yes" : "Ya";
  const negativeLabel = language === "en" ? "No" : "Tidak";
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const displayName = user?.displayName || t("profile.fallbackUser");
  const avatarInitials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || user?.email?.[0]?.toUpperCase() || "U";

  const formatTokenPreview = (token) =>
    token ? `${token.slice(0, 18)}...${token.slice(-8)}` : "-";

  const formatApiKeyPreview = (value) => {
    if (!value) return t("profile.ocrApiKeyNotSet");
    if (value.length <= 10) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  useEffect(() => {
    let isMounted = true;

    const loadStoredOCRApiKey = async () => {
      try {
        const storedApiKey = await getOCRApiKey();
        if (isMounted) {
          setOcrApiKey(storedApiKey);
        }
      } catch (_error) {
        if (isMounted) {
          setOcrApiKey("");
        }
      }
    };

    void loadStoredOCRApiKey();

    return () => {
      isMounted = false;
    };
  }, []);

  const getPushDebugSubtitle = () => {
    if (pushDebugLoading) return t("common.loading");
    if (!pushDebugInfo) return t("profile.pushDebugSubtitle");
    if (pushDebugInfo.permissionStatus !== "granted") {
      return t("profile.pushDebugPermissionDenied");
    }
    if (pushDebugInfo.fetchError || pushDebugInfo.storedTokenError) {
      return t("profile.pushDebugError");
    }
    if (pushDebugInfo.matchesStoredToken) {
      return t("profile.pushDebugReady");
    }
    if (pushDebugInfo.freshToken && !pushDebugInfo.storedToken) {
      return t("profile.pushDebugMissingStoredToken");
    }
    if (pushDebugInfo.freshToken && pushDebugInfo.storedToken) {
      return t("profile.pushDebugOutOfSync");
    }
    return t("profile.pushDebugSubtitle");
  };

  const refreshPushDebugInfo = async () => {
    if (!user?.uid) {
      throw new Error(notAuthenticatedMessage);
    }

    const status = await getPushDebugStatus(user.uid);
    setPushDebugInfo(status);
    return status;
  };

  const handleSyncPushToken = async () => {
    if (!user?.uid) {
      Alert.alert(t("common.error"), notAuthenticatedMessage);
      return;
    }

    setPushDebugLoading(true);
    let syncedToken = null;

    try {
      syncedToken = await registerForPushNotifications(user.uid);
      const status = await refreshPushDebugInfo();

      if (!syncedToken) {
        Alert.alert(
          t("common.error"),
          status.fetchError || status.storedTokenError || t("profile.pushTokenSyncFailed")
        );
        return;
      }

      Alert.alert(t("common.success"), t("profile.pushTokenSynced"));
    } catch (error) {
      Alert.alert(t("common.error"), error.message || t("profile.pushTokenSyncFailed"));
    } finally {
      setPushDebugLoading(false);
    }
  };

  const handleCheckPushDebug = async () => {
    if (!user?.uid) {
      Alert.alert(t("common.error"), notAuthenticatedMessage);
      return;
    }

    setPushDebugLoading(true);
    try {
      const status = await refreshPushDebugInfo();
      const message = [
        `Platform: ${status.platform}`,
        `${language === "en" ? "Physical device" : "Perangkat fisik"}: ${status.isDevice ? affirmativeLabel : negativeLabel}`,
        `${language === "en" ? "Notification permission" : "Izin notifikasi"}: ${status.permissionStatus || "-"}`,
        `${language === "en" ? "Project ID" : "Project ID"}: ${status.projectId || "-"}`,
        `${language === "en" ? "Stored token" : "Token tersimpan"}: ${formatTokenPreview(status.storedToken)}`,
        `${language === "en" ? "Active token" : "Token aktif"}: ${formatTokenPreview(status.freshToken)}`,
        `${language === "en" ? "Token match" : "Token sama"}: ${status.matchesStoredToken ? affirmativeLabel : negativeLabel}`,
        status.fetchError
          ? `${language === "en" ? "Token error" : "Error token"}: ${status.fetchError}`
          : null,
        status.storedTokenError
          ? `${language === "en" ? "Stored token error" : "Error token tersimpan"}: ${status.storedTokenError}`
          : null,
      ]
        .filter(Boolean)
        .join("\n");

      Alert.alert(t("profile.pushDebug"), message, [
        {
          text: t("profile.syncPushToken"),
          onPress: () => {
            void handleSyncPushToken();
          },
        },
        { text: "OK" },
      ]);
    } catch (error) {
      Alert.alert(t("common.error"), error.message || t("profile.pushDebugError"));
    } finally {
      setPushDebugLoading(false);
    }
  };

  const handleSendTestNotification = async () => {
    if (!user?.uid) {
      Alert.alert(t("common.error"), notAuthenticatedMessage);
      return;
    }

    setPushDebugLoading(true);
    try {
      const token = await registerForPushNotifications(user.uid);
      const status = await refreshPushDebugInfo();

      if (!token) {
        Alert.alert(
          t("common.error"),
          status.fetchError || status.storedTokenError || t("profile.pushTokenSyncFailed")
        );
        return;
      }

      const result = await sendPushNotificationToToken(token, {
        title: t("profile.testNotificationTitle"),
        body: t("profile.testNotificationBody"),
        channelId: "transactions",
        data: {
          type: "debug_test",
          userId: user.uid,
        },
      });

      if (!result.ok) {
        Alert.alert(t("common.error"), (result.errors || []).join("\n") || t("profile.pushDebugError"));
        return;
      }

      Alert.alert(t("common.success"), t("profile.testNotificationSent"));
    } catch (error) {
      Alert.alert(t("common.error"), error.message || t("profile.pushDebugError"));
    } finally {
      setPushDebugLoading(false);
    }
  };

  const handleVersionPress = () => {
    const now = Date.now();

    if (now - lastVersionTapRef.current <= 400) {
      setShowDebugTools((prev) => !prev);
    }

    lastVersionTapRef.current = now;
  };

  const handleOpenOCRApiKeyModal = async () => {
    try {
      const storedApiKey = await getOCRApiKey();
      setOcrApiKey(storedApiKey);
    } catch (_error) {
      setOcrApiKey("");
    }

    setShowOCRApiKeyModal(true);
  };

  const handleSaveOCRApiKey = async () => {
    const nextApiKey = ocrApiKey.trim();

    setOcrApiKeySaving(true);
    try {
      await saveOCRApiKey(nextApiKey);
      setOcrApiKey(nextApiKey);
      setShowOCRApiKeyModal(false);
      Alert.alert(
        t("common.success"),
        nextApiKey ? t("profile.ocrApiKeySavedSuccess") : t("profile.ocrApiKeyClearedSuccess")
      );
    } catch (error) {
      Alert.alert(t("common.error"), error.message || t("profile.ocrApiKeySaveFailed"));
    } finally {
      setOcrApiKeySaving(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <LinearGradient colors={colors.gradients.primary} style={styles.header}>
          <View style={styles.avatarLarge}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{avatarInitials}</Text>
              <View style={styles.avatarOnlineBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            </View>
          </View>
          <Text style={styles.name}>
            {displayName}
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
            {showDebugTools ? (
              <>
                <SettingRow
                  colors={colors}
                  styles={styles}
                  icon="bug-outline"
                  label={t("profile.pushDebug")}
                  subtitle={getPushDebugSubtitle()}
                  color={colors.info}
                  onPress={handleCheckPushDebug}
                  rightElement={
                    pushDebugLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : undefined
                  }
                />
                <SettingRow
                  colors={colors}
                  styles={styles}
                  icon="paper-plane-outline"
                  label={t("profile.testNotification")}
                  subtitle={t("profile.testNotificationSubtitle")}
                  color={colors.secondary}
                  onPress={handleSendTestNotification}
                />
                <SettingRow
                  colors={colors}
                  styles={styles}
                  icon="key-outline"
                  label={t("profile.ocrApiKey")}
                  subtitle={formatApiKeyPreview(ocrApiKey)}
                  color={colors.income}
                  onPress={handleOpenOCRApiKeyModal}
                />
              </>
            ) : null}
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
              icon="receipt-outline"
              label={t("profile.scanReceipt")}
              subtitle={t("profile.receiptScanner")}
              color={colors.income}
              onPress={() => navigation.navigate("ScanReceipt")}
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

          <TouchableOpacity activeOpacity={0.8} onPress={handleVersionPress}>
            <Text style={styles.version}>WP App v{appVersion}</Text>
          </TouchableOpacity>
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

      <Modal visible={showOCRApiKeyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("profile.ocrApiKey")}</Text>
              <TouchableOpacity onPress={() => setShowOCRApiKeyModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.editForm}>
              <Text style={styles.inputLabel}>{t("profile.ocrApiKeyLabel")}</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="key-outline"
                  size={20}
                  color={colors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={ocrApiKey}
                  onChangeText={setOcrApiKey}
                  placeholder={t("profile.ocrApiKeyPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Text style={styles.inputHelpText}>{t("profile.ocrApiKeyHint")}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowOCRApiKeyModal(false)}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveOCRApiKey}
                disabled={ocrApiKeySaving}
              >
                {ocrApiKeySaving ? (
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
      width: 156,
      height: 156,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
    },
    avatarCircle: {
      width: 108,
      height: 108,
      borderRadius: 54,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.32)",
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 8,
    },
    avatarInitials: {
      color: colors.primary,
      fontSize: 32,
      fontWeight: FONT_WEIGHT.extrabold,
      fontFamily: FONT_FAMILY.extrabold,
      letterSpacing: 0.5,
    },
    avatarOnlineBadge: {
      position: "absolute",
      right: 4,
      bottom: 6,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "#22C55E",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: colors.primary,
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
    inputHelpText: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.xs,
      fontFamily: FONT_FAMILY.regular,
      lineHeight: 18,
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
