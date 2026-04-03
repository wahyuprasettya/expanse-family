// ============================================================
// useLegacyCleanup Hook
// ============================================================
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { deleteLegacyChatMessages } from '@services/firebase/legacyCleanup';

export const useLegacyCleanup = () => {
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const accountId = profile?.householdId || user?.uid;
  const cleanedAccountsRef = useRef(new Set());

  useEffect(() => {
    if (!accountId || cleanedAccountsRef.current.has(accountId)) return;

    cleanedAccountsRef.current.add(accountId);

    deleteLegacyChatMessages(accountId)
      .then(({ count, error }) => {
        if (error) {
          console.warn('[useLegacyCleanup] chat-cleanup:error', { accountId, error });
          return;
        }

      })
      .catch((error) => {
        console.warn('[useLegacyCleanup] chat-cleanup:unexpected', {
          accountId,
          error: error?.message || String(error),
        });
      });
  }, [accountId]);
};

export default useLegacyCleanup;
