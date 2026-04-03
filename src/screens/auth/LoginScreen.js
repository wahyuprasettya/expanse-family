// ============================================================
// Login Screen
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';
import { loginUser } from '@services/firebase/auth';
import { setUser } from '@store/authSlice';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = t('auth.emailRequired');
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('auth.invalidEmail');
    if (!password) newErrors.password = t('auth.passwordRequired');
    else if (password.length < 6) newErrors.password = t('auth.passwordMin');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    const { user, error } = await loginUser({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      Alert.alert(t('auth.loginFailed'), error);
    } else {
      dispatch(setUser(user));
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['rgba(2, 6, 23, 0.98)', 'rgba(15, 23, 42, 1)'] : ['rgba(248, 250, 252, 1)', 'rgba(226, 232, 240, 1)']}
      style={styles.container}
    >
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>WP APP</Text>
            <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.welcomeTitle}>{t('auth.welcomeBack')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('auth.signInToAccount')}</Text>

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

            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.passwordPlaceholder')}
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
            />

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotWrapper}
            >
              <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
            </TouchableOpacity>

            <Button
              title={loading ? t('auth.signingIn') : t('auth.signIn')}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('common.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.registerWrapper}>
              <Text style={styles.registerPrompt}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>{t('auth.createAccount')}</Text>
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
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingTop: 60, paddingBottom: SPACING.xl, justifyContent: 'center' },
  orbTop: {
    position: 'absolute',
    top: -60,
    right: -20,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: `${colors.primary}28`,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -70,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: `${colors.secondary}1f`,
  },
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, marginTop: 4, fontFamily: FONT_FAMILY.regular },
  form: {
    backgroundColor: `${colors.surface}d9`,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: `${colors.textInverse}14`,
    marginBottom: SPACING.xl,
  },
  welcomeTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.lg,
  },
  forgotWrapper: { alignSelf: 'flex-end', marginTop: -SPACING.sm, marginBottom: SPACING.lg },
  forgotText: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  loginBtn: { marginTop: SPACING.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, paddingHorizontal: SPACING.md, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  registerWrapper: { flexDirection: 'row', justifyContent: 'center' },
  registerPrompt: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular },
  registerLink: { color: colors.primary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
});

export default LoginScreen;
