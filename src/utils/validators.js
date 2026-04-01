// ============================================================
// Utility: Validators
// ============================================================

export const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= 6;

export const isValidAmount = (value) => {
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return !isNaN(n) && n > 0;
};

export const isValidPin = (pin) =>
  typeof pin === 'string' && /^\d{6}$/.test(pin);

export const isValidDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

// ─── Form Validators ─────────────────────────────────────────

export const validateLoginForm = ({ email, password }) => {
  const errors = {};
  if (!email?.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Invalid email address';
  if (!password) errors.password = 'Password is required';
  else if (!isValidPassword(password)) errors.password = 'Minimum 6 characters';
  return errors;
};

export const validateRegisterForm = ({ displayName, email, password, confirmPassword }) => {
  const errors = {};
  if (!displayName?.trim()) errors.displayName = 'Name is required';
  if (!email?.trim()) errors.email = 'Email is required';
  else if (!isValidEmail(email)) errors.email = 'Invalid email';
  if (!password) errors.password = 'Password is required';
  else if (!isValidPassword(password)) errors.password = 'Minimum 6 characters';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

export const validateTransactionForm = ({ amount, categoryId, date }) => {
  const errors = {};
  if (!isValidAmount(amount)) errors.amount = 'Enter a valid amount greater than 0';
  if (!categoryId) errors.category = 'Please select a category';
  if (!isValidDate(date)) errors.date = 'Invalid date';
  return errors;
};

export const validateBudgetForm = ({ categoryId, amount }) => {
  const errors = {};
  if (!categoryId) errors.category = 'Please select a category';
  if (!isValidAmount(amount)) errors.amount = 'Enter a valid budget amount';
  return errors;
};

export const validateReminderForm = ({ name, amount, dueDate }) => {
  const errors = {};
  if (!name?.trim()) errors.name = 'Bill name is required';
  if (!isValidAmount(amount)) errors.amount = 'Enter a valid amount';
  if (!isValidDate(dueDate)) errors.dueDate = 'Invalid due date';
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;
