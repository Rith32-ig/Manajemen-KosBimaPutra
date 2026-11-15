/* Komponen UI bersama untuk layar Login / Daftar / OTP / Lupa Password / Akun.
   Token desain (warna, font, gradien) disamakan dengan LoginScreen yang sudah ada. */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView, StatusBar, StyleSheet,
  Text, TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', er: '#DC2626', erb: '#FEE2E2', ok: '#16A34A', okb: '#DCFCE7', wn: '#B45309', wnb: '#FEF3C7', accb: '#DBEAFE',
};
export const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD = ['#1E293B', '#2563EB'] as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };
const BG = require('../../assets/img/depan.jpg');

export function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

/* ---------- Input ---------- */
type FieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | boolean | null;
  hint?: string;
  leftIcon?: IconName;
  style?: StyleProp<ViewStyle>;
};

export function Field({ label, error, hint, leftIcon, secureTextEntry, style, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const message = typeof error === 'string' ? error : null;
  return (
    <View style={[{ marginTop: 12 }, style]}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <View style={[s.field, focused && { borderColor: C.acc }, !!error && { borderColor: C.er }]}>
        {leftIcon ? <Ionicons name={leftIcon} size={16} color={C.mut} style={{ marginRight: 8 }} /> : null}
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={s.input}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Tampilkan atau sembunyikan kata sandi">
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.mut} />
          </Pressable>
        ) : null}
      </View>
      {message ? <Txt style={s.errText}>{message}</Txt> : hint ? <Txt style={s.hint}>{hint}</Txt> : null}
    </View>
  );
}

/* ---------- Tombol ---------- */
type BtnProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'google' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Btn({ title, onPress, variant = 'primary', icon, loading, disabled, style }: BtnProps) {
  const mati = !!(loading || disabled);
  const warna = variant === 'primary' ? '#fff' : variant === 'danger' ? C.er : variant === 'google' ? C.txt : C.acc;
  const isi = (
    <View style={s.btnRow}>
      {loading ? <ActivityIndicator size="small" color={warna} style={{ marginRight: 8 }} /> : icon ? <Ionicons name={icon} size={17} color={warna} style={{ marginRight: 8 }} /> : null}
      <Txt style={{ color: warna, fontSize: 14, fontWeight: '600' }}>{title}</Txt>
    </View>
  );
  return (
    <Pressable
      onPress={mati ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: mati, busy: !!loading }}
      style={({ pressed }) => [{ borderRadius: 9, alignSelf: 'stretch' }, mati && { opacity: 0.6 }, pressed && !mati && { opacity: 0.85 }, style]}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={GRAD} start={G_START} end={G_END} style={s.btnIn}>{isi}</LinearGradient>
      ) : (
        <View style={[s.btnIn, { borderWidth: 1, borderColor: variant === 'danger' ? C.er : variant === 'google' ? C.bd : C.acc, backgroundColor: variant === 'google' ? '#fff' : 'transparent' }]}>{isi}</View>
      )}
    </Pressable>
  );
}

export function TautanTeks({ teks, onPress, style }: { teks: string; onPress: () => void; style?: StyleProp<TextStyle> }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
      <Txt style={[{ color: C.acc, fontSize: 13, fontWeight: '600', textAlign: 'center' }, style]}>{teks}</Txt>
    </Pressable>
  );
}

/* ---------- Banner notifikasi berhasil / gagal ---------- */
export function Banner({ tipe, teks, style }: { tipe: 'ok' | 'err' | 'info'; teks: string | null | undefined; style?: StyleProp<ViewStyle> }) {
  if (!teks) return null;
  const k = tipe === 'ok' ? { bg: C.okb, fg: C.ok, ic: 'checkmark-circle' } : tipe === 'err' ? { bg: C.erb, fg: C.er, ic: 'alert-circle' } : { bg: C.accb, fg: C.acc, ic: 'information-circle' };
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: k.bg, borderRadius: 10, padding: 10, marginTop: 12 }, style]}>
      <Ionicons name={k.ic as IconName} size={18} color={k.fg} />
      <Txt style={{ flex: 1, color: k.fg, fontSize: 13, lineHeight: 18 }}>{teks}</Txt>
    </View>
  );
}

