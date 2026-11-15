/* === SCREEN: LUPA PASSWORD (recovery lewat email) ===
   Tautan reset membuka rute /auth/callback?mode=reset yang menampilkan form password baru. */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Btn, C, Field, LayarAuth, TautanTeks, Txt, useHitungMundur } from '../components/auth-ui';
import { kirimResetPassword } from '../lib/auth';
import { validasiEmail } from '../lib/auth-core';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'LupaPassword'>;

export default function LupaPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [terkirim, setTerkirim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cd, mulaiCd] = useHitungMundur(0);

  const kirim = async () => {
    if (loading || cd > 0) return;
    const e = validasiEmail(email);
    if (e) return setErr(e);
    setErr(null);
    setLoading(true);
    const r = await kirimResetPassword(email);
    setLoading(false);
    if (r.error) return setErr(r.error);
    setTerkirim(true);
    mulaiCd(60); // jeda 60 detik agar tidak dipakai untuk spam email
  };

  return (
    <LayarAuth
      judul="Lupa password"
      sub="Masukkan email akun Anda. Kami kirim tautan untuk membuat password baru."
      footer={
        <View style={{ marginTop: 14 }}>
          <TautanTeks teks="← Kembali ke halaman masuk" onPress={() => navigation.navigate('Login')} style={{ color: '#fff' }} />
        </View>
      }
    >
      <Field label="Email" placeholder="nama@email.com" value={email} onChangeText={(t) => { setEmail(t); setErr(null); }} error={err} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" returnKeyType="done" onSubmitEditing={kirim} />

      {terkirim ? (
        <Banner tipe="ok" teks="Jika email tersebut terdaftar, tautan reset password sudah dikirim. Periksa kotak masuk dan folder spam. Tautan berlaku terbatas." />
      ) : null}

      <View style={{ marginTop: 14 }}>
        <Btn title={cd > 0 ? `Kirim ulang dalam ${cd} detik` : terkirim ? 'Kirim ulang tautan' : 'Kirim tautan reset'} onPress={kirim} loading={loading} disabled={loading || cd > 0} />
      </View>

      <Txt style={{ color: C.mut, fontSize: 11, marginTop: 14, lineHeight: 16 }}>
        Akun yang masuk dengan nomor HP (tanpa email)? Masuk memakai kode SMS (OTP) lalu ubah password di menu Akun, atau minta pengelola kos mengatur ulang password Anda.
      </Txt>
    </LayarAuth>
  );
}
