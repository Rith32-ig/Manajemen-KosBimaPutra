/* === ANGGOTA 1: FARID — SCREEN 1: LANDING PAGE ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini. */
import React, { useEffect, useRef } from 'react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import {
  View, Text, Image, Pressable, FlatList, Animated, StyleSheet, StatusBar, useWindowDimensions,
} from 'react-native';
import type { ImageSourcePropType, StyleProp, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, Role } from './RootNavigator';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;
type Fitur = { id: string; icon: IconName; judul: string; teks: string };
type Foto = { id: string; src: ImageSourcePropType; cap: string };
type ButtonType = 'primary' | 'ghost' | 'light' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', er: '#DC2626', accb: '#DBEAFE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD = { primary: ['#1E293B', '#2563EB'], wa: ['#16A34A', '#22C55E'], report: ['#EF4444', '#F97316'] } as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };
const SHADOW_CARD = { shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };

/* ============ DATA DUMMY ============ */
const IMG_DEPAN: ImageSourcePropType = require('../../assets/img/depan.jpg');
const IMG_HALAMAN: ImageSourcePropType = require('../../assets/img/halaman.jpg');
const IMG_CCTV: ImageSourcePropType = require('../../assets/img/cctv.jpg');

const GALERI: Foto[] = [
  { id: 'g1', src: IMG_DEPAN, cap: 'Bagian depan kos' },
  { id: 'g2', src: IMG_HALAMAN, cap: 'Halaman kos' },
  { id: 'g3', src: IMG_CCTV, cap: 'Fasilitas CCTV' },
];

const FEATURES: Fitur[] = [
  { id: 'f1', icon: 'videocam', judul: 'CCTV', teks: 'Memantau kondisi dan aktivitas keluar-masuk di lingkungan kos.' },
  { id: 'f2', icon: 'lock-closed', judul: 'Gerbang Terkontrol', teks: 'Gerbang dikunci pukul 22.00. Pulang malam cukup konfirmasi ke pengelola.' },
  { id: 'f3', icon: 'wifi', judul: 'Wi-Fi', teks: 'Jaringan internet untuk kuliah dan bekerja, dengan pengumuman bila ada gangguan.' },
  { id: 'f4', icon: 'construct', judul: 'Respons Keluhan Cepat', teks: 'Pengelola mendatangi kamar dan memanggil tukang sampai masalah tuntas.' },
  { id: 'f5', icon: 'chatbubbles', judul: 'Grup WhatsApp', teks: 'Pengumuman listrik, air, dan informasi operasional langsung ke penghuni.' },
  { id: 'f6', icon: 'search', judul: 'Pemeriksaan Mingguan', teks: 'Kondisi kos dan fasilitas dipantau rutin setiap minggu.' },
];

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

// teks bersarang di dalam <Txt>
function Span({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[fontWeight ? { fontFamily: FAMILY[String(fontWeight)] } : null, rest]} />;
}

function Badge({ text, dot = true }: { text: string; dot?: boolean }) {
  return (
    <View style={s.badge}>
      {dot ? <View style={s.badgeDot} /> : null}
      <Txt style={{ color: C.acc, fontSize: 12, fontWeight: '600' }}>{text}</Txt>
    </View>
  );
}

const BTN = {
  sm: { v: 5, h: 10, fs: 12, r: 9, ic: 14 },
  md: { v: 10, h: 16, fs: 14, r: 9, ic: 16 },
  lg: { v: 13, h: 24, fs: 15, r: 12, ic: 18 },
};
const BTN_TEXT = { primary: '#FFFFFF', ghost: C.acc, light: C.navy, glass: '#FFFFFF' };

function CustomButton({ title, onPress, type = 'primary', icon, size = 'md', style }: {
  title: string;
  onPress: () => void;
  type?: ButtonType;
  icon?: IconName;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
}) {
  const z = BTN[size];
  const color = BTN_TEXT[type];
  const content = (
    <View style={[s.btnRow, { paddingVertical: z.v, paddingHorizontal: z.h }]}>
      {icon ? <Ionicons name={icon} size={z.ic} color={color} style={{ marginRight: 6 }} /> : null}
      <Txt style={{ color, fontSize: z.fs, fontWeight: '600', flexShrink: 1 }}>{title}</Txt>
    </View>
  );
  let body: ReactElement;
  if (type === 'primary') {
    body = (
      <LinearGradient colors={GRAD.primary} start={G_START} end={G_END} style={{ borderRadius: z.r }}>
        {content}
      </LinearGradient>
    );
  } else {
    const extra =
      type === 'ghost'
        ? { borderWidth: 1, borderColor: C.acc }
        : type === 'light'
        ? { backgroundColor: '#FFFFFF' }
        : { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' };
    body = <View style={[{ borderRadius: z.r }, extra]}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ borderRadius: z.r, alignSelf: 'flex-start' }, pressed && { opacity: 0.85 }, style]}
    >
      {body}
    </Pressable>
  );
}

function CustomCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/* efek melayang (@keyframes flt) */
function useFloat(duration: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: -8, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: duration / 2, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v;
}

/* ============ SCREEN ============ */
export default function LandingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const floatPhoto = useFloat(6000);
  const floatChip = useFloat(5000);
  const galW = (width - 48 - 14) / 2;

  const toLogin = (role: Role) => navigation.navigate('Login', { role });

  const header = (
    <View style={s.wrap}>
      <View style={s.hero}>
        <Badge text="Berdiri sejak 2000 · 35 kamar" dot={false} />
        <Txt style={s.h1}>
          Kos nyaman, aman, dan <Span style={{ color: C.acc }}>dikelola dengan rapi</Span>
        </Txt>
        <Txt style={s.lead}>
          Hunian dua lantai di Jalan Perjuangan No. 72 dengan pengawasan CCTV, pengelola yang sigap menangani
          keluhan, dan informasi yang selalu sampai ke penghuni.
        </Txt>

        <View style={s.hbtns}>
          <CustomButton title="Masuk sebagai Penghuni" icon="log-in-outline" size="lg" onPress={() => toLogin('Penghuni')} />
          <CustomButton title="Masuk sebagai Pengelola" icon="shield-checkmark-outline" type="ghost" size="lg" onPress={() => toLogin('Pengelola')} />
        </View>

        <View style={s.stats}>
          {[['35', 'Kamar'], ['25+', 'Tahun beroperasi'], ['24 jam', 'Pantauan CCTV']].map(([b, t]) => (
            <View key={t}>
              <Txt style={s.statB}>{b}</Txt>
              <Txt style={s.statS}>{t}</Txt>
            </View>
          ))}
        </View>

        <View style={s.hphoto}>
          <LinearGradient colors={GRAD.primary} start={G_START} end={G_END} style={s.photoBack} />
          <Animated.View style={{ transform: [{ translateY: floatPhoto }] }}>
            <Image source={IMG_DEPAN} style={s.photo} resizeMode="cover" accessibilityLabel="Bagian depan Kos Bima Putra" />
          </Animated.View>
          <Animated.View style={[s.chip, { left: -8, top: 30, transform: [{ translateY: floatChip }] }]}>
            <Ionicons name="location" size={14} color={C.er} />
            <Txt style={s.chipTxt}>Jl. Perjuangan No. 72</Txt>
          </Animated.View>
          <Animated.View style={[s.chip, { right: -6, bottom: 34, transform: [{ translateY: floatChip }] }]}>
            <Ionicons name="lock-closed" size={14} color={C.navy} />
            <Txt style={s.chipTxt}>Gerbang dikunci 22.00</Txt>
          </Animated.View>
        </View>
      </View>

      <View style={s.sec}>
        <Txt style={s.secH}>Fasilitas &amp; Layanan</Txt>
        <Txt style={s.secP}>Hal-hal yang membuat penghuni betah tinggal di Kos Bima Putra.</Txt>
      </View>
    </View>
  );

  const footer = (
    <View style={s.wrap}>
      <View style={[s.sec, { paddingBottom: 0 }]}>
        <Txt style={s.secH}>Galeri</Txt>
        <Txt style={s.secP}>Suasana Kos Bima Putra.</Txt>
        <View style={s.gal}>
          {GALERI.map((g) => (
            <View key={g.id} style={{ width: galW }}>
              <Image source={g.src} style={[s.galImg, { width: galW, height: (galW * 4) / 3 }]} resizeMode="cover" />
              <Txt style={s.cap}>{g.cap}</Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={[s.sec, { paddingBottom: 0 }]}>
        <LinearGradient colors={GRAD.primary} start={G_START} end={G_END} style={s.cta}>
          <Txt style={s.ctaH}>Kelola kos lebih mudah</Txt>
          <Txt style={s.ctaP}>
            Pengelola dan penghuni dapat mengakses pembayaran, kuitansi digital, dan laporan keluhan dalam satu sistem.
          </Txt>
          <View style={s.ctaBtns}>
            <CustomButton title="Masuk Penghuni" type="glass" size="lg" onPress={() => toLogin('Penghuni')} />
            <CustomButton title="Masuk Pengelola" type="light" size="lg" onPress={() => toLogin('Pengelola')} />
          </View>
        </LinearGradient>
      </View>

      <View style={s.lfoot}>
        <Txt style={s.lfootTxt}>Kos Bima Putra · Jl. Perjuangan No. 72 · Pengelola: Ibu Peni Azzam</Txt>
        <Txt style={s.lfootTxt}>Prototype UI · Analisis dan Perancangan Sistem</Txt>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* navbar atas */}
      <View style={s.nav}>
        <View style={s.brandRow}>
          <Ionicons name="home" size={18} color={C.navy} />
          <Txt style={s.brand}>Kos Bima Putra</Txt>
        </View>
        <CustomButton title="Penghuni" icon="log-in-outline" type="ghost" size="sm" onPress={() => toLogin('Penghuni')} />
        <CustomButton title="Pengelola" icon="log-in-outline" size="sm" onPress={() => toLogin('Pengelola')} style={{ marginLeft: 8 }} />
      </View>

      {/* Fasilitas = FlatList; hero di header, galeri/CTA di footer */}
      <FlatList
        data={FEATURES}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.wrap}>
            <CustomCard>
              <View style={s.fIcon}>
                <Ionicons name={item.icon} size={24} color={C.acc} />
              </View>
              <Txt style={s.fH}>{item.judul}</Txt>
              <Txt style={s.fP}>{item.teks}</Txt>
            </CustomCard>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

/* ============ STYLE ============ */
const s = StyleSheet.create({
  /* komponen */
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.accb },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5, backgroundColor: C.acc },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 16, ...SHADOW_CARD },

  /* nav */
  nav: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(248,250,252,0.92)', borderBottomWidth: 1, borderBottomColor: C.bd,
  },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontSize: 16, fontWeight: '700' },
  wrap: { paddingHorizontal: 24 },

  /* hero */
  hero: { paddingTop: 32, paddingBottom: 24, alignItems: 'flex-start' },
  h1: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6, marginTop: 14, marginBottom: 14 },
  lead: { color: C.mut, fontSize: 16, lineHeight: 24 },
  hbtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 22 },
  stats: { flexDirection: 'row', gap: 18, marginTop: 4 },
  statB: { fontSize: 32, fontWeight: '700', color: C.acc, letterSpacing: -0.5 },
  statS: { color: C.mut, fontSize: 13 },
  hphoto: { width: '100%', maxWidth: 340, alignSelf: 'center', marginTop: 36 },
  photoBack: { position: 'absolute', top: 20, left: 20, right: -18, bottom: -18, borderRadius: 28, opacity: 0.28 },
  photo: {
    width: '100%', height: 380, borderRadius: 28,
    shadowColor: '#1E293B', shadowOpacity: 0.3, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 10,
  },
  chip: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  chipTxt: { fontSize: 12, fontWeight: '600' },

  /* section */
  sec: { paddingVertical: 24 },
  secH: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4, marginBottom: 6 },
  secP: { color: C.mut, fontSize: 14, lineHeight: 21 },

  /* fasilitas */
  fIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: C.accb, alignItems: 'center', justifyContent: 'center' },
  fH: { fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  fP: { color: C.mut, fontSize: 13, lineHeight: 20 },

  /* galeri */
  gal: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 18 },
  galImg: { borderRadius: 18, ...SHADOW_CARD },
  cap: { textAlign: 'center', color: C.mut, fontSize: 13, marginTop: 8 },

  /* CTA */
  cta: {
    borderRadius: 24, padding: 28, marginTop: 4, marginBottom: 32,
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 8,
  },
  ctaH: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  ctaP: { color: '#CBD5E1', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  ctaBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },

  /* footer */
  lfoot: { borderTopWidth: 1, borderTopColor: C.bd, paddingVertical: 22, marginBottom: 12 },
  lfootTxt: { color: C.mut, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
