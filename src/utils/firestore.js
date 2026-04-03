// ============================================================
// Firestore Serialization Helpers
// ============================================================

export const isFirestoreTimestamp = (value) =>
  value &&
  typeof value === 'object' &&
  (
    typeof value.toDate === 'function' ||
    (typeof value.seconds === 'number' && typeof value.nanoseconds === 'number')
  );

export const serializeFirestoreValue = (value) => {
  if (value == null) {
    return value;
  }

  if (isFirestoreTimestamp(value)) {
    const date = typeof value.toDate === 'function'
      ? value.toDate()
      : new Date((value.seconds * 1000) + Math.floor(value.nanoseconds / 1000000));

    return date.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serializeFirestoreValue(nestedValue)])
    );
  }

  return value;
};
