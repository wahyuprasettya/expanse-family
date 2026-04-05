// ============================================================
// Export Service (JSON + CSV + PDF)
// ============================================================
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { format } from 'date-fns';
import { enUS, id as localeId } from 'date-fns/locale';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { translations } from '@localization/translations';
import { db } from '@services/firebase/config';
import { serializeFirestoreValue } from '@utils/firestore';

const sortBackupItems = (items = []) => [...items].sort((first, second) => {
  const firstDate = first?.date || first?.dueDate || first?.createdAt || first?.updatedAt || '';
  const secondDate = second?.date || second?.dueDate || second?.createdAt || second?.updatedAt || '';

  return String(secondDate).localeCompare(String(firstDate));
});

const getUserCollectionData = async (collectionName, userId) => {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where('userId', '==', userId))
  );

  return snapshot.docs.map((document) =>
    serializeFirestoreValue({
      id: document.id,
      ...document.data(),
    })
  );
};

export const exportManualBackupToJSON = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    if (!FileSystem.documentDirectory) {
      throw new Error('Storage directory is not available.');
    }

    const allTransactions = await getUserCollectionData('transactions', userId);
    const savedDebts = await getUserCollectionData('debts', userId);
    const wallets = sortBackupItems(await getUserCollectionData('wallets', userId));
    const transactions = sortBackupItems(
      allTransactions.filter((transaction) => transaction.type !== 'debt')
    );
    const debts = sortBackupItems(
      savedDebts.length > 0
        ? savedDebts
        : allTransactions.filter((transaction) => transaction.type === 'debt')
    );

    const createdAt = new Date().toISOString();
    const filename = `backup-${format(new Date(createdAt), 'yyyy-MM-dd')}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    const backupPayload = {
      version: '1.0',
      createdAt,
      data: {
        transactions,
        debts,
        wallets,
      },
    };

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(backupPayload, null, 2),
      {
        encoding: FileSystem.EncodingType.UTF8,
      }
    );

    const shareAvailable = await Sharing.isAvailableAsync();
    if (shareAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share backup file',
      });
    }

    return {
      uri: fileUri,
      filename,
      createdAt,
      shareAvailable,
      counts: {
        transactions: transactions.length,
        debts: debts.length,
        wallets: wallets.length,
      },
      error: null,
    };
  } catch (error) {
    return {
      uri: null,
      filename: null,
      createdAt: null,
      shareAvailable: false,
      counts: {
        transactions: 0,
        debts: 0,
        wallets: 0,
      },
      error: error.message,
    };
  }
};

// ─── Export to CSV (Excel-compatible) ────────────────────────
export const exportToCSV = async (transactions, summary = null, filename = 'transactions', language = 'id') => {
  try {
    const commonT = translations[language]?.common || translations.id.common;
    const reportsT = translations[language]?.reports || translations.id.reports;
    const assetsT = translations[language]?.assets || translations.id.assets;

    const transactionHeaders = [
      commonT.date || 'Date',
      commonT.type || 'Type',
      commonT.category || 'Category',
      commonT.description || 'Description',
      commonT.amount || 'Amount',
    ];

    const transactionRows = transactions.map((t) => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      translations[language]?.transaction?.typeValue?.[t.type] || t.type,
      t.category,
      `"${t.description || ''}"`,
      t.amount,
    ]);

    const csvSections = [
      [reportsT.title || 'Report'],
      transactionHeaders,
      ...transactionRows,
    ];

    if (summary?.assets?.length) {
      const assetHeaders = [
        assetsT.assetName || 'Asset Name',
        assetsT.assetType || 'Type',
        assetsT.unit || 'Unit',
        assetsT.quantity || 'Quantity',
        assetsT.purchaseValue || 'Value at purchase',
        assetsT.currentPrice || 'Current price / unit',
        assetsT.totalValue || 'Total Value',
        assetsT.profit || 'Profit / Loss',
      ];

      const assetRows = summary.assets.map((asset) => [
        asset.name,
        translations[language]?.assets?.types?.[asset.type] || asset.type,
        asset.unit,
        asset.qty,
        asset.cost,
        asset.currentPrice,
        asset.value,
        asset.profit,
      ]);

      csvSections.push([]);
      csvSections.push([assetsT.myAssets || 'My Assets']);
      csvSections.push(assetHeaders);
      csvSections.push(...assetRows);
    }

    const csvContent = csvSections.map((row) => row.join(',')).join('\n');
    const fileUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: language === 'id' ? 'Ekspor Laporan' : 'Export Report',
      });
    }

    return { uri: fileUri, error: null };
  } catch (error) {
    return { uri: null, error: error.message };
  }
};

// ─── Export to Simple HTML/PDF ────────────────────────────────
export const exportToPDF = async (transactions, summary, filename = 'report', language = 'id') => {
  try {
    const t = translations[language]?.reports || translations.id.reports;
    const dateLocale = language === 'en' ? enUS : localeId;
    const intlLocale = language === 'en' ? 'en-US' : 'id-ID';

    const rows = transactions.map((transaction) => {
      const typeLabel = translations[language]?.transaction?.typeValue?.[transaction.type] || transaction.type;
      const typeColor = transaction.type === 'income'
        ? '#10B981'
        : transaction.type === 'transfer'
          ? '#6366F1'
          : '#EF4444';
      return `
      <tr>
        <td>${format(new Date(transaction.date), 'dd/MM/yyyy', { locale: dateLocale })}</td>
        <td style="color:${typeColor}">${typeLabel}</td>
        <td>${transaction.category}</td>
        <td>${transaction.description || '-'}</td>
        <td style="text-align:right;font-weight:bold;">Rp ${transaction.amount.toLocaleString(intlLocale)}</td>
      </tr>
    `}).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1E293B; }
          h1 { color: #6366F1; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .summary-card { background: #F8FAFC; padding: 15px; border-radius: 8px; flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #6366F1; color: white; padding: 10px; text-align: left; }
          td { padding: 8px 10px; border-bottom: 1px solid #E2E8F0; }
          tr:nth-child(even) { background: #F8FAFC; }
        </style>
      </head>
      <body>
        <h1>💰 WP App – ${t.title}</h1>
        <p>${language === 'id' ? 'Dibuat' : 'Generated'}: ${format(new Date(), 'dd MMMM yyyy', { locale: dateLocale })}</p>
        <div class="summary">
          <div class="summary-card">
            <h3 style="color:#10B981">${t.income}</h3>
            <p>Rp ${summary.income.toLocaleString(intlLocale)}</p>
          </div>
          <div class="summary-card">
            <h3 style="color:#EF4444">${t.expenses}</h3>
            <p>Rp ${summary.expense.toLocaleString(intlLocale)}</p>
          </div>
          <div class="summary-card">
            <h3>${t.balance}</h3>
            <p>Rp ${summary.balance.toLocaleString(intlLocale)}</p>
          </div>
        </div>
        ${summary.assets && summary.assets.length > 0 ? `
        <h2 style="color: #F59E0B; margin-top: 30px;">${translations[language]?.assets?.portfolioBreakdown || 'Portfolio Breakdown'}</h2>
        <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <div style="text-align: center;">
              <strong>${translations[language]?.assets?.totalValue || 'Total Value'}</strong><br>
              Rp ${summary.totalAssetValue.toLocaleString(intlLocale)}
            </div>
            <div style="text-align: center;">
              <strong>${translations[language]?.assets?.totalCost || 'Total Cost'}</strong><br>
              Rp ${summary.totalAssetCost.toLocaleString(intlLocale)}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <div style="text-align: center;">
              <strong style="color:${summary.totalAssetProfit >= 0 ? '#16A34A' : '#DC2626'}">${translations[language]?.assets?.totalGain || 'Total Gain'}</strong><br>
              <span style="color:${summary.totalAssetProfit >= 0 ? '#16A34A' : '#DC2626'}">${summary.totalAssetProfit >= 0 ? '+' : ''}Rp ${summary.totalAssetProfit.toLocaleString(intlLocale)}</span>
            </div>
            <div style="text-align: center;">
              <strong style="color:${summary.totalAssetProfit >= 0 ? '#16A34A' : '#DC2626'}">ROI</strong><br>
              <span style="color:${summary.totalAssetProfit >= 0 ? '#16A34A' : '#DC2626'}">${summary.totalAssetCost > 0 ? `${(summary.totalAssetProfit / summary.totalAssetCost * 100).toFixed(1)}%` : '0%'}</span>
            </div>
          </div>
        </div>
        ` : ''}
        <table>
          <thead><tr><th>${translations[language]?.common?.date || 'Date'}</th><th>${translations[language]?.common?.type || 'Type'}</th><th>${translations[language]?.common?.category || 'Category'}</th><th>${translations[language]?.common?.description || 'Description'}</th><th>${translations[language]?.common?.amount || 'Amount'}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${summary.assets && summary.assets.length > 0 ? `
        <h2 style="color: #6366F1; margin-top: 30px;">${translations[language]?.assets?.myAssets || 'My Assets'}</h2>
        <table>
          <thead><tr><th>${translations[language]?.assets?.assetName || 'Asset Name'}</th><th>${translations[language]?.assets?.assetType || 'Type'}</th><th>${translations[language]?.assets?.unit || 'Unit'}</th><th>${translations[language]?.assets?.quantity || 'Quantity'}</th><th>${translations[language]?.assets?.purchaseValue || 'Value at purchase'}</th><th>${translations[language]?.assets?.currentPrice || 'Current price / unit'}</th><th>${translations[language]?.assets?.totalValue || 'Total Value'}</th><th>${translations[language]?.assets?.profit || 'Profit/Loss'}</th></tr></thead>
          <tbody>${summary.assets.map(asset => `
            <tr>
              <td>${asset.name}</td>
              <td>${translations[language]?.assets?.types?.[asset.type] || asset.type}</td>
              <td>${asset.unit}</td>
              <td style="text-align:right;">${asset.qty.toLocaleString(intlLocale)}</td>
              <td style="text-align:right;">Rp ${asset.cost.toLocaleString(intlLocale)}</td>
              <td style="text-align:right;">Rp ${asset.currentPrice.toLocaleString(intlLocale)}</td>
              <td style="text-align:right;font-weight:bold;">Rp ${asset.value.toLocaleString(intlLocale)}</td>
              <td style="text-align:right;color:${asset.profit >= 0 ? '#16A34A' : '#DC2626'};">${asset.profit >= 0 ? '+' : ''}Rp ${asset.profit.toLocaleString(intlLocale)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
        ` : ''}
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    const newUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: newUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: language === 'id' ? 'Bagikan Laporan' : 'Share Report',
      });
    }

    return { uri: newUri, error: null };
  } catch (error) {
    return { uri: null, error: error.message };
  }
};
