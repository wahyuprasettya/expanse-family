const extractErrorCode = (error) => {
  if (!error) return 'unknown';
  if (typeof error === 'string') return error;
  return error.code || error.message || 'unknown';
};

const isNetworkError = (value = '') => {
  const normalized = String(value).toLowerCase();
  return normalized.includes('network-request-failed') || normalized.includes('network error');
};

export const getFirebaseAuthErrorMessage = (error, t, fallbackKey = 'auth.errors.generic') => {
  const code = extractErrorCode(error);

  if (isNetworkError(code)) {
    return t('auth.errors.network');
  }

  const errorMap = {
    'auth/invalid-email': 'auth.errors.invalidEmail',
    'auth/missing-email': 'auth.errors.emailRequired',
    'auth/user-not-found': 'auth.errors.invalidCredentials',
    'auth/wrong-password': 'auth.errors.invalidCredentials',
    'auth/invalid-credential': 'auth.errors.invalidCredentials',
    'auth/user-disabled': 'auth.errors.userDisabled',
    'auth/email-already-in-use': 'auth.errors.emailInUse',
    'auth/weak-password': 'auth.errors.weakPassword',
    'auth/too-many-requests': 'auth.errors.tooManyRequests',
    'auth/operation-not-allowed': 'auth.errors.operationNotAllowed',
  };

  return t(errorMap[code] || fallbackKey);
};

export default getFirebaseAuthErrorMessage;
