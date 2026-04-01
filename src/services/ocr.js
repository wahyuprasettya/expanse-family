// ============================================================
// OCR Receipt Scanning Service
// ============================================================
import * as ImagePicker from 'expo-image-picker';

// ─── Pick or Capture Receipt Image ───────────────────────────
export const pickReceiptImage = async (useCamera = false) => {
  try {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return { uri: null, error: 'Camera permission denied' };
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    }

    if (result.canceled) return { uri: null, error: null };

    const asset = result.assets[0];
    return { uri: asset.uri, base64: asset.base64, error: null };
  } catch (error) {
    return { uri: null, error: error.message };
  }
};

// ─── OCR via Google Cloud Vision API ─────────────────────────
// You need to enable Google Cloud Vision API and add your API key
export const extractTextFromReceipt = async (base64Image) => {
  try {
    const GOOGLE_VISION_API_KEY = 'YOUR_GOOGLE_CLOUD_VISION_API_KEY';
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    const text = data.responses?.[0]?.fullTextAnnotation?.text || '';
    return { text, parsedData: parseReceiptText(text), error: null };
  } catch (error) {
    return { text: null, parsedData: null, error: error.message };
  }
};

// ─── Parse Receipt Text ───────────────────────────────────────
const parseReceiptText = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Detect total amount (various patterns)
  const totalPatterns = [
    /total[:\s]+(?:rp\.?\s*)?([\d.,]+)/i,
    /grand total[:\s]+(?:rp\.?\s*)?([\d.,]+)/i,
    /jumlah[:\s]+(?:rp\.?\s*)?([\d.,]+)/i,
    /amount[:\s]+(?:rp\.?\s*)?([\d.,]+)/i,
  ];

  let amount = null;
  for (const pattern of totalPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(/[.,]/g, '').replace(',', '.'));
        break;
      }
    }
    if (amount) break;
  }

  // Detect date
  const datePattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
  let date = new Date().toISOString().split('T')[0];
  for (const line of lines) {
    const match = line.match(datePattern);
    if (match) {
      date = `${match[3].length === 2 ? '20' + match[3] : match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      break;
    }
  }

  // Detect merchant/store name (first non-empty line usually)
  const description = lines[0] || 'Receipt scan';

  return { amount, date, description };
};
