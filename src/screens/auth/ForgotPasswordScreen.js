// ============================================================
// Forgot Password Screen
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { resetPassword } from '@services/firebase/auth';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setErrors({ email: t('auth.resetPasswordFailed') });
      } else {
        setSuccess(true);
        Alert.alert(
          t('common.success'),
          t('auth.resetEmailSent'),
          [{ text: t('common.ok') }]
        );
      }
    } catch (error) {
      setErrors({ email: t('auth.resetPasswordFailed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.gradients.header} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🔐</Text>
            </View>
            <Text style={styles.title}>{t('auth.resetPasswordTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.resetPasswordSubtitle')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
            />

            <Button
              title={loading ? t('auth.resettingPassword') : t('auth.resetPassword')}
              onPress={handleResetPassword}
              loading={loading}
              style={styles.resetBtn}
            />

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backWrapper}
            >
              <Text style={styles.backText}>{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoContainer: {
    width: 80, height: 80,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: `${colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${colors.primary}50`,
  },
  logoEmoji: { fontSize: 40 },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.extrabold,
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.md,
    marginTop: 4,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  resetBtn: { marginTop: SPACING.md },
  backWrapper: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  backText: {
    color: colors.primary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    fontWeight: FONT_WEIGHT.medium,
  },
});

export default ForgotPasswordScreen;