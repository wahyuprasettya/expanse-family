import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { registerAppAlertHandler } from '@services/appAlert';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import {
  BORDER_RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  SPACING,
  SHADOWS,
} from '@constants/theme';

const inferTone = (title = '', buttons = []) => {
  const normalizedTitle = String(title).toLowerCase();
  const hasDestructive = buttons.some((button) => button?.style === 'destructive');

  if (
    hasDestructive ||
    normalizedTitle.includes('error') ||
    normalizedTitle.includes('kesalahan') ||
    normalizedTitle.includes('gagal') ||
    normalizedTitle.includes('failed')
  ) {
    return 'danger';
  }

  if (normalizedTitle.includes('success') || normalizedTitle.includes('berhasil')) {
    return 'success';
  }

  return 'info';
};

const withAlpha = (hexColor, alphaHex) => `${hexColor}${alphaHex}`;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const AppAlertHost = () => {
  const { colors, isDark } = useAppTheme();
  const { t } = useTranslation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompactWidth = screenWidth < 360;
  const isCompactHeight = screenHeight < 700;
  const metrics = useMemo(() => {
    const horizontalInset = screenWidth < 360 ? 12 : SPACING.md;
    const maxDialogWidth = screenWidth >= 768 ? 360 : screenWidth >= 420 ? 320 : 292;
    const dialogWidth = clamp(screenWidth - (horizontalInset * 2), 248, maxDialogWidth);

    return {
      dialogWidth,
      horizontalInset,
      iconHalo: isCompactHeight ? 64 : 72,
      iconRing: isCompactHeight ? 46 : 52,
      iconCore: isCompactHeight ? 32 : 36,
      titleSize: isCompactWidth ? FONT_SIZE.lg : FONT_SIZE.xl,
      messageSize: isCompactWidth ? FONT_SIZE.xs : FONT_SIZE.sm,
      messageLineHeight: isCompactWidth ? 18 : 21,
      cardPaddingHorizontal: isCompactWidth ? 16 : 18,
      cardPaddingTop: isCompactHeight ? 20 : 24,
      cardPaddingBottom: isCompactHeight ? 16 : 18,
      singleButtonWidth: clamp(dialogWidth * 0.66, 140, 184),
    };
  }, [screenWidth, isCompactWidth, isCompactHeight]);
  const styles = useMemo(() => createStyles(colors, isDark, metrics), [colors, isDark, metrics]);
  const [queue, setQueue] = useState([]);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => registerAppAlertHandler((payload) => {
    setQueue((prev) => [...prev, payload]);
  }), []);

  useEffect(() => {
    if (!activeAlert && queue.length > 0) {
      setActiveAlert(queue[0]);
    }
  }, [activeAlert, queue]);

  const dismissAlert = (button) => {
    setActiveAlert(null);
    setQueue((prev) => prev.slice(1));

    if (typeof button?.onPress === 'function') {
      setTimeout(() => {
        button.onPress();
      }, 0);
    }
  };

  const handleBackdropPress = () => {
    if (activeAlert?.options?.cancelable === false) {
      return;
    }

    dismissAlert();
  };

  const buttons = activeAlert?.buttons?.length
    ? activeAlert.buttons
    : [{ text: t('common.ok') }];

  const tone = inferTone(activeAlert?.title, buttons);
  const toneConfig = {
    info: {
      icon: 'information-circle',
      color: colors.primary,
      background: withAlpha(colors.primary, '12'),
      halo: withAlpha(colors.primary, '24'),
      accent: colors.gradients.primary,
    },
    success: {
      icon: 'checkmark-circle',
      color: colors.income,
      background: withAlpha(colors.income, '14'),
      halo: withAlpha(colors.income, '26'),
      accent: colors.gradients.income,
    },
    danger: {
      icon: 'warning',
      color: colors.expense,
      background: withAlpha(colors.expense, '14'),
      halo: withAlpha(colors.expense, '26'),
      accent: colors.gradients.expense,
    },
  }[tone];

  const canClose = activeAlert?.options?.cancelable !== false;
  const shouldStackButtons = buttons.length > 2 || (buttons.length === 2 && screenWidth < 340);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(activeAlert)}
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleBackdropPress}>
        <Pressable style={styles.shell} onPress={() => {}}>
          <LinearGradient
            colors={isDark ? [withAlpha(toneConfig.color, '34'), withAlpha(colors.borderLight, 'A0')] : ['#FFFFFF', withAlpha(toneConfig.color, '1E')]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBorder}
          >
            <View style={styles.card}>
              {canClose ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={styles.closeButton}
                  hitSlop={10}
                  onPress={() => dismissAlert()}
                >
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              ) : null}

              <View style={[styles.iconHalo, { backgroundColor: toneConfig.background }]}>
                <View style={[styles.iconRing, { backgroundColor: toneConfig.halo }]}>
                  <LinearGradient
                    colors={toneConfig.accent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconCore}
                  >
                    <Ionicons name={toneConfig.icon} size={20} color="#FFFFFF" />
                  </LinearGradient>
                </View>
              </View>

              {activeAlert?.title ? (
                <Text style={styles.title}>{activeAlert.title}</Text>
              ) : null}

              {activeAlert?.message ? (
                <Text style={styles.message}>{activeAlert.message}</Text>
              ) : null}

              <View
                style={[
                  styles.buttonRow,
                  buttons.length === 1 && styles.buttonRowSingle,
                  shouldStackButtons && styles.buttonColumn,
                ]}
              >
                {buttons.map((button, index) => {
                  const isDestructive = button?.style === 'destructive';
                  const isCancel = button?.style === 'cancel';
                  const buttonTone = isDestructive ? colors.gradients.expense : colors.gradients.primary;
                  const buttonColor = isDestructive ? colors.expense : colors.primary;

                  return (
                    <Pressable
                      key={`${button?.text || 'button'}-${index}`}
                      style={[
                        styles.buttonWrap,
                        shouldStackButtons && styles.buttonStacked,
                        buttons.length === 1 && styles.buttonSingle,
                      ]}
                      onPress={() => dismissAlert(button)}
                    >
                      {isCancel ? (
                        <View
                          style={[
                            styles.buttonCancel,
                            buttons.length === 1 && styles.buttonSingleCancel,
                          ]}
                        >
                          <Text style={[styles.buttonText, styles.buttonTextCancel]}>
                            {button?.text || t('common.ok')}
                          </Text>
                        </View>
                      ) : (
                        <LinearGradient
                          colors={buttonTone}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.buttonPrimary,
                            buttons.length === 1 && styles.buttonSinglePrimary,
                            !isDestructive && { shadowColor: buttonColor },
                          ]}
                        >
                          <Text style={[styles.buttonText, styles.buttonTextPrimary]}>
                            {button?.text || t('common.ok')}
                          </Text>
                        </LinearGradient>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const createStyles = (colors, isDark, metrics) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: metrics.horizontalInset,
  },
  shell: {
    width: metrics.dialogWidth,
    borderRadius: 26,
  },
  cardBorder: {
    width: '100%',
    borderRadius: 26,
    padding: 1.5,
    shadowColor: isDark ? '#000000' : colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: isDark ? 0.34 : 0.12,
    shadowRadius: 32,
    elevation: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: metrics.cardPaddingHorizontal,
    paddingTop: metrics.cardPaddingTop,
    paddingBottom: metrics.cardPaddingBottom,
    borderWidth: 1,
    borderColor: withAlpha(colors.border, isDark ? 'D0' : 'A0'),
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.background, isDark ? 'B8' : 'F2'),
    borderWidth: 1,
    borderColor: withAlpha(colors.border, '90'),
    zIndex: 2,
  },
  iconHalo: {
    width: metrics.iconHalo,
    height: metrics.iconHalo,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: metrics.cardPaddingBottom,
    alignSelf: 'center',
  },
  iconRing: {
    width: metrics.iconRing,
    height: metrics.iconRing,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCore: {
    width: metrics.iconCore,
    height: metrics.iconCore,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: metrics.titleSize,
    fontFamily: FONT_FAMILY.extrabold,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  message: {
    color: colors.textSecondary,
    fontSize: metrics.messageSize,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: metrics.messageLineHeight,
    marginTop: 10,
    marginHorizontal: SPACING.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: 22,
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  buttonWrap: {
    flex: 1,
  },
  buttonPrimary: {
    minHeight: 54,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    ...SHADOWS.md,
  },
  buttonCancel: {
    minHeight: 54,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: isDark ? withAlpha(colors.background, 'CC') : '#FFFFFF',
    borderWidth: 1,
    borderColor: withAlpha(colors.borderLight, 'D8'),
  },
  buttonSingle: {
    flex: 0,
    width: metrics.singleButtonWidth,
  },
  buttonSinglePrimary: {
    minHeight: 58,
    borderRadius: 18,
  },
  buttonSingleCancel: {
    minHeight: 58,
    borderRadius: 18,
  },
  buttonStacked: {
    width: '100%',
    flex: 0,
  },
  buttonText: {
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextCancel: {
    color: colors.textPrimary,
  },
});

export default AppAlertHost;
