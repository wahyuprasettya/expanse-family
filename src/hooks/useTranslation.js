import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectLanguage } from '@store/uiSlice';
import { DEFAULT_LANGUAGE, LANGUAGES, translations } from '@localization/translations';

const getNestedValue = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const interpolate = (template, params = {}) => {
  if (typeof template !== 'string') return template;
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    return params[trimmedKey] ?? '';
  });
};

export const getIntlLocale = (language) => (language === 'en' ? 'en-US' : 'id-ID');

export const useTranslation = () => {
  const language = useSelector(selectLanguage) || DEFAULT_LANGUAGE;

  return useMemo(() => {
    const dictionary = translations[language] || translations[DEFAULT_LANGUAGE];

    return {
      language,
      locale: getIntlLocale(language),
      availableLanguages: LANGUAGES,
      t: (key, params) => {
        const fallbackValue = getNestedValue(translations[DEFAULT_LANGUAGE], key);
        const value = getNestedValue(dictionary, key) ?? fallbackValue ?? key;
        return interpolate(value, params);
      },
    };
  }, [language]);
};
