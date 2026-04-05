# WP App – Firebase Database Schema

## Overview

All data is stored in **Cloud Firestore** (NoSQL), organized in top-level collections.
Each document inside a user-owned collection has a `userId` field used in security rules.

---

## Collections

### 1. `users/{uid}`

The main user profile document. Created on registration.

```json
{
  "uid":                  "string (Firebase Auth UID)",
  "email":               "string",
  "displayName":         "string",
  "photoURL":            "string | null",
  "currency":            "string (default: 'IDR')",
  "language":            "string (default: 'id')",
  "theme":               "string ('dark' | 'light')",
  "notificationsEnabled": "boolean",
  "biometricEnabled":    "boolean",
  "pinEnabled":          "boolean",
  "expoPushToken":       "string | null",
  "tokenUpdatedAt":      "Timestamp | null",
  "createdAt":           "Timestamp",
  "updatedAt":           "Timestamp"
}
```

**Indexes required:** none (single-document, always fetched by UID)

---

### 2. `transactions/{transactionId}`

Each income or expense entry.

```json
{
  "userId":        "string (ref → users/{uid})",
  "amount":        "number (always positive)",
  "type":          "string ('income' | 'expense')",
  "category":      "string (display name, e.g. 'Food & Drink')",
  "categoryId":    "string (e.g. 'food', 'salary', or custom UUID)",
  "walletId":      "string | null (ref → wallets/{walletId})",
  "walletName":    "string | null (snapshot display name)",
  "categoryIcon":  "string (emoji, e.g. '🍔')",
  "categoryColor": "string (hex, e.g. '#F97316')",
  "description":   "string (optional, user note)",
  "date":          "Timestamp (transaction date chosen by user)",
  "receiptUrl":    "string | null (Firebase Storage URL)",
  "tags":          "string[] (optional labels)",
  "createdAt":     "Timestamp (server)",
  "updatedAt":     "Timestamp (server)"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `userId` + `date` | ASC/DESC | Transaction history |
| `userId` + `type` + `date` | DESC | Filter by income/expense |
| `userId` + `categoryId` + `date` | DESC | Filter by category |
| `userId` + `date` (range) | ASC | Monthly reports |

---

### 3. `budgets/{budgetId}`

Monthly spending limits per category, optionally tied to a specific wallet/funding source.

```json
{
  "userId":       "string",
  "categoryId":   "string",
  "categoryName": "string",
  "categoryIcon": "string (emoji)",
  "walletId":     "string | null (ref → wallets/{walletId})",
  "walletName":   "string | null (snapshot display name)",
  "amount":       "number (budget limit)",
  "spent":        "number (running total, updated on each expense)",
  "period":       "string ('monthly' | 'weekly' | 'yearly')",
  "month":        "number (1–12)",
  "year":         "number (e.g. 2026)",
  "createdAt":    "Timestamp",
  "updatedAt":    "Timestamp"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `userId` + `year` + `month` | ASC | Fetch monthly budgets |
| `userId` + `categoryId` + `year` + `month` | — | Update spent amount |

---

### 4. `reminders/{reminderId}`

Recurring bill reminders and their notification schedules.

```json
{
  "userId":         "string",
  "name":           "string (e.g. 'Electricity Bill')",
  "amount":         "number",
  "category":       "string",
  "dueDate":        "string (ISO date, e.g. '2026-04-15')",
  "recurringDay":   "number | null (1–31, day of month for auto-advance)",
  "isRecurring":    "boolean",
  "daysBefore":     "number (how many days before to notify, default: 1)",
  "isActive":       "boolean",
  "reminderType":   "string ('bill' | 'debt')",
  "linkedTransactionId": "string | null",
  "linkedDebtId":   "string | null",
  "notificationId": "string | null (Expo scheduled notification ID)",
  "createdAt":      "Timestamp",
  "updatedAt":      "Timestamp | null"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `userId` + `isActive` | — | Fetch active reminders |

---

### 5. `categories/{categoryId}`

Custom user-defined categories (default categories are stored locally).

```json
{
  "userId":    "string",
  "name":      "string",
  "icon":      "string (emoji)",
  "color":     "string (hex)",
  "type":      "string ('income' | 'expense' | 'both')",
  "createdAt": "Timestamp"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `userId` | — | Fetch user's custom categories |

---

### 6. `assets/{assetId}`

User asset portfolio entries such as gold, cash, property, and vehicles.

```json
{
  "userId":        "string",
  "name":          "string",
  "type":          "string ('gold' | 'cash' | 'property' | 'vehicle' | 'crypto' | 'other')",
  "unit":          "string (e.g. 'gram', 'pcs')",
  "quantity":      "number",
  "buyPrice":      "number",
  "currentPrice":  "number",
  "notes":         "string | null",
  "createdAt":     "Timestamp",
  "updatedAt":     "Timestamp"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `userId` + `createdAt` | DESC | Asset portfolio sorting |

---

### 7. `appConfig/ocr`

Global application config for OCR service credentials.

```json
{
  "ocrSpaceApiKey": "string",
  "updatedAt":      "Timestamp | null"
}
```

This document is intended to be updated manually from **Firebase Console** when the OCR.Space key changes, so mobile clients do not store a long-lived local copy.

---

### 8. `wallets/{walletId}`

Funding sources used by transactions, such as cash, bank accounts, and e-wallets.

```json
{
  "userId":     "string",
  "name":       "string",
  "balance":    "number",
  "createdAt":  "Timestamp",
  "updatedAt":  "Timestamp"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `userId` + `createdAt` | DESC | Wallet sorting |

---

### 9. `debts/{debtId}`

Debt and receivable records with installment tracking, due dates, and payment history.

```json
{
  "householdId":        "string (shared account or owner UID)",
  "userId":             "string (creator UID)",
  "type":               "string ('debt' | 'receivable')",
  "title":              "string",
  "counterpartName":    "string",
  "principalAmount":    "number",
  "paidAmount":         "number",
  "outstandingAmount":  "number",
  "paymentScheme":      "string ('full' | 'installment')",
  "installmentAmount":  "number | null",
  "installmentFrequency":"string ('weekly' | 'monthly')",
  "totalInstallments":  "number | null",
  "paidInstallments":   "number",
  "dueDate":            "string | null (ISO date for next due payment)",
  "startDate":          "string (ISO date)",
  "remindDaysBefore":   "number",
  "walletId":           "string | null",
  "walletName":         "string | null",
  "description":        "string",
  "paymentHistory": [
    {
      "id":             "string",
      "amount":         "number",
      "date":           "string (ISO date)",
      "note":           "string",
      "walletId":       "string | null",
      "walletName":     "string | null",
      "transactionId":  "string | null"
    }
  ],
  "lastPaymentDate":    "string | null",
  "status":             "string ('active' | 'overdue' | 'paid')",
  "createdByUid":       "string",
  "createdByName":      "string",
  "updatedByUid":       "string",
  "updatedByName":      "string",
  "createdAt":          "Timestamp",
  "updatedAt":          "Timestamp"
}
```

**Composite Indexes required:**

| Fields | Order | Purpose |
|---|---|---|
| `householdId` + `updatedAt` | DESC | Shared debt / receivable list |

---

## Relationships Diagram

```
users/{uid}
    │
    ├── transactions/{transactionId}   ← userId field
    ├── budgets/{budgetId}             ← userId field
    ├── reminders/{reminderId}         ← userId field
    └── categories/{categoryId}        ← userId field
    └── assets/{assetId}               ← userId field
    └── wallets/{walletId}             ← userId field
    └── debts/{debtId}                 ← householdId + userId fields
```

> All collections are **top-level** (not subcollections) for easier querying with
> composite indexes. Each document carries a `userId` field for ownership checks.

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function isValidTransaction() {
      let d = request.resource.data;
      return d.amount is number && d.amount > 0
          && d.type in ['income', 'expense']
          && d.userId == request.auth.uid;
    }

    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    match /transactions/{docId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId) && isValidTransaction();
      allow update: if isOwner(resource.data.userId) && request.resource.data.userId == resource.data.userId;
    }

    match /budgets/{docId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create, update: if isOwner(request.resource.data.userId);
    }

    match /reminders/{docId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create, update: if isOwner(request.resource.data.userId);
    }

    match /categories/{docId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create, update: if isOwner(request.resource.data.userId);
    }

    match /appConfig/{docId} {
      allow read: if request.auth != null;
    }
  }
}
```

---

## Firebase Storage Structure (for Receipts)

```
receipts/
  {userId}/
    {transactionId}.jpg
