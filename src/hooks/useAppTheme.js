import { useSelector } from 'react-redux';
import { getThemeColors } from '@constants/theme';
import { selectTheme } from '@store/uiSlice';

export const useAppTheme = () => {
  const theme = useSelector(selectTheme);
  const colors = getThemeColors(theme);

  return {
    theme,
    colors,
    isDark: theme === 'dark',
  };
};

export default useAppTheme;
