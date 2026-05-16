import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../../constants';
import { tabBarBottomPadding, tabBarHeight } from '../../constants/layout';

// Tab bar measurements come from useSafeAreaInsets, NOT a Platform.OS branch.
// Hardcoded paddingBottom (e.g. 24 iOS / 8 Android) made tab targets land
// under the Android gesture bar on modern devices, where insets.bottom can
// be 16–32dp. Using the insets means the bar always rests above the system
// area and the icons stay tappable.
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.muted55,
        tabBarStyle: {
          backgroundColor: COLORS.bg,
          borderTopColor: COLORS.border10,
          borderTopWidth: 1,
          height: tabBarHeight(insets),
          paddingTop: 6,
          paddingBottom: tabBarBottomPadding(insets),
        },
        tabBarLabelStyle: {
          fontFamily: TYPOGRAPHY.fontFamilyMedium,
          fontSize: 11,
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="coming-soon"
        options={{
          title: 'Coming Soon',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Vices',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
