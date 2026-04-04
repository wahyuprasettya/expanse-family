// ============================================================
// OCR Receipt Scanning Service
// ============================================================
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { getOCRConfig } from '@services/firebase/appConfig';

const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';
const LEGACY_OCR_SPACE_API_KEY = 'ocrSpaceApiKey';
let cachedOCRApiKey = null;
let hasLoadedOCRApiKey = false;
let hasClearedLegacyOCRApiKey = false;

const clearLegacyOCRApiKey = async () => {
  if (hasClearedLegacyOCRApiKey) {
    return;
  }

  try {
    await SecureStore.deleteItemAsync(LEGACY_OCR_SPACE_API_KEY);
  } catch (_error) {
    // Ignore cleanup failures. The app no longer relies on local OCR keys.
  } finally {
    hasClearedLegacyOCRApiKey = true;
  }
};

export const getOCRApiKey = async (options = {}) => {
  const forceRefresh = options.forceRefresh === true;
  await clearLegacyOCRApiKey();

  if (!forceRefresh && hasLoadedOCRApiKey) {
    return cachedOCRApiKey || '';
  }

  const { config, error } = await getOCRConfig();

  if (error) {
    throw new Error(error);
  }

  const apiKey = String(config?.ocrSpaceApiKey || '').trim();
  cachedOCRApiKey = apiKey;
  hasLoadedOCRApiKey = true;

  return apiKey;
};

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

