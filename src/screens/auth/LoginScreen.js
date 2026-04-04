// ============================================================
// Login Screen
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, Image, Keyboard, useWindowDimensions, Dimensions, Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { loginUser } from '@services/firebase/auth';
import { setUser } from '@store/authSlice';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { getFirebaseAuthErrorMessage } from '@utils/firebaseError';

const authBackground = require('../../../assets/bg.jpeg');
const cowSmile = require('../../../assets/cow_smile.png');
const cowCoverEyes = require('../../../assets/cow_cover_eyes.png');
const SCREEN = Dimensions.get('screen');
const BACKGROUND_SCALE = 1.28;
const BACKGROUND_WIDTH = SCREEN.width * BACKGROUND_SCALE;
const BACKGROUND_LEFT = -((BACKGROUND_WIDTH - SCREEN.width) / 2);

export const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeField, setActiveField] = useState(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isCompactLayout = isKeyboardVisible || screenHeight < 780;
  const mascotAnimation = useRef(new Animated.Value(0)).current;
  const styles = createStyles(colors, {
    isCompactLayout,
    topInset: insets.top,
    isShortScreen: screenHeight < 700,
  });
  const isPasswordFocused = activeField === 'password';
  const smileOpacity = mascotAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const coverOpacity = mascotAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const smileScale = mascotAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94],
  });
  const coverScale = mascotAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(mascotAnimation, {
      toValue: isPasswordFocused ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isPasswordFocused, mascotAnimation]);

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
      Alert.alert(t('auth.loginFailed'), getFirebaseAuthErrorMessage(error, t));
    } else {
      dispatch(setUser(user));
    }
  };

  return (
    <View style={styles.container}>
      <Image source={authBackground} style={styles.backgroundImage} resizeMode="cover" />
      <LinearGradient
        colors={isDark ? ['rgba(2, 6, 23, 0.72)', 'rgba(15, 23, 42, 0.92)'] : ['rgba(248, 250, 252, 0.58)', 'rgba(226, 232, 240, 0.86)']}
        style={styles.backdrop}
      >
        <View style={styles.orbTop} />
        <View style={styles.orbBottom} />
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: 'height' })}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            contentInsetAdjustmentBehavior="always"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoImageFrame}>
                  <Animated.Image
                    source={cowSmile}
                    resizeMode="contain"
                    style={[
                      styles.logoImage,
                      styles.logoImageLayer,
                      {
                        opacity: smileOpacity,
                        transform: [{ scale: smileScale }],
                      },
                    ]}
                  />
                  <Animated.Image
                    source={cowCoverEyes}
                    resizeMode="contain"
                    style={[
                      styles.logoImage,
                      styles.logoImageLayer,
                      {
                        opacity: coverOpacity,
                        transform: [{ scale: coverScale }],
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.title}>WP APP</Text>
              {!isCompactLayout ? (
                <Text style={styles.subtitle}>{t('auth.appSubtitle')}</Text>
              ) : null}
            </View>

            <View style={styles.form}>
              <Text style={styles.welcomeTitle}>{t('auth.welcomeBack')}</Text>
              {!isCompactLayout ? (
                <Text style={styles.welcomeSubtitle}>{t('auth.signInToAccount')}</Text>
              ) : null}

              <Input
                label={t('auth.email')}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail-outline"
                error={errors.email}
                onFocus={() => setActiveField('email')}
                onBlur={() => setActiveField(null)}
              />

              <Input
                label={t('auth.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry
                icon="lock-closed-outline"
                error={errors.password}
                onFocus={() => setActiveField('password')}
                onBlur={() => setActiveField(null)}
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
    </View>
  );
};

const createStyles = (colors, { isCompactLayout, topInset, isShortScreen }) => StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: BACKGROUND_LEFT,
    width: BACKGROUND_WIDTH,
    height: SCREEN.height,
  },
  backdrop: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: isCompactLayout ? Math.max(topInset + 12, 24) : Math.max(topInset + 24, 60),
    paddingBottom: isCompactLayout ? SPACING.lg : SPACING.xl,
    justifyContent: isCompactLayout ? 'flex-start' : 'center',
  },
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
  header: {
    alignItems: 'center',
    marginBottom: isCompactLayout ? SPACING.lg : SPACING.xxl,
  },
  logoContainer: {
    width: isCompactLayout ? 64 : 80,
    height: isCompactLayout ? 64 : 80,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: `${colors.surface}82`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isCompactLayout ? SPACING.sm : SPACING.md,
    borderWidth: 1,
    borderColor: `${colors.textInverse}20`,
  },
  logoImage: {
    width: isCompactLayout ? 72 : 90,
    height: isCompactLayout ? 72 : 90,
  },
  logoImageFrame: {
    width: isCompactLayout ? 72 : 90,
    height: isCompactLayout ? 72 : 90,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImageLayer: {
    position: 'absolute',
  },
  title: {
    fontSize: isCompactLayout ? FONT_SIZE.xxl : FONT_SIZE.xxxl,
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, marginTop: 4, fontFamily: FONT_FAMILY.regular },
  form: {
    backgroundColor: `${colors.surface}d9`,
    borderRadius: BORDER_RADIUS.xl,
    padding: isCompactLayout ? SPACING.md : SPACING.lg,
    borderWidth: 1,
    borderColor: `${colors.textInverse}14`,
    marginBottom: isShortScreen ? SPACING.md : SPACING.xl,
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
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: isCompactLayout ? 0 : -SPACING.sm,
    marginBottom: isCompactLayout ? SPACING.md : SPACING.lg,
  },
  forgotText: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  loginBtn: { marginTop: isCompactLayout ? 0 : SPACING.sm },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: isCompactLayout ? SPACING.md : SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, paddingHorizontal: SPACING.md, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  registerWrapper: { flexDirection: 'row', justifyContent: 'center' },
  registerPrompt: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular },
  registerLink: { color: colors.primary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
});

export default LoginScreen;
