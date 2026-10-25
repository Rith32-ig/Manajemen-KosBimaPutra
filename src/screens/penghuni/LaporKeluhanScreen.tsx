/* === ANGGOTA 2: DHIYAUL (PENGHUNI) — SCREEN 4: LAPOR KELUHAN ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini.
   Setelah dikirim, keluhan diteruskan ke tab "Beranda" lewat params navigasi (keluhanBaru). */
import React, { useState } from 'react';
import type { ComponentProps } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { PenghuniTabParamList } from '../RootNavigator';
import type { Keluhan } from './PenghuniHomeScreen';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = BottomTabScreenProps<PenghuniTabParamList, 'Lapor'>;
type Kategori = { key: string; icon: IconName };

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', er: '#DC2626', accb: '#DBEAFE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD_PRIMARY = ['#1E293B', '#2563EB'] as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };

/* ============ DATA DUMMY ============ */
const KATEGORI: Kategori[] = [
  { key: 'Wi-Fi', icon: 'wifi' },
  { key: 'Fasilitas', icon: 'bed' },
  { key: 'Air', icon: 'water' },
  { key: 'Listrik', icon: 'bulb' },
];

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

function CustomButton({ title, icon, onPress, ghost = false, block = false, style }: {
  title?: string;
  icon?: IconName;
  onPress: () => void;
  ghost?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const color = ghost ? C.acc : '#fff';
  const inner = (
    <View style={s.btnRow}>
      {icon ? <Ionicons name={icon} size={18} color={color} style={{ marginRight: title ? 6 : 0 }} /> : null}
      {title ? <Txt style={{ color, fontSize: 15, fontWeight: '600' }}>{title}</Txt> : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ alignSelf: block ? 'stretch' : 'flex-start', backgroundColor: ghost ? 'transparent' : C.acc, borderRadius: 14 }, pressed && { opacity: 0.85 }, style]}
    >
      {ghost ? (
        <View style={{ borderWidth: 1, borderColor: C.acc, borderRadius: 14 }}>{inner}</View>
      ) : (
        <LinearGradient colors={GRAD_PRIMARY} start={G_START} end={G_END} style={{ borderRadius: 14 }}>
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}

function CustomInput({ label, error, style, ...rest }: Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const message = typeof error === 'string' ? error : null;
  return (
    <View style={style}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <View style={[s.field, focused && { borderColor: C.acc }, !!error && { borderColor: C.er }]}>
        <TextInput
          {...rest}
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="sentences"
          style={s.input}
        />
      </View>
      {message ? <Txt style={s.errText}>{message}</Txt> : null}
    </View>
  );
}

/* ============ SCREEN 4: LAPOR KELUHAN ============ */
export default function LaporKeluhanScreen({ navigation }: Props) {
  const [kategori, setKategori] = useState('Wi-Fi');
  const [deskripsi, setDeskripsi] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const kirim = () => {
    const teks = deskripsi.trim();
    if (!teks) {
      setErr('Deskripsi masalah wajib diisi');
      return;
    }
    const ringkas = teks.length > 40 ? teks.slice(0, 40).trim() + '…' : teks;
    const keluhanBaru: Keluhan = {
      id: 'c' + Date.now(),
      judul: `${kategori}: ${ringkas}`,
      tanggal: 'Dilaporkan hari ini',
      status: 'Masuk',
      tone: 'ac',
      step: 1,
    };
    setDeskripsi('');
    setFoto(null);
    setErr(null);
    navigation.navigate('Beranda', { keluhanBaru });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.head}>
            <CustomButton icon="arrow-back" ghost onPress={() => navigation.navigate('Beranda')} style={{ borderRadius: 9 }} />
            <Txt style={s.h1}>Keluhan Baru</Txt>
          </View>

          <View>
            <Txt style={s.label}>Pilih kategori</Txt>
            <View style={s.cats}>
              {KATEGORI.map((k) => {
                const on = k.key === kategori;
                return (
                  <Pressable key={k.key} onPress={() => setKategori(k.key)} style={[s.cat, on && s.catOn]}>
                    <Ionicons name={k.icon} size={30} color={on ? C.acc : C.mut} />
                    <Txt style={{ fontWeight: '600', color: on ? C.acc : C.txt, marginTop: 4 }}>{k.key}</Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <CustomInput
            label="Ceritakan masalahnya"
            placeholder="Contoh: Air di kamar mandi mati sejak pagi…"
            value={deskripsi}
            onChangeText={(t) => { setDeskripsi(t); setErr(null); }}
            error={err}
            multiline
            numberOfLines={4}
          />

          <View>
            <Txt style={s.label}>Foto bukti</Txt>
            <Pressable
              style={[s.drop, foto && { borderColor: C.acc, backgroundColor: C.accb }]}
              onPress={() => setFoto('foto-bukti-keluhan.jpg')}
            >
              <Ionicons name={foto ? 'checkmark-circle' : 'camera'} size={28} color={foto ? C.ok : C.mut} />
              <Txt style={{ fontWeight: '700', color: C.mut, marginTop: 4 }}>Ketuk untuk memilih foto</Txt>
              <Txt style={{ fontSize: 12, color: C.mut, marginTop: 4 }}>{foto ? `✓ ${foto}` : 'JPG/PNG, maks 5 MB'}</Txt>
            </Pressable>
          </View>

          <CustomButton title="Kirim Laporan" icon="paper-plane" block style={{ marginTop: 'auto' }} onPress={kirim} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ============ STYLE ============ */
const s = StyleSheet.create({
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 20 },
  label: { fontSize: 12, fontWeight: '600', color: C.mut, marginBottom: 4 },
  field: {
    backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 9, paddingHorizontal: 11, minHeight: 96,
  },
  input: { fontFamily: F.regular, fontSize: 14, color: C.txt, paddingVertical: 9, minHeight: 96, textAlignVertical: 'top' },
  errText: { color: C.er, fontSize: 12, marginTop: 4 },

  body: { flexGrow: 1, padding: 18, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  cat: {
    width: '47.5%', flexGrow: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    backgroundColor: C.surf, borderWidth: 2, borderColor: C.bd, borderRadius: 16,
  },
  catOn: {
    borderColor: C.acc, backgroundColor: C.accb,
    shadowColor: '#2563EB', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  drop: { borderWidth: 2, borderStyle: 'dashed', borderColor: C.bd, borderRadius: 16, padding: 22, alignItems: 'center', marginTop: 6 },
});
