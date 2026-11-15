/* === SCREEN: REGISTRASI EMAIL + PASSWORD (Supabase Auth) ===
   Akun baru selalu ber-role "penghuni" dan BELUM tertaut ke data penghuni mana pun.
   Penautan dilakukan Pengelola secara eksplisit (tidak otomatis dari nama / nomor HP). */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, BarKekuatan, Btn, C, Field, LayarAuth, TautanTeks, Txt } from '../components/auth-ui';
import { daftarEmail, masukGoogle, tentukanRute } from '../lib/auth';
import { kekuatanPassword, validasiEmail, validasiKonfirmasi, validasiNama, validasiPassword } from '../lib/auth-core';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ulang, setUlang] = useState('');
  const [err, setErr] = useState<{ nama?: string | null; email?: string | null; pass?: string | null; ulang?: string | null; all?: string }>({});
  const [loading, setLoading] = useState<null | 'daftar' | 'google'>(null);
  const [selesai, setSelesai] = useState<string | null>(null);

  const daftar = async () => {
    if (loading) return;
    const e = {
      nama: validasiNama(nama),
      email: validasiEmail(email),
      pass: validasiPassword(password),
      ulang: validasiKonfirmasi(password, ulang),
    };
    setErr(e);
    if (e.nama || e.email || e.pass || e.ulang) return;

    setLoading('daftar');
    const r = await daftarEmail({ nama, email, password });
    if (r.error) { setLoading(null); return setErr({ all: r.error }); }
    if (r.perluVerifikasi) {
      setLoading(null);
      return setSelesai(email.trim().toLowerCase());
    }
    // konfirmasi email dimatikan di dashboard -> sesi langsung aktif
    const rute = await tentukanRute();
    setLoading(null);
    if (rute.ok && rute.route === 'Akun') navigation.reset({ index: 0, routes: [{ name: 'Akun', params: { belumTertaut: true } }] });
    else if (rute.ok) navigation.reset({ index: 0, routes: [{ name: rute.route }] });
    else setErr({ all: rute.pesan });
  };

  const google = async () => {
    if (loading) return;
    setErr({});
    setLoading('google');
    const r = await masukGoogle();
    if (r.menunggu) return;
    if (r.error) { setLoading(null); return setErr({ all: r.error }); }
    const rute = await tentukanRute();
    setLoading(null);
    if (rute.ok && rute.route === 'Akun') navigation.reset({ index: 0, routes: [{ name: 'Akun', params: { belumTertaut: true } }] });
    else if (rute.ok) navigation.reset({ index: 0, routes: [{ name: rute.route }] });
    else setErr({ all: rute.pesan });
  };

  if (selesai) {
    return (
      <LayarAuth judul="Periksa email Anda" sub="Satu langkah lagi untuk mengaktifkan akun.">
        <Banner tipe="ok" teks={`Kami mengirim tautan verifikasi ke ${selesai}. Klik tautan tersebut, lalu masuk dengan email dan password Anda.`} />
        <Banner tipe="info" teks="Tidak ada email? Periksa folder spam. Email verifikasi bisa tertunda beberapa menit." />
        <View style={{ marginTop: 16 }}>
          <Btn title="Ke halaman masuk" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })} />
        </View>
      </LayarAuth>
    );
  }

  return (
    <LayarAuth
      judul="Daftar akun"
      sub="Buat akun dengan email. Setelah mendaftar, pengelola kos akan menghubungkan akun Anda dengan data kamar."
      footer={
        <View style={{ marginTop: 14 }}>
          <TautanTeks teks="Sudah punya akun? Masuk" onPress={() => navigation.navigate('Login')} style={{ color: '#fff' }} />
        </View>
      }
    >
      <Field label="Nama lengkap" placeholder="Nama sesuai data kos" value={nama} onChangeText={(t) => { setNama(t); setErr((x) => ({ ...x, nama: null })); }} error={err.nama} autoCapitalize="words" autoComplete="name" textContentType="name" />
      <Field label="Email" placeholder="nama@email.com" value={email} onChangeText={(t) => { setEmail(t); setErr((x) => ({ ...x, email: null, all: '' })); }} error={err.email} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" placeholder="Minimal 8 karakter, huruf + angka" secureTextEntry value={password} onChangeText={(t) => { setPassword(t); setErr((x) => ({ ...x, pass: null })); }} error={err.pass} autoComplete="new-password" textContentType="newPassword" />
      <BarKekuatan nilai={kekuatanPassword(password)} />
      <Field label="Ulangi password" placeholder="Ketik ulang password" secureTextEntry value={ulang} onChangeText={(t) => { setUlang(t); setErr((x) => ({ ...x, ulang: null })); }} error={err.ulang} autoComplete="new-password" textContentType="newPassword" returnKeyType="done" onSubmitEditing={daftar} />

      <Banner tipe="err" teks={err.all} />

      <View style={{ marginTop: 14 }}>
        <Btn title="Daftar" onPress={daftar} loading={loading === 'daftar'} disabled={!!loading} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.bd }} />
        <Txt style={{ color: C.mut, fontSize: 12 }}>atau</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: C.bd }} />
      </View>
      <Btn title="Daftar dengan Google" variant="google" icon="logo-google" onPress={google} loading={loading === 'google'} disabled={!!loading} />
    </LayarAuth>
  );
}
