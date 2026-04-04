// ============================================================
// Receipt Camera Screen
// ============================================================
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

export const ReceiptCameraScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const styles = createStyles(colors);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const handleTakePicture = async () => {
    if (!cameraRef.current || !isCameraReady || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri || !photo?.base64) {
        throw new Error(t('receipt.cameraCaptureFailed'));
      }

      navigation.navigate('ScanReceipt', {
        capturedReceipt: {
          uri: photo.uri,
          base64: photo.base64,
          capturedAt: Date.now(),
        },
      });
    } catch (error) {
      Alert.alert(t('common.error'), error.message || t('receipt.cameraCaptureFailed'));
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.permissionBackBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={52} color={colors.primary} />
          <Text style={styles.permissionTitle}>{t('receipt.cameraPermissionTitle')}</Text>
          <Text style={styles.permissionText}>{t('receipt.cameraPermissionSubtitle')}</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>{t('receipt.allowCamera')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        enableTorch={torchEnabled}
        onCameraReady={() => setIsCameraReady(true)}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTorchEnabled((prev) => !prev)}
            style={styles.topButton}
          >
            <Ionicons
              name={torchEnabled ? 'flash' : 'flash-off'}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.guideWrap}>
          <View style={styles.guideFrame}>
            <Text style={styles.guideText}>{t('receipt.cameraGuide')}</Text>
          </View>
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.bottomHint}>{t('receipt.cameraHint')}</Text>
          <TouchableOpacity
            style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
            onPress={handleTakePicture}
            disabled={!isCameraReady || isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  guideWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: '88%',
    height: '48%',
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.md,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  bottomBar: {
    alignItems: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  bottomHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
  },
  captureButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 4,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: SPACING.lg,
  },
  permissionBackBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  permissionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    textAlign: 'center',
  },
  permissionText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  permissionBtn: {
    marginTop: SPACING.sm,
    backgroundColor: colors.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
});

export default ReceiptCameraScreen;
