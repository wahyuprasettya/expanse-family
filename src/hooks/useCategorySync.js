// ============================================================
// useCategorySync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToCategories } from '@services/firebase/categories';
import { setCategories } from '@store/categorySlice';
import { selectUser } from '@store/authSlice';

export const useCategorySync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.uid) return undefined;

    console.log('[useCategorySync] subscribe:start', { userId: user.uid });
    const unsubscribe = subscribeToCategories(user.uid, (categories) => {
      console.log('[useCategorySync] subscribe:update', {
        userId: user.uid,
        count: categories.length,
      });
      dispatch(setCategories(categories));
    });

    return () => {
      console.log('[useCategorySync] subscribe:stop', { userId: user.uid });
      unsubscribe();
    };
  }, [dispatch, user?.uid]);
};

export default useCategorySync;
