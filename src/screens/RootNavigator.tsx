import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { ComponentProps } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import LandingScreen from './LandingScreen';
import LoginScreen from './LoginScreen';
import PenghuniHomeScreen, { PengumumanScreen } from './penghuni/PenghuniHomeScreen';
import type { Keluhan } from './penghuni/PenghuniHomeScreen';
import LaporKeluhanScreen from './penghuni/LaporKeluhanScreen';
import AdminDashboardScreen from './pengelola/AdminDashboardScreen';
import DataPenghuniScreen from './pengelola/DataPenghuniScreen';
import PembayaranScreen from './pengelola/PembayaranScreen';
import KeluhanAdminScreen from './pengelola/KeluhanAdminScreen';
import { ambilProfil, keluar, supabase, TARGET } from '../lib/supabase';

/* ============ TIPE NAVIGASI (dipakai semua layar lewat `import type`) ============ */
export type PenghuniTabParamList = {
  Beranda: { keluhanBaru?: Keluhan } | undefined;
  Lapor: undefined;
  Info: undefined;
  Keluar: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Penghuni: undefined;
  Pembayaran: undefined;
  Keluhan: undefined;
};

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  PemilikTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  PenghuniTabs: NavigatorScreenParams<PenghuniTabParamList> | undefined;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

const ACC = '#2563EB';
const MUT = '#64748B';

const Stack = createNativeStackNavigator<RootStackParamList>();
const PenghuniTab = createBottomTabNavigator<PenghuniTabParamList>();
const AdminTab = createBottomTabNavigator<AdminTabParamList>();

const ICONS: Record<string, (focused: boolean) => IconName> = {
  Beranda: (f) => (f ? 'home' : 'home-outline'),
  Lapor: (f) => (f ? 'create' : 'create-outline'),
  Info: (f) => (f ? 'megaphone' : 'megaphone-outline'),
  Keluar: () => 'log-out-outline',
  Dashboard: (f) => (f ? 'stats-chart' : 'stats-chart-outline'),
  Penghuni: (f) => (f ? 'people' : 'people-outline'),
  Pembayaran: (f) => (f ? 'wallet' : 'wallet-outline'),
  Keluhan: (f) => (f ? 'construct' : 'construct-outline'),
};

const tabScreenOptions = ({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
  headerShown: false,
  tabBarActiveTintColor: ACC,
  tabBarInactiveTintColor: MUT,
  tabBarLabelStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E8F0', borderTopWidth: 1 },
  tabBarIcon: ({ focused, color }) => <Ionicons name={ICONS[route.name](focused)} size={22} color={color} />,
});

const Kosong = () => null;

/* Area Penghuni: Beranda · Lapor · Info · Keluar */
function PenghuniTabs() {
  return (
    <PenghuniTab.Navigator screenOptions={tabScreenOptions}>
      <PenghuniTab.Screen name="Beranda" component={PenghuniHomeScreen} />
      <PenghuniTab.Screen name="Lapor" component={LaporKeluhanScreen} />
      <PenghuniTab.Screen name="Info" component={PengumumanScreen} />
      <PenghuniTab.Screen
        name="Keluar"
        component={Kosong}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // bukan layar, hanya aksi logout
            keluar().finally(() => navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Landing' }] }));
          },
        })}
      />
    </PenghuniTab.Navigator>
  );
}

/* Area Pengelola: Dashboard · Penghuni · Pembayaran · Keluhan */
function AdminTabs() {
  return (
    <AdminTab.Navigator screenOptions={tabScreenOptions}>
      <AdminTab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <AdminTab.Screen name="Penghuni" component={DataPenghuniScreen} />
      <AdminTab.Screen name="Pembayaran" component={PembayaranScreen} />
      <AdminTab.Screen name="Keluhan" component={KeluhanAdminScreen} />
    </AdminTab.Navigator>
  );
}

export default function RootNavigator() {
  // pulihkan sesi tersimpan; arahkan sesuai role dari database
  const [awal, setAwal] = useState<keyof RootStackParamList | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const profil = data.session ? await ambilProfil() : null;
        setAwal(profil ? TARGET[profil.role] : 'Landing');
      } catch {
        setAwal('Landing');
      }
    })();
  }, []);

  if (!awal) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={ACC} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={awal} screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="PemilikTabs" component={AdminTabs} />
      <Stack.Screen name="PenghuniTabs" component={PenghuniTabs} />
    </Stack.Navigator>
  );
}
