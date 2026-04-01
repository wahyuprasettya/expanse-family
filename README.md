# WP App – Personal Finance App

A comprehensive personal finance tracker built with **React Native Expo** + **Firebase**.

## 🚀 Features

| Feature | Status |
|---|---|
| 🔐 Email/Password Auth | ✅ |
| 🔑 PIN Authentication | ✅ |
| 👆 Biometric (Face ID / Fingerprint) | ✅ |
| 💸 Income & Expense Tracking | ✅ |
| 📂 Transaction Categories (default + custom) | ✅ |
| 💰 Real-time Balance Calculation | ✅ |
| 📋 Transaction History + Filters | ✅ |
| 📊 Monthly/Yearly Reports + Charts | ✅ |
| 🎯 Budget Limits per Category | ✅ |
| 📈 Spending Insights (month-over-month) | ✅ |
| 🔔 Bill Reminders + Push Notifications | ✅ |
| 🧾 Receipt Scanning (OCR) | ✅ |
| ☁️ Firebase Cloud Backup | ✅ |
| 📤 Export to CSV / HTML-PDF | ✅ |
| 🌙 Dark Mode | ✅ |

---

## 🛠 Tech Stack

- **React Native** (Expo SDK 51)
- **Firebase**: Auth, Firestore, Cloud Messaging
- **Redux Toolkit** – state management
- **React Navigation** – bottom tabs + stack
- **expo-local-authentication** – biometrics
- **expo-notifications** – push / scheduled
- **expo-camera / expo-image-picker** – receipt scan
- **Google Cloud Vision API** – OCR
- **react-native-chart-kit** + **react-native-svg** – charts
- **expo-file-system + expo-sharing** – export

---

## 📦 Installation

### Prerequisites

- Node.js ≥ 18
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- Firebase project (see below)

### Steps

```bash
# 1. Clone / enter the project
cd app-money

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env
# → Fill in your Firebase credentials in src/services/firebase/config.js

# 4. Add Firebase native config files
#    Android: place google-services.json in project root
#    iOS:     place GoogleService-Info.plist in project root

# 5. Start development server
npx expo start

# 6. Run on device/emulator
npx expo start --android
npx expo start --ios
```

---

## 🔥 Firebase Setup

### 1. Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Email/Password
4. Create **Firestore Database** (production mode → add rules below)
5. Enable **Cloud Messaging** (for FCM push notifications)
6. Enable **Storage** (for receipt images)

### 2. Add Firebase Config

Edit `src/services/firebase/config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
```

### 3. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Transactions belong to authenticated owner
    match /transactions/{docId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // Budgets
    match /budgets/{docId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // Reminders
    match /reminders/{docId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // Custom categories
    match /categories/{docId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🗄 Firestore Database Schema

See `docs/firebase-schema.md` for full schema with all fields.

---

## 📁 Project Structure

```
app-money/
├── App.js                          # Entry point
├── app.json                        # Expo config
├── babel.config.js                 # Path aliases (@/...)
├── package.json
│
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.js           # Gradient button
│   │   │   ├── Input.js            # Styled input
│   │   │   ├── Card.js             # Glass/gradient cards
│   │   │   ├── Badge.js            # Status badges
│   │   │   ├── EmptyState.js       # Empty list state
│   │   │   └── LoadingSpinner.js   # Animated spinner
│   │   ├── transaction/
│   │   │   └── TransactionCard.js  # Transaction list item
│   │   ├── budget/
│   │   │   └── BudgetCard.js       # Budget with progress bar
│   │   └── charts/
│   │       └── MonthlyBarChart.js  # Income vs expense bars
│   │
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   └── PinScreen.js        # PIN + biometric
│   │   ├── main/
│   │   │   ├── HomeScreen.js       # Dashboard
│   │   │   ├── TransactionsScreen.js
│   │   │   ├── ReportsScreen.js    # Charts + export
│   │   │   ├── BudgetScreen.js
│   │   │   └── ProfileScreen.js    # Settings
│   │   ├── transaction/
│   │   │   ├── AddTransactionScreen.js
│   │   │   └── TransactionDetailScreen.js
│   │   ├── category/
│   │   │   └── CategoriesScreen.js
│   │   ├── reminder/
│   │   │   └── RemindersScreen.js
│   │   └── receipt/
│   │       └── ScanReceiptScreen.js
│   │
│   ├── navigation/
│   │   ├── AppNavigator.js         # Root (auth gate + PIN gate)
│   │   ├── AuthNavigator.js        # Login / Register stack
│   │   └── MainNavigator.js        # Bottom tabs + modal stack
│   │
│   ├── services/
│   │   └── firebase/
│   │       ├── config.js           # ← PUT YOUR CREDENTIALS HERE
│   │       ├── auth.js             # Login, register, PIN
│   │       ├── transactions.js     # CRUD + real-time
│   │       ├── budgets.js          # Budget CRUD
│   │       ├── categories.js       # Custom categories
│   │       ├── reminders.js        # Bill schedules
│   │       ├── notifications.js    # FCM + local notifications
│   │       └── users.js            # Profile updates
│   │   ├── ocr.js                  # Google Cloud Vision OCR
│   │   └── export.js               # CSV + HTML/PDF export
│   │
│   ├── store/
│   │   ├── index.js                # Redux store
│   │   ├── authSlice.js
│   │   ├── transactionSlice.js
│   │   ├── budgetSlice.js
│   │   ├── categorySlice.js
│   │   ├── reminderSlice.js
│   │   └── uiSlice.js
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useTransactions.js
│   │   ├── useBudgets.js
│   │   ├── useInsights.js
│   │   └── useBiometric.js
│   │
│   ├── constants/
│   │   ├── theme.js                # Colors, spacing, typography
│   │   └── categories.js           # Default categories
│   │
│   └── utils/
│       ├── formatters.js           # Currency, date, number
│       ├── calculations.js         # Balance, grouping, charts
│       └── validators.js           # Form validators
│
└── docs/
    └── firebase-schema.md
```

---

## 📱 Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

---

## 🔑 Required API Keys

| Service | Where to Get |
|---|---|
| Firebase Config | Firebase Console → Project Settings |
| Google Cloud Vision (OCR) | GCP Console → APIs & Services |
| Expo Project ID | expo.dev dashboard |

---

## 📝 License

MIT
