// ============================================================
// useCategorySync Hook
// ============================================================
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToCategories } from '@services/firebase/categories';
import { setCategories, setLoading } from '@store/categorySlice';
import { DEFAULT_CATEGORIES } from '@constants/categories';
import { selectUser } from '@store/authSlice';

export const useCategorySync = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!user?.uid) {
      dispatch(setCategories(DEFAULT_CATEGORIES));
      dispatch(setLoading(false));
      return undefined;
    }

    dispatch(setLoading(true));
    const unsubscribe = subscribeToCategories(user.uid, (categories) => {
      dispatch(setCategories(categories));
      dispatch(setLoading(false));
    });

    return () => {
      unsubscribe();
    };
  }, [dispatch, user?.uid]);
};

export default useCategorySync;
