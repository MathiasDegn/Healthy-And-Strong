import { Tabs } from 'expo-router';
import { Home, Dumbbell, CalendarDays, Users, User } from 'lucide-react-native';
import { colors, shadows } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.forest[950],
          borderTopColor: 'rgba(98, 200, 98, 0.15)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10,
          ...shadows.tabbar,
        },
        tabBarActiveTintColor: colors.accentBright,
        tabBarInactiveTintColor: colors.forest[400],
        tabBarLabelStyle: {
          fontFamily: 'Inter-Regular',
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color, focused }) => (
            <Home size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ size, color, focused }) => (
            <Dumbbell size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: 'Program',
          tabBarIcon: ({ size, color, focused }) => (
            <CalendarDays size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ size, color, focused }) => (
            <Users size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color, focused }) => (
            <User size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
          ),
        }}
      />
    </Tabs>
  );
}