// ─── OCR.Space Scan ──────────────────────────────────────────
export const extractTextFromReceiptImage = async ({ base64, apiKey, language = 'eng' }) => {
  try {
    const normalizedApiKey = String(apiKey || '').trim() || await getOCRApiKey({ forceRefresh: true });

    if (!normalizedApiKey) {
      return {
        text: '',
        parsedData: null,
        rawResponse: null,
        error: 'API key OCR Space belum diisi.',
      };
    }

    if (!base64) {
      return {
        text: '',
        parsedData: null,
        rawResponse: null,
        error: 'Gambar struk tidak tersedia untuk diproses.',
      };
    }

    const formData = new FormData();
    formData.append('apikey', normalizedApiKey);
    formData.append('language', language);
    formData.append('isOverlayRequired', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');
    formData.append('base64Image', `data:image/jpeg;base64,${base64}`);

    const response = await fetch(OCR_SPACE_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR request failed with status ${response.status}`);
    }

    const result = await response.json();
    const text = extractParsedText(result);
    const serviceError = getOCRServiceError(result);

    if (!text) {
      return {
        text: '',
        parsedData: null,
        rawResponse: result,
        error: serviceError || 'OCR tidak menemukan teks pada struk ini.',
      };
    }

    return {
      text,
      parsedData: parseReceiptText(text, { totalOnly: true }),
      rawResponse: result,
      error: null,
    };
  } catch (error) {
    return {
      text: '',
      parsedData: null,
      rawResponse: null,
      error: error.message || 'Gagal memproses foto struk.',
    };
  }
};

// ─── Manual OCR Parsing ──────────────────────────────────────
// Fallback manual: the user can paste the receipt text or type it manually,
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

const extractParsedText = (ocrResult) => {
  const parsedText = (ocrResult?.ParsedResults || [])
    .map((result) => {
      const directText = normalizeReceiptText(result?.ParsedText).trim();
      if (directText) return directText;

      const overlayText = (result?.TextOverlay?.Lines || [])
        .map((line) => line?.LineText || (line?.Words || []).map((word) => word?.WordText).join(' '))
        .filter(Boolean)
        .join('\n');

      return normalizeReceiptText(overlayText).trim();
    })
    .filter(Boolean)
    .join('\n');

  return parsedText.trim();
};

const getOCRServiceError = (ocrResult) => {
  const responseErrors = []
    .concat(ocrResult?.ErrorMessage || [])
    .concat(
      (ocrResult?.ParsedResults || []).flatMap((result) => []
        .concat(result?.ErrorMessage || [])
        .concat(result?.ErrorDetails || [])
      ),
    )
    .filter(Boolean)
    .map((message) => String(message).trim())
    .filter(Boolean);

  if (responseErrors.length > 0) {
    return responseErrors.join('\n');
  }

  if (ocrResult?.IsErroredOnProcessing) {
    return 'OCR Space gagal memproses struk ini.';
  }

  return null;
};

// ─── Parse Receipt Text ───────────────────────────────────────
const parseReceiptText = (text, options = {}) => {
  const normalizedText = normalizeReceiptText(text);
  const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  const totalOnly = options.totalOnly === true;
  const itemizedLines = totalOnly ? [] : extractItemizedLines(lines);
  const itemizedTotal = itemizedLines.reduce((sum, item) => sum + item.amount, 0);
  const amount = detectReceiptTotal(lines);

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
    : !totalOnly && itemizedLines.length > 0
      ? 'manual_sum'
      : 'not_found';

  return {
    amount: amount || (!totalOnly ? itemizedTotal : null) || null,
    amountSource,
    date,
    description,
    itemizedLines: totalOnly ? [] : itemizedLines,
    itemizedTotal: totalOnly ? null : itemizedTotal || null,
  };
};

const detectReceiptTotal = (lines) => {
  const totalPatterns = [
    { score: 7, pattern: /(grand\s?total|final\s?total|total\s?pesanan|jumlah\s?pesanan|total\s?bayar|jumlah\s?bayar|amount\s?due|total\s?payment|total\s?price)/i },
    { score: 6, pattern: /(total\s?pembayaran|total\s?belanja|total\s?harga|jumlah\s?harga|total\s?tagihan|jumlah\s?total|order\s?total|price\s?total)/i },
    { score: 4, pattern: /\btotal\b/i },
    { score: 1, pattern: /(sub\s?total|subtotal)/i },
  ];

  const candidates = lines.flatMap((line, index) => totalPatterns
    .map(({ score, pattern }) => {
      const labelMatch = line.match(pattern);
      if (!labelMatch) return null;

      const amountOnSameLine = extractAmountAfterLabel(line, labelMatch);
      const amountOnNextLine = amountOnSameLine ? null : extractLastAmountFromLine(lines[index + 1]);
      const amountOnPreviousLine = amountOnSameLine || amountOnNextLine
        ? null
        : extractLastAmountFromLine(lines[index - 1]);
      const amount = amountOnSameLine || amountOnNextLine || amountOnPreviousLine;
      if (!amount) return null;

      const proximityScore = amountOnSameLine ? 3 : amountOnNextLine ? 2 : 1;

      return {
        amount,
        score,
        proximityScore,
        index,
        source: amountOnSameLine ? 'same_line' : amountOnNextLine ? 'next_line' : 'previous_line',
      };
    })
    .filter(Boolean));

  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.proximityScore !== left.proximityScore) return right.proximityScore - left.proximityScore;
    return right.index - left.index;
  });

  return candidates[0].amount;
};

const extractAmountAfterLabel = (line, labelMatch) => {
  if (!line || !labelMatch) return null;

  const labelEndIndex = (labelMatch.index || 0) + String(labelMatch[0] || '').length;
  const trailingText = String(line).slice(labelEndIndex);

  return extractLastAmountFromLine(trailingText);
};

const extractLastAmountFromLine = (line) => {
  if (!line) return null;

  const matches = Array.from(
    String(line || '').matchAll(/(?:rp\.?\s*|idr\s*|usd\s*|myr\s*|sgd\s*|₱\s*|฿\s*|¥\s*|€\s*|\$\s*)?(\d[\d.,\s]{1,})/gi),
  );

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const amount = parseReceiptAmount(matches[index][1]);
    if (amount && amount >= 100) {
      return amount;
    }
  }

  return null;
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
  .replace(/\u00A0/g, ' ')
  .replace(/\t+/g, ' ')
  .replace(/[ ]{2,}/g, ' ')
  .replace(/\n[ ]+/g, '\n')
  .replace(/[ ]+\n/g, '\n');

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
