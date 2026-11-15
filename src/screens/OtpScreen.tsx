/* === SCREEN: INPUT KODE OTP SMS (Supabase Phone Auth) ===
   - Kode 6 digit, masa berlaku + hitung mundur
   - Kirim ulang dengan jeda (countdown)
   - Batas percobaan salah -> dikunci sementara
   - Batas kirim per jam per nomor (lapisan aplikasi; lapisan utama = rate limit server Supabase) */
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Banner, Btn, C, LayarAuth, OtpInput, TautanTeks, Txt, useHitungMundur } from '../components/auth-ui';
import { kirimOtpLogin, otpGuard, tentukanRute, verifikasiOtpLogin } from '../lib/auth';
import { OTP_CONFIG, OTP_LENGTH, formatDurasi, samarkanHp, validasiOtp } from '../lib/auth-core';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;

export default function OtpScreen({ navigation, route }: Props) {
  const { nomor } = route.params;
  const [kode, setKode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [proses, setProses] = useState<null | 'verifikasi' | 'kirim'>(null);
  const [sisaCoba, setSisaCoba] = useState<number>(OTP_CONFIG.maxAttempts);
  const [cd, mulaiCd] = useHitungMundur(0);        // jeda kirim ulang
  const [exp, mulaiExp] = useHitungMundur(0);      // sisa masa berlaku kode
  const [kunci, mulaiKunci] = useHitungMundur(0);  // sisa waktu terkunci

  const segarkan = useCallback(async () => {
    const st = await otpGuard.status(nomor);
    mulaiCd(st.cooldownDetik);
    mulaiExp(st.kedaluwarsaDetik);
    mulaiKunci(st.terkunciDetik);
    setSisaCoba(st.sisaPercobaan);
  }, [nomor, mulaiCd, mulaiExp, mulaiKunci]);

  useEffect(() => { void segarkan(); }, [segarkan]);

  const verifikasi = async (nilai: string) => {
    if (proses) return;
    const e = validasiOtp(nilai);
    if (e) return setErr(e);
    setErr(null);
    setInfo(null);
    setProses('verifikasi');
    const r = await verifikasiOtpLogin(nomor, nilai);
    if (r.error) {
      setProses(null);
      setErr(r.error);
      setKode('');
      await segarkan();
      return;
    }
    const rute = await tentukanRute();
    setProses(null);
    if (!rute.ok) return setErr(rute.pesan);
    if (rute.route === 'Akun') navigation.reset({ index: 0, routes: [{ name: 'Akun', params: { belumTertaut: true } }] });
    else navigation.reset({ index: 0, routes: [{ name: rute.route }] });
  };

  const kirimUlang = async () => {
    if (proses || cd > 0) return;
    setErr(null);
    setProses('kirim');
    const r = await kirimOtpLogin(nomor);
    setProses(null);
    if (r.error) setErr(r.error);
    else {
      setKode('');
      setInfo(r.sudahDikirim ? 'Kode sebelumnya masih berlaku.' : 'Kode baru dikirim. Periksa SMS Anda.');
    }
    await segarkan();
  };

  const terkunci = kunci > 0;
  const habis = exp <= 0;

  return (
    <LayarAuth
      judul="Masukkan kode OTP"
      sub={`Kode ${OTP_LENGTH} digit dikirim lewat SMS ke ${samarkanHp(nomor)} (jika nomor terdaftar). Kode berlaku ${OTP_CONFIG.validMinutes} menit.`}
      footer={
        <View style={{ marginTop: 14 }}>
          <TautanTeks teks="← Ganti nomor / metode masuk" onPress={() => navigation.goBack()} style={{ color: '#fff' }} />
        </View>
      }
    >
      <OtpInput value={kode} onChange={(v) => { setKode(v); setErr(null); if (v.length === OTP_LENGTH && !terkunci && !habis) void verifikasi(v); }} onSubmit={() => verifikasi(kode)} disabled={terkunci || !!proses} panjang={OTP_LENGTH} />

      <View style={{ marginTop: 10, alignItems: 'center', gap: 2 }}>
        {terkunci ? (
          <Txt style={{ color: C.er, fontSize: 12 }}>Terlalu banyak kode salah. Coba lagi dalam {formatDurasi(kunci)}.</Txt>
        ) : habis ? (
          <Txt style={{ color: C.wn, fontSize: 12 }}>Kode kedaluwarsa atau belum dikirim. Kirim ulang kode.</Txt>
        ) : (
          <>
            <Txt style={{ color: C.mut, fontSize: 12 }}>Kode berlaku {formatDurasi(exp)} lagi</Txt>
            {sisaCoba < OTP_CONFIG.maxAttempts ? <Txt style={{ color: C.wn, fontSize: 12 }}>Sisa percobaan: {sisaCoba}</Txt> : null}
          </>
        )}
      </View>

      <Banner tipe="err" teks={err} />
      <Banner tipe="ok" teks={info} />

      <View style={{ marginTop: 14 }}>
        <Btn title="Verifikasi" onPress={() => verifikasi(kode)} loading={proses === 'verifikasi'} disabled={!!proses || terkunci || habis || kode.length !== OTP_LENGTH} />
      </View>

      <Pressable
        onPress={kirimUlang}
        disabled={cd > 0 || !!proses || terkunci}
        style={{ marginTop: 14, alignItems: 'center', opacity: cd > 0 || terkunci ? 0.55 : 1 }}
        accessibilityRole="button"
      >
        <Txt style={{ color: C.acc, fontSize: 13, fontWeight: '600' }}>
          {proses === 'kirim' ? 'Mengirim…' : cd > 0 ? `Kirim ulang kode dalam ${cd} detik` : 'Kirim ulang kode'}
        </Txt>
      </Pressable>

      <Txt style={{ color: C.mut, fontSize: 11, textAlign: 'center', marginTop: 12, lineHeight: 16 }}>
        Tidak menerima SMS? Pastikan nomor sudah didaftarkan pengelola kos. Jangan bagikan kode OTP kepada siapa pun.
      </Txt>
    </LayarAuth>
  );
}
