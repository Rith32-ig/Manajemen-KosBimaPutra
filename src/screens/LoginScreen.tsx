/* === SCREEN 2: LOGIN NOMOR HP + PASSWORD (Supabase Auth) ===
   Role (Pemilik / Pengelola / Penghuni) dibaca dari tabel profiles, bukan dari input pengguna. */
import React, { useState } from 'react';
import {
  View, Text, Image, TextInput, ScrollView, Pressable, StatusBar, StyleSheet,
} from 'react-native';
import type { ImageSourcePropType, StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from './RootNavigator';
import { supabase, keE164, ambilProfil, TARGET } from '../lib/supabase';

/* ============ TIPE ============ */
type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | boolean | null;
  style?: StyleProp<ViewStyle>;
};

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', er: '#DC2626', accb: '#DBEAFE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD_PRIMARY = ['#1E293B', '#2563EB'] as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };

const BG: ImageSourcePropType = require('../../assets/img/depan.jpg');

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

function CustomButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
      <LinearGradient colors={GRAD_PRIMARY} start={G_START} end={G_END} style={s.btnIn}>
        <Txt style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{title}</Txt>
      </LinearGradient>
    </Pressable>
  );
}

function CustomInput({ label, error, secureTextEntry, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const message = typeof error === 'string' ? error : null;
  return (
    <View style={[{ marginTop: 12 }, style]}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <View style={[s.field, focused && { borderColor: C.acc }, !!error && { borderColor: C.er }]}>
        <TextInput
          {...rest}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          style={s.input}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Tampilkan atau sembunyikan kata sandi">
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={C.mut} />
          </Pressable>
        ) : null}
      </View>
      {message ? <Txt style={s.errText}>{message}</Txt> : null}
    </View>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggleRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={[s.sw, { backgroundColor: value ? C.acc : C.bd }]}>
        <View style={[s.knob, { left: value ? 21 : 3 }]} />
      </View>
      <Txt style={{ flex: 1, fontSize: 14 }}>{label}</Txt>
    </Pressable>
  );
}

/* ============ SCREEN ============ */
function pesanError(msg: string, status?: number): string {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Nomor HP atau password salah.';
  if (m.includes('banned')) return 'Akun sudah tidak aktif. Hubungi pengelola kos.';
  if (m.includes('rate') || m.includes('too many') || status === 429) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  if (m.includes('network') || m.includes('fetch')) return 'Tidak ada koneksi internet.';
  return 'Terjadi kesalahan: ' + msg;
}

export default function LoginScreen({ navigation }: Props) {
  const [hp, setHp] = useState('+62');
  const [password, setPassword] = useState('');
  const [errHp, setErrHp] = useState<string | null>(null);
  const [errPass, setErrPass] = useState<string | null>(null);
  const [errAll, setErrAll] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (loading) return;
    const nomor = keE164(hp);
    setErrAll('');
    setErrHp(nomor ? null : 'Masukkan nomor HP valid dengan format +62…');
    setErrPass(password ? null : 'Password wajib diisi');
    if (!nomor || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ phone: nomor, password });
    if (error) { setLoading(false); setErrAll(pesanError(error.message, error.status)); return; }
    const profil = await ambilProfil(); // role dari database
    if (!profil) {
      await supabase.auth.signOut(); setLoading(false);
      setErrAll('Profil tidak ditemukan. Hubungi pengelola kos.');
      return;
    }
    if (profil.role === 'penghuni') {
      // penghuni yang sudah keluar tidak boleh masuk
      const { data: aktif } = await supabase.from('penghuni').select('id').eq('status_penghuni', 'Aktif').maybeSingle();
      if (!aktif) {
        await supabase.auth.signOut(); setLoading(false);
        setErrAll('Akun sudah tidak aktif. Hubungi pengelola kos.');
        return;
      }
    }
    setLoading(false);
    navigation.reset({ index: 0, routes: [{ name: TARGET[profil.role] }] });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <Image source={BG} style={s.bg} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(15,23,42,0.88)', 'rgba(30,41,59,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets>
          <View style={s.side}>
            <Ionicons name="home" size={40} color="#fff" />
            <Txt style={s.sideH}>Kos Bima Putra</Txt>
            <Txt style={s.sideP}>Kelola data, pembayaran, dan keluhan kos dalam satu aplikasi. Sistem mengenali peran Anda dari nomor HP yang terdaftar.</Txt>
          </View>

          <View style={s.form}>
            <Txt style={s.h2}>Masuk</Txt>
            <Txt style={s.sub}>Gunakan nomor HP terdaftar dan password dari pengelola</Txt>
            <View style={{ marginTop: 14 }}>
              <View style={s.badgeRow}>
                <Ionicons name="people" size={12} color={C.acc} />
                <Txt style={s.badgeTxt}>Pemilik, Pengelola &amp; Penghuni</Txt>
              </View>
            </View>

            <CustomInput
              label="Nomor HP"
              placeholder="+62 812-3456-7890"
              value={hp}
              onChangeText={(t) => { setHp(t); setErrHp(null); setErrAll(''); }}
              error={errHp || !!errAll}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="next"
            />
            <CustomInput
              label="Password"
              placeholder="Masukkan password"
              secureTextEntry
              value={password}
              onChangeText={(t) => { setPassword(t); setErrPass(null); setErrAll(''); }}
              error={errPass || !!errAll}
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={doLogin}
            />

            <Txt style={s.lerr}>{errAll}</Txt>
            <CustomButton title={loading ? 'Memproses…' : 'Masuk'} onPress={doLogin} />

            <Pressable onPress={() => navigation.navigate('Landing')} hitSlop={8}>
              <Txt style={s.skip}>← Kembali ke beranda</Txt>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ============ STYLE ============ */
const s = StyleSheet.create({
  /* komponen */
  btn: { borderRadius: 9, alignSelf: 'stretch', backgroundColor: C.acc },
  btnIn: { borderRadius: 9, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '600', color: C.mut, marginBottom: 4 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd,
    borderRadius: 9, paddingHorizontal: 11, minHeight: 42,
  },
  input: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.txt, paddingVertical: 9 },
  errText: { color: C.er, fontSize: 12, marginTop: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sw: { width: 40, height: 22, borderRadius: 99, marginRight: 8 },
  knob: { position: 'absolute', top: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },

  /* layar */
  root: { flex: 1, backgroundColor: C.navy },
  bg: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  side: { padding: 22, gap: 10 },
  sideH: {
    color: '#fff', fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  sideP: {
    color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12,
  },
  form: {
    backgroundColor: C.surf, borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 25, shadowOffset: { width: 0, height: 20 }, elevation: 12,
  },
  h2: { fontSize: 16, fontWeight: '700' },
  sub: { color: C.mut, fontSize: 12, marginTop: 2 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5,
    backgroundColor: C.accb, borderRadius: 99, paddingVertical: 2, paddingHorizontal: 10,
  },
  badgeTxt: { color: C.acc, fontSize: 12, fontWeight: '600' },
  lerr: { color: C.er, fontSize: 12, minHeight: 16, marginTop: 8, marginBottom: 8 },
  skip: { textAlign: 'center', marginTop: 12, fontSize: 12, color: C.mut },
});
