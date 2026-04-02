import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { getThemeColors } from '@constants/theme';
import { selectTheme } from '@store/uiSlice';

export const useAppTheme = () => {
  const themeMode = useSelector(selectTheme);
  const systemColorScheme = useColorScheme();
  const resolvedTheme = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const colors = getThemeColors(resolvedTheme);

  return {
    theme: resolvedTheme,
    themeMode,
    colors,
    isDark: resolvedTheme === 'dark',
  };
};

export default useAppTheme;
