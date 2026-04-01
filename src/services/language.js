import * as SecureStore from 'expo-secure-store';
import { DEFAULT_LANGUAGE, LANGUAGES } from '@localization/translations';

const LANGUAGE_KEY = 'appLanguage';

export const saveLanguagePreference = async (language) => {
  if (!LANGUAGES[language]) return;
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
};

export const getLanguagePreference = async () => {
  const language = await SecureStore.getItemAsync(LANGUAGE_KEY);
  return LANGUAGES[language] ? language : DEFAULT_LANGUAGE;
};
