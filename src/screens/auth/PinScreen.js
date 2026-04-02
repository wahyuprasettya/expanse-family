// ============================================================
// PIN Screen – Setup & Verification + Biometric
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { verifyPin, savePin } from '@services/firebase/auth';
import { setPinVerified, selectProfile } from '@store/authSlice';
import { useBiometric } from '@hooks/useBiometric';
import { useTranslation } from '@hooks/useTranslation';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

const PIN_LENGTH = 6;

export const PinScreen = ({ mode = 'verify' }) => {
  // mode: 'verify' | 'setup' | 'setup-confirm'
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [currentMode, setCurrentMode] = useState(mode);
  const [attempts, setAttempts] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const { isBiometricSupported, biometricType, authenticate } = useBiometric();
  const profile = useSelector(selectProfile);

  // Try biometric on mount (verify mode)
  useEffect(() => {
    if (mode === 'verify' && isBiometricSupported && profile?.biometricEnabled) {
      handleBiometric();
    }
  }, [isBiometricSupported, profile?.biometricEnabled]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (key) => {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setTimeout(() => processPin(newPin), 100);
    }
  };

  const processPin = async (enteredPin) => {
    if (currentMode === 'verify') {
      const { isValid } = await verifyPin(enteredPin);
      if (isValid) {
        dispatch(setPinVerified(true));
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        shake();
        setPin('');
        if (newAttempts >= 5) {
          Alert.alert(t('pin.tooManyAttemptsTitle'), t('pin.tooManyAttemptsMessage'));
        }
      }
    } else if (currentMode === 'setup') {
      setFirstPin(enteredPin);
      setCurrentMode('setup-confirm');
      setPin('');
    } else if (currentMode === 'setup-confirm') {
      if (enteredPin === firstPin) {
        await savePin(enteredPin);
        dispatch(setPinVerified(true));
        Alert.alert(t('pin.pinSetTitle'), t('pin.pinSetMessage'));
      } else {
        shake();
        setPin('');
        setFirstPin('');
        setCurrentMode('setup');
        Alert.alert(t('pin.pinMismatchTitle'), t('pin.pinMismatchMessage'));
      }
    }
  };

  const handleBiometric = async () => {
    const { success } = await authenticate(t('pin.biometricPrompt'));
    if (success) dispatch(setPinVerified(true));
  };

  const TITLE = {
    verify: t('pin.verifyTitle'),
    setup: t('pin.setupTitle'),
    'setup-confirm': t('pin.confirmTitle'),
  };
  const SUBTITLE = {
    verify: t('pin.verifySubtitle'),
    setup: t('pin.setupSubtitle'),
    'setup-confirm': t('pin.confirmSubtitle'),
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'];

  return (
    <LinearGradient colors={colors.gradients.header} style={styles.container}>
      <View style={styles.inner}>
        {/* Lock Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔐</Text>
        </View>

        <Text style={styles.title}>{TITLE[currentMode]}</Text>
        <Text style={styles.subtitle}>{SUBTITLE[currentMode]}</Text>

        {/* PIN Dots */}
        <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            />
          ))}
        </Animated.View>

        {attempts > 0 && currentMode === 'verify' && (
          <Text style={styles.attemptsText}>
            {t('common.remainingAttempts', {
              count: 5 - attempts,
              suffix: 5 - attempts !== 1 ? 's' : '',
            })}
          </Text>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {keys.map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.key,
                key === 'bio' && (!isBiometricSupported || !profile?.biometricEnabled) && styles.keyHidden,
              ]}
              onPress={() => {
                if (key === 'bio') {
                  if (isBiometricSupported && profile?.biometricEnabled) handleBiometric();
                } else {
                  handleKeyPress(key);
                }
              }}
              activeOpacity={0.7}
              disabled={key === 'bio' && (!isBiometricSupported || !profile?.biometricEnabled)}
            >
              {key === 'del' ? (
                <Ionicons name="backspace-outline" size={24} color={colors.textPrimary} />
              ) : key === 'bio' ? (
                isBiometricSupported && profile?.biometricEnabled ? (
                  <Ionicons
                    name={biometricType === 'face' ? 'scan-outline' : 'finger-print-outline'}
                    size={26}
                    color={colors.primary}
                  />
                ) : <View />
              ) : (
                <Text style={styles.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  iconContainer: {
    width: 80, height: 80,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: `${colors.primary}40`,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular, marginBottom: SPACING.xl },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    gap: 16,
  },
  dot: {
    width: 16, height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  attemptsText: { color: colors.warning, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginBottom: SPACING.md },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'center',
    marginTop: SPACING.lg,
    gap: 12,
  },
  key: {
    width: 76, height: 76,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  keyHidden: { opacity: 0 },
  keyText: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textPrimary,
  },
});

export default PinScreen;
