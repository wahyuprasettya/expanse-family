// ============================================================
// Default Transaction Categories
// ============================================================

export const DEFAULT_CATEGORIES = [
  // ── Expense Categories ───────────────────────────────────
  { id: 'food', name: 'Food & Drink', icon: '🍔', color: '#F97316', type: 'expense', isDefault: true },
  { id: 'transportation', name: 'Transportation', icon: '🚗', color: '#3B82F6', type: 'expense', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', icon: '🧾', color: '#EF4444', type: 'expense', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#8B5CF6', type: 'expense', isDefault: true },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899', type: 'expense', isDefault: true },
  { id: 'health', name: 'Health & Medical', icon: '💊', color: '#10B981', type: 'expense', isDefault: true },
  { id: 'education', name: 'Education', icon: '📚', color: '#06B6D4', type: 'expense', isDefault: true },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#F59E0B', type: 'expense', isDefault: true },
  { id: 'housing', name: 'Housing & Rent', icon: '🏠', color: '#6366F1', type: 'expense', isDefault: true },
  { id: 'clothing', name: 'Clothing', icon: '👕', color: '#14B8A6', type: 'expense', isDefault: true },
  { id: 'personal_care', name: 'Personal Care', icon: '💆', color: '#A78BFA', type: 'expense', isDefault: true },
  { id: 'gifts', name: 'Gifts & Donations', icon: '🎁', color: '#F43F5E', type: 'expense', isDefault: true },

  // ── Income Categories ────────────────────────────────────
  { id: 'salary', name: 'Salary', icon: '💼', color: '#10B981', type: 'income', isDefault: true },
  { id: 'freelance', name: 'Freelance', icon: '💻', color: '#6366F1', type: 'income', isDefault: true },
  { id: 'investment', name: 'Investment', icon: '📈', color: '#F59E0B', type: 'income', isDefault: true },
  { id: 'business', name: 'Business', icon: '🏢', color: '#3B82F6', type: 'income', isDefault: true },
  { id: 'rental', name: 'Rental Income', icon: '🏘️', color: '#8B5CF6', type: 'income', isDefault: true },
  { id: 'bonus', name: 'Bonus', icon: '🎉', color: '#EC4899', type: 'income', isDefault: true },
  { id: 'other_income', name: 'Other Income', icon: '💰', color: '#14B8A6', type: 'income', isDefault: true },

  // ── Both ─────────────────────────────────────────────────
  { id: 'other', name: 'Other', icon: '📦', color: '#64748B', type: 'both', isDefault: true },
];

export const getCategoryById = (id) =>
  DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];

export const getCategoriesByType = (type) =>
  DEFAULT_CATEGORIES.filter((c) => c.type === type || c.type === 'both');
