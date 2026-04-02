// ============================================================
// Register Screen
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { registerUser } from '@services/firebase/auth';
import { setUser } from '@store/authSlice';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const newErrors = {};
    if (!form.displayName.trim()) newErrors.displayName = t('auth.nameRequired');
    if (!form.email.trim()) newErrors.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = t('auth.invalidEmail');
    if (!form.password) newErrors.password = t('auth.passwordRequired');
    else if (form.password.length < 6) newErrors.password = t('auth.minSixChars');
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = t('auth.passwordMismatch');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    const { user, error } = await registerUser({
      email: form.email.trim(),
      password: form.password,
      displayName: form.displayName.trim(),
    });
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.registrationFailed'), error);
    } else {
      dispatch(setUser(user));
    }
  };

  return (
    <LinearGradient colors={colors.gradients.header} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← {t('auth.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t('auth.createAccountTitle')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Input
              label={t('auth.fullName')}
              value={form.displayName}
              onChangeText={setField('displayName')}
              placeholder="John Doe"
              icon="person-outline"
              error={errors.displayName}
            />
            <Input
              label={t('auth.email')}
              value={form.email}
              onChangeText={setField('email')}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
            />
            <Input
              label={t('auth.password')}
              value={form.password}
              onChangeText={setField('password')}
              placeholder={t('auth.minSixChars')}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />
            <Input
              label={t('auth.confirmPassword')}
              value={form.confirmPassword}
              onChangeText={setField('confirmPassword')}
              placeholder={t('auth.reenterPassword')}
              secureTextEntry
              icon="shield-checkmark-outline"
              error={errors.confirmPassword}
            />

            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                {t('auth.termsPrefix')}{' '}
                <Text style={styles.termsLink}>{t('auth.termsOfService')}</Text>
                {' '}{t('auth.and')}{' '}
                <Text style={styles.termsLink}>{t('auth.privacyPolicy')}</Text>
              </Text>
            </View>

            <Button
              title={loading ? t('auth.creatingAccount') : t('auth.createAccount')}
              onPress={handleRegister}
              loading={loading}
            />

            <View style={styles.loginWrapper}>
              <Text style={styles.loginPrompt}>{t('auth.alreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>{t('auth.signIn')}</Text>
              </TouchableOpacity>
            </View>
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
  header: { marginBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.lg },
  backText: { color: colors.primary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  title: { fontSize: FONT_SIZE.xxxl, fontWeight: FONT_WEIGHT.extrabold, fontFamily: FONT_FAMILY.extrabold, color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, marginTop: 4, fontFamily: FONT_FAMILY.regular },
  form: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.xl,
  },
  termsContainer: { marginBottom: SPACING.md },
  termsText: { color: colors.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 20, fontFamily: FONT_FAMILY.regular },
  termsLink: { color: colors.primary, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  loginWrapper: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.md },
  loginPrompt: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular },
  loginLink: { color: colors.primary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
});

export default RegisterScreen;
