// ============================================================
// Firestore App Config Service
// ============================================================
import { doc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { serializeFirestoreValue } from '@utils/firestore';

const APP_CONFIG_COLLECTION = 'appConfig';
const OCR_CONFIG_DOC = 'ocr';

export const getOCRConfig = async () => {
  try {
    const snapshot = await getDoc(doc(db, APP_CONFIG_COLLECTION, OCR_CONFIG_DOC));

    if (!snapshot.exists()) {
      return { config: null, error: null };
    }

    return {
      config: serializeFirestoreValue(snapshot.data()),
      error: null,
    };
  } catch (error) {
    return { config: null, error: error.message };
  }
};

