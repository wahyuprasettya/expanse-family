// ============================================================
// Export Service (Excel + PDF)
// ============================================================
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

// ─── Export to CSV (Excel-compatible) ────────────────────────
export const exportToCSV = async (transactions, filename = 'transactions') => {
  try {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const rows = transactions.map((t) => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.type,
      t.category,
      `"${t.description || ''}"`,
      t.amount,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const fileUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.csv`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Transactions',
      });
    }

    return { uri: fileUri, error: null };
  } catch (error) {
    return { uri: null, error: error.message };
  }
};

// ─── Export to Simple HTML/PDF ────────────────────────────────
export const exportToPDF = async (transactions, summary, filename = 'report') => {
  try {
    const rows = transactions.map((t) => `
      <tr>
        <td>${format(new Date(t.date), 'dd/MM/yyyy')}</td>
        <td style="color:${t.type === 'income' ? '#10B981' : '#EF4444'}">${t.type}</td>
        <td>${t.category}</td>
        <td>${t.description || '-'}</td>
        <td style="text-align:right;font-weight:bold;">Rp ${t.amount.toLocaleString('id-ID')}</td>
      </tr>
    `).join('');

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
        <h1>💰 WP App – Financial Report</h1>
        <p>Generated: ${format(new Date(), 'dd MMMM yyyy')}</p>
        <div class="summary">
          <div class="summary-card">
            <h3 style="color:#10B981">Total Income</h3>
            <p>Rp ${summary.income.toLocaleString('id-ID')}</p>
          </div>
          <div class="summary-card">
            <h3 style="color:#EF4444">Total Expense</h3>
            <p>Rp ${summary.expense.toLocaleString('id-ID')}</p>
          </div>
          <div class="summary-card">
            <h3>Balance</h3>
            <p>Rp ${summary.balance.toLocaleString('id-ID')}</p>
          </div>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>
    `;

    const fileUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.html`;
    await FileSystem.writeAsStringAsync(fileUri, html, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Export Report',
      });
    }

    return { uri: fileUri, error: null };
  } catch (error) {
    return { uri: null, error: error.message };
  }
};
