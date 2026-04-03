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

    const unsubscribe = subscribeToCategories(user.uid, (categories) => {
      dispatch(setCategories(categories));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, user?.uid]);
};

export default useCategorySync;