/* ---------- Tab pilihan ---------- */
export function Segmen<T extends string>({ opsi, nilai, onChange }: { opsi: { k: T; label: string }[]; nilai: T; onChange: (k: T) => void }) {
  return (
    <View style={s.segWrap}>
      {opsi.map((o) => {
        const on = o.k === nilai;
        return (
          <Pressable key={o.k} onPress={() => onChange(o.k)} style={[s.segItem, on && { backgroundColor: C.acc }]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            <Txt style={{ fontSize: 13, fontWeight: '600', color: on ? '#fff' : C.mut }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Indikator kekuatan password ---------- */
export function BarKekuatan({ nilai }: { nilai: number }) {
  if (!nilai) return null;
  const warna = ['', C.er, C.wn, C.acc, C.ok][nilai];
  const label = ['', 'Lemah', 'Cukup', 'Baik', 'Kuat'][nilai];
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= nilai ? warna : C.bd }} />)}
      </View>
      <Txt style={{ fontSize: 11, color: warna, marginTop: 3 }}>Kekuatan password: {label}</Txt>
    </View>
  );
}

/* ---------- Input kode OTP ---------- */
export function OtpInput({ value, onChange, onSubmit, disabled, panjang = 6 }: { value: string; onChange: (v: string) => void; onSubmit?: () => void; disabled?: boolean; panjang?: number }) {
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, panjang))}
      onSubmitEditing={onSubmit}
      editable={!disabled}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={panjang}
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      placeholder={'•'.repeat(panjang)}
      placeholderTextColor="#CBD5E1"
      accessibilityLabel="Kode OTP"
      style={s.otp}
    />
  );
}

/* ---------- Hitung mundur (detik) ---------- */
export function useHitungMundur(awal = 0): [number, (detik: number) => void] {
  const [sisa, setSisa] = useState(awal);
  const target = useRef(Date.now() + awal * 1000);
  const mulai = useCallback((detik: number) => {
    target.current = Date.now() + detik * 1000;
    setSisa(Math.max(0, Math.ceil(detik)));
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setSisa(Math.max(0, Math.ceil((target.current - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(t);
  }, []);
  return [sisa, mulai];
}

/* ---------- Kerangka layar auth (foto latar + kartu putih), sama seperti LoginScreen ---------- */
export function LayarAuth({ judul, sub, children, footer, hero }: { judul: string; sub?: string; children: ReactNode; footer?: ReactNode; hero?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" />
      <Image source={BG} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(15,23,42,0.88)', 'rgba(30,41,59,0.55)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          <View style={hero ? [s.side, { padding: 22, gap: 10 }] : s.side}>
            <Ionicons name="home" size={hero ? 40 : 34} color="#fff" />
            <Txt style={hero ? [s.sideH, { fontSize: 34, lineHeight: 40, letterSpacing: -0.6 }] : s.sideH}>Kos Bima Putra</Txt>
            {hero ? <Txt style={s.sideP}>{hero}</Txt> : null}
          </View>
          <View style={s.form}>
            <Txt style={s.h2}>{judul}</Txt>
            {sub ? <Txt style={s.sub}>{sub}</Txt> : null}
            {children}
          </View>
          {footer}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '600', color: C.mut, marginBottom: 4 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 9, paddingHorizontal: 11, minHeight: 42 },
  input: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.txt, paddingVertical: 9 },
  errText: { color: C.er, fontSize: 12, marginTop: 4 },
  hint: { color: C.mut, fontSize: 12, marginTop: 4 },
  btnIn: { borderRadius: 9, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segWrap: { flexDirection: 'row', backgroundColor: C.bg, borderWidth: 1, borderColor: C.bd, borderRadius: 10, padding: 3, gap: 3, marginTop: 14 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  otp: {
    fontFamily: F.bold, fontSize: 26, letterSpacing: 10, textAlign: 'center', color: C.txt, backgroundColor: C.surf,
    borderWidth: 1, borderColor: C.bd, borderRadius: 12, paddingVertical: 12, marginTop: 14,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  side: { paddingHorizontal: 22, paddingVertical: 16, gap: 6 },
  sideH: { color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  sideP: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 21, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
  form: {
    backgroundColor: C.surf, borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 12,
  },
  h2: { fontSize: 16, fontWeight: '700' },
  sub: { color: C.mut, fontSize: 12, marginTop: 2, lineHeight: 17 },
});
