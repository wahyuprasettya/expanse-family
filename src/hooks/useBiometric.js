// ============================================================
// useBiometric Hook
// ============================================================
import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export const useBiometric = () => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricType, setBiometricType] = useState(null);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('face');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('fingerprint');
        }
      }
    })();
  }, []);

  const authenticate = async (reason = 'Authenticate to access WP App') => {
    try {
      const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
      if (!savedBiometrics) {
        return { success: false, error: 'No biometrics enrolled on this device' };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return { isBiometricSupported, biometricType, authenticate };
};
