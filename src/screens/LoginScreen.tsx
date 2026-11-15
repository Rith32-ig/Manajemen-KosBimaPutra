/* === SCREEN 2: LOGIN (Supabase Auth) ===
   Metode: Email + password · Nomor HP + password · OTP SMS · Google.
   Role (Pemilik / Pengelola / Penghuni) selalu dibaca dari tabel profiles, bukan dari input pengguna. */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banner, Btn, C, Field, LayarAuth, Segmen, TautanTeks, Txt } from '../components/auth-ui';
import { kirimOtpLogin, masukEmail, masukGoogle, masukHpPassword, tentukanRute } from '../lib/auth';
import { keE164, validasiEmail } from '../lib/auth-core';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type Metode = 'email' | 'hp';
type CaraHp = 'password' | 'otp';

export default function LoginScreen({ navigation }: Props) {
  const [metode, setMetode] = useState<Metode>('email');
  const [caraHp, setCaraHp] = useState<CaraHp>('password');
  const [email, setEmail] = useState('');
  const [hp, setHp] = useState('+62');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<{ email?: string | null; hp?: string | null; pass?: string | null; all?: string }>({});
  const [loading, setLoading] = useState<null | 'masuk' | 'google' | 'otp'>(null);

  const ganti = <K extends keyof typeof err>(k: K, v: (typeof err)[K]) => setErr((e) => ({ ...e, [k]: v, all: '' }));

  // Setelah sesi terbentuk: tentukan dashboard dari role di database
  const lanjut = async () => {
    const r = await tentukanRute();
    if (!r.ok) {
      setErr({ all: r.pesan });
      return;
    }
    if (r.route === 'Akun') navigation.reset({ index: 0, routes: [{ name: 'Akun', params: { belumTertaut: true } }] });
    else navigation.reset({ index: 0, routes: [{ name: r.route }] });
  };

  const doLogin = async () => {
    if (loading) return;
    setErr({});
    if (metode === 'email') {
      const eE = validasiEmail(email);
      const eP = password ? null : 'Password wajib diisi';
      if (eE || eP) return setErr({ email: eE, pass: eP });
      setLoading('masuk');
      const { error } = await masukEmail(email, password);
      if (error) { setLoading(null); return setErr({ all: error }); }
    } else {
      const nomor = keE164(hp);
      const eH = nomor ? null : 'Masukkan nomor HP valid dengan format +62…';
      const eP = password ? null : 'Password wajib diisi';
      if (!nomor || eP) return setErr({ hp: eH, pass: eP });
      setLoading('masuk');
      const { error } = await masukHpPassword(nomor, password);
      if (error) { setLoading(null); return setErr({ all: error }); }
    }
    await lanjut();
    setLoading(null);
  };

  const doOtp = async () => {
    if (loading) return;
    setErr({});
    const nomor = keE164(hp);
    if (!nomor) return setErr({ hp: 'Masukkan nomor HP valid dengan format +62…' });
    setLoading('otp');
    const r = await kirimOtpLogin(hp);
    setLoading(null);
    if (r.error) return setErr({ all: r.error });
    navigation.navigate('Otp', { nomor });
  };

  const doGoogle = async () => {
    if (loading) return;
    setErr({});
    setLoading('google');
    const r = await masukGoogle();
    if (r.menunggu) return; // web: halaman dialihkan ke Google, lalu kembali lewat /auth/callback
    if (r.error) { setLoading(null); return setErr({ all: r.error }); }
    await lanjut();
    setLoading(null);
  };

  const pakaiOtp = metode === 'hp' && caraHp === 'otp';

  return (
    <LayarAuth
      judul="Masuk"
      sub="Pilih cara masuk. Peran Anda dikenali otomatis dari akun."
      hero="Kelola data, pembayaran, dan keluhan kos dalam satu aplikasi. Sistem mengenali peran Anda dari akun yang terdaftar."
      footer={
        <View style={{ gap: 12, marginTop: 14 }}>
          <TautanTeks teks="Belum punya akun? Daftar dengan email" onPress={() => navigation.navigate('Register')} style={{ color: '#fff' }} />
          <Pressable onPress={() => navigation.navigate('Landing')} hitSlop={8}>
            <Txt style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>← Kembali ke beranda</Txt>
          </Pressable>
        </View>
      }
    >
      <Segmen<Metode>
        opsi={[{ k: 'email', label: 'Email' }, { k: 'hp', label: 'Nomor HP' }]}
        nilai={metode}
        onChange={(k) => { setMetode(k); setErr({}); setPassword(''); }}
      />

      {metode === 'email' ? (
        <Field
          label="Email"
          placeholder="nama@email.com"
          value={email}
          onChangeText={(t) => { setEmail(t); ganti('email', null); }}
          error={err.email || !!err.all}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
        />
      ) : (
        <>
          <Segmen<CaraHp>
            opsi={[{ k: 'password', label: 'Password' }, { k: 'otp', label: 'Kode SMS (OTP)' }]}
            nilai={caraHp}
            onChange={(k) => { setCaraHp(k); setErr({}); }}
          />
          <Field
            label="Nomor HP"
            placeholder="+62 812-3456-7890"
            value={hp}
            onChangeText={(t) => { setHp(t); ganti('hp', null); }}
            error={err.hp || !!err.all}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType={pakaiOtp ? 'done' : 'next'}
            onSubmitEditing={pakaiOtp ? doOtp : undefined}
          />
        </>
      )}

      {!pakaiOtp ? (
        <>
          <Field
            label="Password"
            placeholder="Masukkan password"
            secureTextEntry
            value={password}
            onChangeText={(t) => { setPassword(t); ganti('pass', null); }}
            error={err.pass || !!err.all}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={doLogin}
          />
          {metode === 'email' ? (
            <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
              <TautanTeks teks="Lupa password?" onPress={() => navigation.navigate('LupaPassword')} />
            </View>
          ) : null}
        </>
      ) : (
        <Txt style={{ color: C.mut, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
          Kode OTP 6 digit akan dikirim lewat SMS ke nomor yang terdaftar di akun Anda.
        </Txt>
      )}

      <Banner tipe="err" teks={err.all} />

      <View style={{ marginTop: 14 }}>
        {pakaiOtp ? (
          <Btn title="Kirim Kode SMS" icon="chatbubble-ellipses" onPress={doOtp} loading={loading === 'otp'} disabled={!!loading} />
        ) : (
          <Btn title="Masuk" onPress={doLogin} loading={loading === 'masuk'} disabled={!!loading} />
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.bd }} />
        <Txt style={{ color: C.mut, fontSize: 12 }}>atau</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: C.bd }} />
      </View>

      <Btn title="Masuk dengan Google" variant="google" icon="logo-google" onPress={doGoogle} loading={loading === 'google'} disabled={!!loading} />
    </LayarAuth>
  );
}
