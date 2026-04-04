const ANTAM_GOLD_PRICE_URL = 'https://www.logammulia.com/en/harga-emas-hari-ini';
const GOLD_PRICE_USD_ENDPOINT = 'https://api.gold-api.com/price/XAU/USD';
const USD_IDR_ENDPOINT = 'https://open.er-api.com/v6/latest/USD';
const TROY_OUNCE_IN_GRAMS = 31.1034768;

const getJson = async (url) => {
  const response = await fetch(url);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to fetch market data');
  }

  return data;
};

const getText = async (url) => {
  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error('Failed to fetch market page');
  }

  return text;
};

const normalizeText = (text) => text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const parseIdrAmount = (value) => Number(String(value || '').replace(/[^\d]/g, '')) || 0;

export const fetchAntamGoldPricePerGramInIdr = async () => {
  const html = await getText(ANTAM_GOLD_PRICE_URL);
  const content = normalizeText(html);

  const priceMatch = content.match(/Emas Batangan\s+0\.5 gr\s+[\d,]+\s+[\d,]+\s+1 gr\s+([\d,]+)/i);
  const dateMatch = content.match(/Gold Price Today,\s*([0-9]{2}\s+[A-Za-z]{3}\s+[0-9]{4})/i);
  const timeMatch = content.match(/Harga di-update setiap hari pkl\.\s*([0-9.]+\s*WIB)/i);

  const pricePerGramIdr = parseIdrAmount(priceMatch?.[1]);
  if (!pricePerGramIdr) {
    throw new Error('Failed to parse ANTAM gold price');
  }

  return {
    pricePerGramIdr,
    updatedAt: null,
    updatedAtLabel: [dateMatch?.[1], timeMatch?.[1]].filter(Boolean).join(' · ') || null,
    source: 'antam',
    isFallback: false,
    sourceUrl: ANTAM_GOLD_PRICE_URL,
  };
};

export const fetchSpotGoldPricePerGramInIdr = async () => {
  const [goldQuote, usdRates] = await Promise.all([
    getJson(GOLD_PRICE_USD_ENDPOINT),
    getJson(USD_IDR_ENDPOINT),
  ]);

  const ouncePriceUsd = Number(goldQuote?.price);
  const usdToIdr = Number(usdRates?.rates?.IDR);

  if (!ouncePriceUsd || !usdToIdr) {
    throw new Error('Invalid gold price response');
  }

  const pricePerGramUsd = ouncePriceUsd / TROY_OUNCE_IN_GRAMS;
  const pricePerGramIdr = Math.round(pricePerGramUsd * usdToIdr);

  return {
    ouncePriceUsd,
    usdToIdr,
    pricePerGramUsd,
    pricePerGramIdr,
    updatedAt: goldQuote?.updatedAt || usdRates?.time_last_update_utc || null,
    updatedAtLabel: null,
    source: 'spot',
    isFallback: true,
    sourceUrl: GOLD_PRICE_USD_ENDPOINT,
  };
};

export const fetchGoldPricePerGramInIdr = async () => {
  try {
    const antamData = await fetchAntamGoldPricePerGramInIdr();
    return {
      data: antamData,
      error: null,
    };
  } catch (antamError) {
    try {
      const spotData = await fetchSpotGoldPricePerGramInIdr();
      return {
        data: spotData,
        error: null,
      };
    } catch (spotError) {
      return {
        data: null,
        error: spotError?.message || antamError?.message || 'Failed to fetch gold price',
      };
    }
  }
};

export default fetchGoldPricePerGramInIdr;
