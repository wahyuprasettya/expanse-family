// ============================================================
// Common: Input Component (shadcn-inspired)
// ============================================================
import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BORDER_RADIUS, FONT_SIZE, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  multiline = false,
  numberOfLines = 1,
  disabled = false,
  style,
  inputStyle,
  prefix,
  ...props
}) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(!secureTextEntry);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        isFocused && styles.focused,
        error && styles.errorBorder,
        disabled && styles.disabled,
      ]}>
        {icon && (
          <View style={styles.leftIcon}>
            <Ionicons name={icon} size={18} color={isFocused ? colors.primary : colors.textMuted} />
          </View>
        )}
        {prefix && (
          <Text style={styles.prefix}>{prefix}</Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!isVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            prefix && styles.inputWithPrefix,
            multiline && styles.multiline,
            inputStyle,
          ]}
          {...props}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={styles.rightIcon}>
            <Ionicons name={isVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Ionicons name={rightIcon} size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  focused: {
    borderColor: colors.primary,
    ...SHADOWS.sm,
  },
  errorBorder: { borderColor: colors.expense },
  disabled: { opacity: 0.6 },
  leftIcon: { paddingLeft: SPACING.md },
  prefix: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.md,
    paddingLeft: SPACING.md,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  inputWithIcon: { paddingLeft: SPACING.sm },
  inputWithPrefix: { paddingLeft: SPACING.sm },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  rightIcon: { paddingRight: SPACING.md },
  errorText: { color: colors.expense, fontSize: FONT_SIZE.xs, marginTop: 4 },
  hintText: { color: colors.textMuted, fontSize: FONT_SIZE.xs, marginTop: 4 },
});

export default Input;
