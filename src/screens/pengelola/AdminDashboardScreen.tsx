/* === ANGGOTA 3: DAWWAS (PENGELOLA) — SCREEN 5: DASHBOARD PENGELOLA ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini. */
import React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { View, Text, Pressable, FlatList, StatusBar, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { AdminTabParamList } from '../RootNavigator';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = BottomTabScreenProps<AdminTabParamList, 'Dashboard'>;
type Tone = 'ok' | 'wn';
type Tagihan = { id: string; nama: string; kamar: string; tempo: string; nominal: string; status: 'Menunggu' | 'Lunas' };

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', okb: '#DCFCE7', wn: '#B45309', wnb: '#FEF3C7', er: '#DC2626',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD_PRIMARY = ['#1E293B', '#2563EB'] as const;
const SHADOW_CARD = { shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };

/* ============ DATA DUMMY ============ */
const DUE: Tagihan[] = [
  { id: 'd1', nama: 'Siti Nurhaliza', kamar: 'B-07', tempo: '20 Okt', nominal: 'Rp 1.300.000', status: 'Menunggu' },
  { id: 'd2', nama: 'Andi Pratama', kamar: 'A-03', tempo: '25 Okt', nominal: 'Rp 1.200.000', status: 'Lunas' },
  { id: 'd3', nama: 'Maya Putri', kamar: 'C-09', tempo: '27 Okt', nominal: 'Rp 1.100.000', status: 'Menunggu' },
  { id: 'd4', nama: 'Dewi Lestari', kamar: 'C-02', tempo: '28 Okt', nominal: 'Rp 350.000', status: 'Lunas' },
];

// jumlah tiket keluhan yang belum selesai (sama dengan papan keluhan pada KeluhanAdminScreen)
const KELUHAN_AKTIF = 5;

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

const TONES: Record<Tone, { bg: string; fg: string }> = { ok: { bg: C.okb, fg: C.ok }, wn: { bg: C.wnb, fg: C.wn } };

function Badge({ text, tone = 'ok' }: { text: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: t.fg }]} />
      <Txt style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{text}</Txt>
    </View>
  );
}

function GhostButton({ title, icon, onPress }: { title: string; icon: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.ghost, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon} size={14} color={C.acc} style={{ marginRight: 6 }} />
      <Txt style={{ color: C.acc, fontSize: 12, fontWeight: '600' }}>{title}</Txt>
    </Pressable>
  );
}

function CustomCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// kartu KPI dengan garis gradien 4px di atas
function Kpi({ width, accent, children }: {
  width: number;
  accent: ComponentProps<typeof LinearGradient>['colors'];
  children: ReactNode;
}) {
  return (
    <CustomCard style={[s.kpi, { width }]}>
      <LinearGradient colors={accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.kpiBar} />
      {children}
    </CustomCard>
  );
}

function CardHead({ children }: { children: ReactNode }) {
  return <View style={s.cardHead}>{children}</View>;
}
function CardRow({ isLast, children }: { isLast: boolean; children: ReactNode }) {
  return (
    <View style={[s.rowOuter, isLast && s.rowLast]}>
      <View style={[s.rowInner, !isLast && s.rowSep]}>{children}</View>
    </View>
  );
}

/* ============ SCREEN 5: DASHBOARD PENGELOLA ============ */
export default function AdminDashboardScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const kpiW = (width - 36 - 14) / 2; // 2 kolom, gap 14

  // keluar -> kembali ke Landing (stack induk di-reset)
  const keluar = () => navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Landing' }] });

  const header = (
    <View>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Txt style={s.h1}>Dashboard Pengelola</Txt>
          <Txt style={s.sub}>Oktober 2026 · Kos Bima Putra, Jl. Perjuangan No. 72</Txt>
          <Txt style={[s.sub, { marginTop: 2 }]}>Pengelola · Ibu Peni Azzam</Txt>
        </View>
        <GhostButton title="Keluar" icon="log-out-outline" onPress={keluar} />
      </View>

      <View style={s.kpis}>
        <Kpi width={kpiW} accent={GRAD_PRIMARY}>
          <Txt style={s.kLabel}>Status Kamar</Txt>
          <Txt style={s.kValue} numberOfLines={1} adjustsFontSizeToFit>29 / 35</Txt>
          <View style={s.bar}>
            <View style={[s.barFill, { width: '83%' }]} />
          </View>
          <Txt style={[s.kLabel, { marginTop: 6 }]}>29 terisi · 6 kosong</Txt>
        </Kpi>

        <Kpi width={kpiW} accent={['#16A34A', '#4ADE80']}>
          <Txt style={s.kLabel}>Pemasukan Bulan Ini</Txt>
          <Txt style={s.kValue} numberOfLines={1} adjustsFontSizeToFit>Rp 41,75 jt</Txt>
          <Txt style={[s.kLabel, { color: C.ok }]}>▲ 8% dari bulan lalu</Txt>
        </Kpi>

        <Kpi width={kpiW} accent={['#DC2626', '#FB923C']}>
          <Txt style={s.kLabel}>Tagihan Menunggak</Txt>
          <Txt style={[s.kValue, { color: C.er }]}>3</Txt>
          <Txt style={s.kLabel}>Total Rp 3.600.000</Txt>
        </Kpi>

        <Kpi width={kpiW} accent={['#B45309', '#FBBF24']}>
          <Txt style={s.kLabel}>Keluhan Aktif</Txt>
          <Txt style={s.kValue}>{KELUHAN_AKTIF}</Txt>
          <Pressable onPress={() => navigation.navigate('Keluhan')} hitSlop={6}>
            <Txt style={[s.kLabel, { color: C.acc }]}>Lihat papan keluhan →</Txt>
          </Pressable>
        </Kpi>
      </View>

      <CardHead>
        <Txt style={{ fontSize: 16, fontWeight: '700', marginBottom: 2 }}>Jatuh Tempo Terdekat</Txt>
      </CardHead>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <FlatList
        data={DUE}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <CardRow isLast={index === DUE.length - 1}>
            <View style={s.dueRow}>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: '600' }}>{item.nama}</Txt>
                <Txt style={s.sub}>Kamar {item.kamar} · Jatuh tempo {item.tempo}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Txt style={{ fontWeight: '700', fontSize: 13 }}>{item.nominal}</Txt>
                <Badge text={item.status} tone={item.status === 'Lunas' ? 'ok' : 'wn'} />
              </View>
            </View>
          </CardRow>
        )}
      />
    </SafeAreaView>
  );
}

/* ============ STYLE ============ */
const s = StyleSheet.create({
  /* komponen */
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 99 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  ghost: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: C.acc, borderRadius: 9,
  },
  card: { backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 16, ...SHADOW_CARD },
  cardHead: {
    backgroundColor: C.surf, borderWidth: 1, borderBottomWidth: 0, borderColor: C.bd,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  rowOuter: { backgroundColor: C.surf, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.bd, paddingHorizontal: 16 },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingBottom: 6 },
  rowInner: { paddingVertical: 10 },
  rowSep: { borderBottomWidth: 1, borderBottomColor: C.bd },

  /* layar */
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  sub: { color: C.mut, fontSize: 12, marginTop: 2 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 20 },
  kpi: { overflow: 'hidden', paddingTop: 20 },
  kpiBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  kLabel: { color: C.mut, fontSize: 12 },
  kValue: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginVertical: 4 },
  bar: { height: 8, borderRadius: 9, backgroundColor: C.bd, overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', backgroundColor: C.acc },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
