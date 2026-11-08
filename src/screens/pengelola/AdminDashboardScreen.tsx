/* === ANGGOTA 3: DAWWAS (PENGELOLA) — SCREEN 5: DASHBOARD PENGELOLA ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini. */
import React, { useCallback, useEffect, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { View, Text, Pressable, FlatList, StatusBar, StyleSheet, useWindowDimensions } from 'react-native';
import type { StyleProp, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { AdminTabParamList } from '../RootNavigator';
import { supabase, rupiah, BULAN, keluar, ambilProfil, profilSaatIni } from '../../lib/supabase';

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

  const [due, setDue] = useState<Tagihan[]>([]);
  const [kpi, setKpi] = useState({ terisi: 0, total: 0, masuk: 0, masukLalu: 0, tunggak: 0, nilaiTunggak: 0, keluhan: 0 });
  const [profil, setProfil] = useState(profilSaatIni());
  const sekarang = new Date();
  const bln = sekarang.getMonth() + 1;
  const thn = sekarang.getFullYear();
  const blnLalu = bln === 1 ? 12 : bln - 1;
  const thnLalu = bln === 1 ? thn - 1 : thn;

  const muat = useCallback(async () => {
    const [km, pg, pb, kl, pr] = await Promise.all([
      supabase.from('kamar').select('nomor_kamar,status_kamar,harga_sewa'),
      supabase.from('penghuni').select('id,nama,nomor_kamar').eq('status_penghuni', 'Aktif').order('nomor_kamar'),
      supabase.from('pembayaran').select('penghuni_id,jumlah_bayar,bulan_tagihan,tahun_tagihan,status_pembayaran').eq('status_pembayaran', 'Lunas'),
      supabase.from('keluhan').select('id').neq('status_penanganan', 'Selesai'),
      profil ? Promise.resolve(profil) : ambilProfil(),
    ]);
    if (km.error || pg.error || pb.error || kl.error) return;
    setProfil(pr as any);
    const harga: Record<string, number> = Object.fromEntries((km.data ?? []).map((k) => [k.nomor_kamar, Number(k.harga_sewa)]));
    const lunasIni = new Set((pb.data ?? []).filter((p) => p.bulan_tagihan === bln && p.tahun_tagihan === thn).map((p) => p.penghuni_id));
    const jml = (b: number, y: number) => (pb.data ?? []).filter((p) => p.bulan_tagihan === b && p.tahun_tagihan === y).reduce((s, p) => s + Number(p.jumlah_bayar), 0);
    const belum = (pg.data ?? []).filter((r) => !lunasIni.has(r.id));
    setKpi({
      terisi: (km.data ?? []).filter((k) => k.status_kamar === 'Terisi').length, total: (km.data ?? []).length,
      masuk: jml(bln, thn), masukLalu: jml(blnLalu, thnLalu),
      tunggak: belum.length, nilaiTunggak: belum.reduce((s, r) => s + (harga[r.nomor_kamar] || 0), 0),
      keluhan: (kl.data ?? []).length,
    });
    setDue((pg.data ?? []).map((r) => ({
      id: r.id, nama: r.nama, kamar: r.nomor_kamar, tempo: `${BULAN[bln - 1]} ${thn}`,
      nominal: rupiah(harga[r.nomor_kamar] || 0), status: lunasIni.has(r.id) ? 'Lunas' : 'Menunggu',
    } as Tagihan)).sort((a, b) => (a.status === b.status ? 0 : a.status === 'Menunggu' ? -1 : 1)));
  }, [bln, thn, blnLalu, thnLalu, profil]);
  useEffect(() => { muat(); }, [muat]);

  const DUE = due;
  const pemilik = profil?.role === 'pemilik';
  const persen = kpi.total ? Math.round((kpi.terisi / kpi.total) * 100) : 0;
  const selisih = kpi.masukLalu ? Math.round(((kpi.masuk - kpi.masukLalu) / kpi.masukLalu) * 100) : null;
  const juta = (n: number) => 'Rp ' + (n / 1_000_000).toFixed(2).replace('.', ',') + ' jt';

  // keluar -> hapus sesi Supabase, kembali ke Landing
  const doKeluar = async () => {
    await keluar();
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  const header = (
    <View>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Txt style={s.h1}>{pemilik ? 'Dashboard Pemilik' : 'Dashboard Pengelola'}</Txt>
          <Txt style={s.sub}>{BULAN[bln - 1]} {thn} · Kos Bima Putra, Jl. Perjuangan No. 72</Txt>
          <Txt style={[s.sub, { marginTop: 2 }]}>{pemilik ? 'Pemilik' : 'Pengelola'} · {profil?.nama ?? ''}</Txt>
        </View>
        <GhostButton title="Keluar" icon="log-out-outline" onPress={doKeluar} />
      </View>

      <View style={s.kpis}>
        <Kpi width={kpiW} accent={GRAD_PRIMARY}>
          <Txt style={s.kLabel}>Status Kamar</Txt>
          <Txt style={s.kValue} numberOfLines={1} adjustsFontSizeToFit>{kpi.terisi} / {kpi.total}</Txt>
          <View style={s.bar}>
            <View style={[s.barFill, { width: `${persen}%` }]} />
          </View>
          <Txt style={[s.kLabel, { marginTop: 6 }]}>{kpi.terisi} terisi · {kpi.total - kpi.terisi} tidak terisi</Txt>
        </Kpi>

        <Kpi width={kpiW} accent={['#16A34A', '#4ADE80']}>
          <Txt style={s.kLabel}>Pemasukan Bulan Ini</Txt>
          <Txt style={s.kValue} numberOfLines={1} adjustsFontSizeToFit>{juta(kpi.masuk)}</Txt>
          <Txt style={[s.kLabel, { color: selisih !== null && selisih < 0 ? C.er : C.ok }]}>{selisih === null ? 'Belum ada data bulan lalu' : `${selisih >= 0 ? '▲' : '▼'} ${Math.abs(selisih)}% dari bulan lalu`}</Txt>
        </Kpi>

        <Kpi width={kpiW} accent={['#DC2626', '#FB923C']}>
          <Txt style={s.kLabel}>Tagihan Menunggak</Txt>
          <Txt style={[s.kValue, { color: C.er }]}>{kpi.tunggak}</Txt>
          <Txt style={s.kLabel}>Total {rupiah(kpi.nilaiTunggak)}</Txt>
        </Kpi>

        <Kpi width={kpiW} accent={['#B45309', '#FBBF24']}>
          <Txt style={s.kLabel}>Keluhan Aktif</Txt>
          <Txt style={s.kValue}>{kpi.keluhan}</Txt>
          <Pressable onPress={() => navigation.navigate('Keluhan')} hitSlop={6}>
            <Txt style={[s.kLabel, { color: C.acc }]}>Lihat papan keluhan →</Txt>
          </Pressable>
        </Kpi>
      </View>

      <CardHead>
        <Txt style={{ fontSize: 16, fontWeight: '700', marginBottom: 2 }}>Status Tagihan Bulan Ini</Txt>
      </CardHead>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
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
                <Txt style={s.sub}>Kamar {item.kamar} · {item.tempo}</Txt>
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
