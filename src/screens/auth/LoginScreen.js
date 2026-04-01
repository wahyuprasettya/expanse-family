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
import { Colors, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';

export const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
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
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>💰</Text>
            </View>
            <Text style={styles.title}>WP App</Text>
            <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>
          </View>

          {/* Form */}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoContainer: {
    width: 80, height: 80,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: `${Colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: `${Colors.primary}50`,
  },
  logoEmoji: { fontSize: 40 },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { color: Colors.textSecondary, fontSize: FONT_SIZE.md, marginTop: 4 },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: SPACING.xl,
  },
  welcomeTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    color: Colors.textSecondary,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.lg,
  },
  forgotWrapper: { alignSelf: 'flex-end', marginTop: -SPACING.sm, marginBottom: SPACING.lg },
  forgotText: { color: Colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  loginBtn: { marginTop: SPACING.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, paddingHorizontal: SPACING.md, fontSize: FONT_SIZE.sm },
  registerWrapper: { flexDirection: 'row', justifyContent: 'center' },
  registerPrompt: { color: Colors.textSecondary, fontSize: FONT_SIZE.md },
  registerLink: { color: Colors.primary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
});

export default LoginScreen;
