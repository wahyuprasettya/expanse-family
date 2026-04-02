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
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
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

// ─── Manual OCR Parsing ──────────────────────────────────────
// This app intentionally avoids external OCR APIs.
// The user can paste the text from a receipt or type it manually,
// and we will parse the total, date, merchant, and itemized lines locally.
export const extractTextFromReceipt = async (manualText) => {
  try {
    const text = String(manualText || '').trim();

    if (!text) {
      return {
        text: '',
        parsedData: null,
        error: 'Teks struk masih kosong. Tempel atau ketik hasil baca struk dulu.',
      };
    }

    return { text, parsedData: parseReceiptText(text), error: null };
  } catch (error) {
    return { text: null, parsedData: null, error: error.message };
  }
};

// ─── Parse Receipt Text ───────────────────────────────────────
const parseReceiptText = (text) => {
  const normalizedText = normalizeReceiptText(text);
  const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  const itemizedLines = extractItemizedLines(lines);
  const itemizedTotal = itemizedLines.reduce((sum, item) => sum + item.amount, 0);

  // Detect total amount (various patterns)
  const totalPatterns = [
    /(?:sub\s?total|subtotal)[:\s]+(?:rp\.?\s*|idr\s*)?([\d.,]+(?:\s*[\d.,]+)*)/i,
    /(?:grand\s?total|total\s?bayar|total\s?belanja|total\s?harga|jumlah\s?bayar|amount|total)[:\s]+(?:rp\.?\s*|idr\s*|usd\s*|myr\s*|sgd\s*)?([\d.,]+(?:\s*[\d.,]+)*)/i,
    /(?:total)\s*(?:rp\.?\s*|idr\s*)?([\d.,]+(?:\s*[\d.,]+)*)/i,
  ];

  let amount = null;
  for (const pattern of totalPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        amount = parseReceiptAmount(match[1]);
        break;
      }
    }
    if (amount) break;
  }

  // Detect date
  const datePatterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
  ];
  let date = new Date().toISOString().split('T')[0];
  for (const line of lines) {
    for (const datePattern of datePatterns) {
      const match = line.match(datePattern);
      if (match) {
        if (datePattern === datePatterns[0]) {
          date = `${match[3].length === 2 ? `20${match[3]}` : match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        } else {
          date = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
        break;
      }
    }
  }

  // Detect merchant/store name (first non-empty line usually)
  const description = detectMerchantName(lines) || 'Receipt scan';

  const amountSource = amount
    ? 'detected_total'
    : itemizedLines.length > 0
      ? 'manual_sum'
      : 'not_found';

  return {
    amount: amount || itemizedTotal || null,
    amountSource,
    date,
    description,
    itemizedLines,
    itemizedTotal: itemizedTotal || null,
  };
};

const parseReceiptAmount = (rawValue) => {
  const sanitized = String(rawValue).replace(/[^\d.,]/g, '');
  if (!sanitized) return null;

  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');
  const lastSeparatorIndex = Math.max(lastComma, lastDot);

  if (lastSeparatorIndex !== -1) {
    const decimalPart = sanitized.slice(lastSeparatorIndex + 1);
    if (decimalPart.length === 2) {
      const normalized = `${sanitized.slice(0, lastSeparatorIndex).replace(/[.,]/g, '')}.${decimalPart}`;
      return Math.round(parseFloat(normalized) || 0);
    }
  }

  return parseInt(sanitized.replace(/[.,]/g, ''), 10) || null;
};

const normalizeReceiptText = (text) => String(text || '')
  .replace(/\r/g, '\n')
  .replace(/[•·]/g, ' ')
  .replace(/[|]/g, ' ')
  .replace(/\u00A0/g, ' ');

const detectMerchantName = (lines) => {
  const ignored = /(thank you|terima kasih|receipt|struk|invoice|bill|total|subtotal|cashier|kasir|tax|ppn|pajak|date|waktu|time)/i;
  return lines.find((line) => line.length > 2 && !ignored.test(line)) || lines[0] || '';
};

const isSummaryLine = (line) => /(sub\s?total|subtotal|grand total|total|jumlah|tax|pajak|ppn|cash|tunai|kembalian|change|diskon|discount|service|debit|credit|card|bayar|payment|paid)/i.test(line);
const isLikelyDateOrTime = (line) => /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})|(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})|(\d{1,2}:\d{2})/.test(line);

const extractItemizedLines = (lines) => lines
  .map((line) => {
    if (isSummaryLine(line) || isLikelyDateOrTime(line)) return null;

    const match = line.match(/^(.+?)\s+(?:rp\.?\s*|idr\s*|usd\s*|myr\s*|sgd\s*|₱\s*|฿\s*|¥\s*|€\s*|\$\s*)?([\d][\d.,\s]*)$/i);
    if (!match) return null;

    const name = match[1].trim();
    const amount = parseReceiptAmount(match[2]);

    if (!name || !/[A-Za-z]/.test(name) || !amount || amount < 100) return null;

    return { name, amount };
  })
  .filter(Boolean);
