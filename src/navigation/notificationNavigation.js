import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

const TRANSACTION_ENTITY_TYPES = new Set(['transaction', 'household_transaction']);
const DEBT_ENTITY_TYPES = new Set(['debt']);
const NOTE_ENTITY_TYPES = new Set(['note', 'note_assignment']);

let pendingNotificationTarget = null;

const getEntityType = (payload = {}) =>
  payload?.entityType ||
  payload?.type ||
  payload?.data?.entityType ||
  payload?.data?.type ||
  payload?.metadata?.entityType ||
  payload?.metadata?.type ||
  null;

const getEntityId = (payload = {}) =>
  payload?.entityId ||
  payload?.data?.entityId ||
  payload?.metadata?.entityId ||
  null;

const getTransactionId = (payload = {}) =>
  payload?.transactionId ||
  payload?.data?.transactionId ||
  payload?.metadata?.transactionId ||
  null;

const getNoteId = (payload = {}) =>
  payload?.noteId ||
  payload?.data?.noteId ||
  payload?.metadata?.noteId ||
  null;

const getDebtId = (payload = {}) =>
  payload?.debtId ||
  payload?.linkedDebtId ||
  payload?.data?.debtId ||
  payload?.data?.linkedDebtId ||
  payload?.metadata?.debtId ||
  payload?.metadata?.linkedDebtId ||
  null;

export const getNotificationNavigationTarget = (payload = {}) => {
  const entityType = getEntityType(payload);
  const entityId = getEntityId(payload);
  const transactionId = getTransactionId(payload) || (TRANSACTION_ENTITY_TYPES.has(entityType) ? entityId : null);
  const noteId = getNoteId(payload) || (NOTE_ENTITY_TYPES.has(entityType) ? entityId : null);
  const debtId = getDebtId(payload) || (DEBT_ENTITY_TYPES.has(entityType) ? entityId : null);

  if (transactionId) {
    return {
      name: 'TransactionDetail',
      params: { transactionId },
    };
  }

  if (debtId) {
    return {
      name: 'DebtDetail',
      params: { debtId },
    };
  }

  if (noteId || NOTE_ENTITY_TYPES.has(entityType)) {
    return {
      name: 'Notes',
      params: noteId ? { focusNoteId: noteId } : undefined,
    };
  }

  return null;
};

export const navigateToNotificationTarget = (payload = {}) => {
  const target = getNotificationNavigationTarget(payload);

  if (!target) {
    return false;
  }

  if (navigationRef.isReady()) {
    navigationRef.navigate(target.name, target.params);
  } else {
    pendingNotificationTarget = target;
  }

  return true;
};

export const flushPendingNotificationNavigation = () => {
  if (!pendingNotificationTarget || !navigationRef.isReady()) {
    return false;
  }

  const target = pendingNotificationTarget;
  pendingNotificationTarget = null;
  navigationRef.navigate(target.name, target.params);
  return true;
};
