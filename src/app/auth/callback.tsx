/* Rute /auth/callback : tujuan balik dari
   - Google OAuth            (?code=…)
   - verifikasi email        (?code=…&mode=verify)
   - reset password email    (?code=…&mode=reset)  -> menampilkan form password baru
   - konfirmasi ganti email  (?mode=email) / hubungkan Google (?mode=link)
   Daftarkan URL halaman ini di Supabase > Authentication > URL Configuration > Redirect URLs. */
import { Banner, BarKekuatan, Btn, C, Field, Txt } from '@/components/auth-ui';
import { setPasswordBaru, tukarKode } from '@/lib/auth';
import { kekuatanPassword } from '@/lib/auth-core';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS !== 'web' || typeof window !== 'undefined') WebBrowser.maybeCompleteAuthSession();

type Tahap = 'memproses' | 'reset' | 'selesai' | 'gagal';

export default function AuthCallback() {
  const router = useRouter();
  const p = useLocalSearchParams<{ code?: string; mode?: string; error_description?: string; error?: string }>();
  const [tahap, setTahap] = useState<Tahap>('memproses');
  const [pesan, setPesan] = useState<string | null>(null);
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [loading, setLoading] = useState(false);
  const jalan = useRef(false); // kode PKCE hanya boleh ditukar SEKALI

  useEffect(() => {
    if (jalan.current) return;
    jalan.current = true;
    (async () => {
      const mode = typeof p.mode === 'string' ? p.mode : '';
      const galat = (p.error_description || p.error) as string | undefined;
      if (galat) {
  setPesan('Gagal: ' + String(galat).replace(/\+/g, ' '));
  return setTahap('gagal');
}

      const { data: s0 } = await supabase.auth.getSession();
      if (typeof p.code === 'string' && p.code) {
        const r = await tukarKode(p.code);
        if (r.error && !s0.session) {
          // verifikasi email yang dibuka di perangkat lain tidak punya code_verifier -> tetap berhasil di server
          setPesan(mode === 'verify' ? 'Email kemungkinan sudah terverifikasi. Silakan masuk dengan email dan password Anda.' : r.error);
          return setTahap(mode === 'verify' ? 'selesai' : 'gagal');
        }
      }
      const { data: s1 } = await supabase.auth.getSession();
      if (!s1.session && mode !== 'verify' && mode !== 'email') {
        setPesan('Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.');
        return setTahap('gagal');
      }
      if (mode === 'reset') return setTahap('reset');
      if (mode === 'verify') { setPesan('Email berhasil diverifikasi. Silakan masuk.'); return setTahap('selesai'); }
      if (mode === 'email') { setPesan('Perubahan email dikonfirmasi. Masuk kembali bila diminta.'); return setTahap('selesai'); }
      // Google / hubungkan Google: sesi aktif -> RootNavigator menentukan dashboard dari role di database
      router.replace('/');
    })();
  }, [p.code, p.mode, p.error, p.error_description, router]);

  const simpan = async () => {
    if (loading) return;
    setLoading(true);
    setPesan(null);
    const r = await setPasswordBaru(baru, ulang);
    setLoading(false);
    if (r.error) return setPesan(r.error);
    await supabase.auth.signOut(); // paksa masuk ulang dengan password baru
    setPesan('Password berhasil diubah. Silakan masuk dengan password baru.');
    setTahap('selesai');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: C.surf, borderRadius: 20, borderWidth: 1, borderColor: C.bd, padding: 22 }}>
          {tahap === 'memproses' ? (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={C.acc} />
              <Txt style={{ color: C.mut }}>Memproses…</Txt>
            </View>
          ) : null}

          {tahap === 'reset' ? (
            <View>
              <Txt style={{ fontSize: 16, fontWeight: '700' }}>Buat password baru</Txt>
              <Txt style={{ color: C.mut, fontSize: 12, marginTop: 2 }}>Minimal 8 karakter, kombinasi huruf dan angka.</Txt>
              <Field label="Password baru" secureTextEntry value={baru} onChangeText={setBaru} autoComplete="new-password" textContentType="newPassword" />
              <BarKekuatan nilai={kekuatanPassword(baru)} />
              <Field label="Ulangi password baru" secureTextEntry value={ulang} onChangeText={setUlang} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={simpan} />
              <Banner tipe="err" teks={pesan} />
              <Btn title="Simpan password" onPress={simpan} loading={loading} style={{ marginTop: 14 }} />
            </View>
          ) : null}

          {tahap === 'selesai' || tahap === 'gagal' ? (
            <View>
              <Banner tipe={tahap === 'selesai' ? 'ok' : 'err'} teks={pesan} style={{ marginTop: 0 }} />
              <Btn title="Ke halaman masuk" onPress={() => router.replace('/')} style={{ marginTop: 16 }} />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