```

**Storage Rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## FCM (Cloud Messaging) Flow

```
Transaction added (expense)
  → sendTransactionNotification()   [local, immediate]
  → updateBudgetSpent()             [Firestore update]
  → if budget >= 80% used:
      sendBudgetWarningNotification() [local, immediate]

Reminder created
  → scheduleReminderNotification()  [expo-notifications, scheduled]
  → Fires X days before dueDate at 09:00 AM
```

---

## Default Categories (stored locally in `src/constants/categories.js`)

These are **not** stored in Firestore — they are bundled with the app.
Only **custom** categories created by the user are stored in the `categories` collection.

| Type | ID | Name | Icon |
|---|---|---|---|
| expense | food | Food & Drink | 🍔 |
| expense | transportation | Transportation | 🚗 |
| expense | bills | Bills & Utilities | 🧾 |
| expense | entertainment | Entertainment | 🎬 |
| expense | shopping | Shopping | 🛍️ |
| expense | health | Health & Medical | 💊 |
| expense | education | Education | 📚 |
| expense | travel | Travel | ✈️ |
| expense | housing | Housing & Rent | 🏠 |
| income | salary | Salary | 💼 |
| income | freelance | Freelance | 💻 |
| income | investment | Investment | 📈 |
| income | business | Business | 🏢 |
| income | bonus | Bonus | 🎉 |
| both | other | Other | 📦 |
