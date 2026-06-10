import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VICE_CATEGORIES } from '../../constants/vices';
import { COLORS } from '../../constants';
import { useAppStore } from '../../store';
import type { ViceId } from '../../types';

export default function ViceDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const selectVice = useAppStore((s) => s.selectVice);

  useEffect(() => {
    const vice = VICE_CATEGORIES.find((v) => v.id === (id as ViceId));
    if (vice) {
      // Mirror the in-app flow: selectVice → loading orchestrates location
      // fetch + nearby search → navigates to /compass with targetPlace set.
      selectVice(vice);
      router.replace('/loading');
    } else {
      router.replace('/(tabs)');
    }
  }, [id, router, selectVice]);

  return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
}
