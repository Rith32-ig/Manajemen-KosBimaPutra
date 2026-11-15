/* === SCREEN: AKUN SAYA (edit password, email, nomor HP) ===
   Setiap perubahan sensitif WAJIB verifikasi identitas (password saat ini, atau kode verifikasi
   lewat email/SMS untuk akun tanpa password). Perubahan tersimpan di Supabase Auth; trigger database
   sync_profile_from_auth menyalin email / nomor HP ke tabel profiles (dan penghuni aktif untuk nomor HP). */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { IconName } from '../components/auth-ui';
import { Banner, BarKekuatan, Btn, C, Field, OtpInput, Txt, useHitungMundur } from '../components/auth-ui';
import {
  ambilAkun, hubungkanGoogle, kirimKodeVerifikasi, mulaiUbahHp, otpGuard, selesaikanUbahHp, tentukanRute,
  ubahEmail, ubahPassword, ubahPasswordDenganKode,
} from '../lib/auth';
import { OTP_CONFIG, OTP_LENGTH, formatDurasi, kekuatanPassword, samarkanEmail, samarkanHp } from '../lib/auth-core';
import type { Profil } from '../lib/supabase';
import { ambilProfil, keluar, supabase } from '../lib/supabase';
import type { RootStackParamList } from './RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Akun'>;
type Pesan = { tipe: 'ok' | 'err'; teks: string } | null;

const ROLE: Record<string, string> = { pemilik: 'Pemilik', pengelola: 'Pengelola', penghuni: 'Penghuni' };

/* ---------- kartu bagian yang bisa dibuka-tutup ---------- */
function Bagian({ judul, ikon, children, buka, onToggle }: { judul: string; ikon: IconName; children: ReactNode; buka: boolean; onToggle: () => void }) {
  return (
    <View style={st.kartu}>
      <Pressable onPress={onToggle} style={st.kartuHead} accessibilityRole="button" accessibilityState={{ expanded: buka }}>
        <View style={st.ikon}><Ionicons name={ikon} size={18} color={C.acc} /></View>
        <Txt style={{ flex: 1, fontSize: 15, fontWeight: '700' }}>{judul}</Txt>
        <Ionicons name={buka ? 'chevron-up' : 'chevron-down'} size={18} color={C.mut} />
      </Pressable>
      {buka ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View> : null}
    </View>
  );
}

/* ---------- ubah password ---------- */
function UbahPasswordForm() {
  const [mode, setMode] = useState<'password' | 'kode'>('password');
  const [lama, setLama] = useState('');
  const [kode, setKode] = useState('');
  const [baru, setBaru] = useState('');
  const [ulang, setUlang] = useState('');
  const [kodeTerkirim, setKodeTerkirim] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [cd, mulaiCd] = useHitungMundur(0);

  const reset = () => { setLama(''); setKode(''); setBaru(''); setUlang(''); };

  const simpan = async () => {
    if (loading) return;
    setLoading(true);
    setPesan(null);
    const r = mode === 'password'
      ? await ubahPassword({ passwordLama: lama, passwordBaru: baru, konfirmasi: ulang })
      : await ubahPasswordDenganKode({ kode, passwordBaru: baru, konfirmasi: ulang });
    setLoading(false);
    if (r.error) return setPesan({ tipe: 'err', teks: r.error });
    reset();
    setKodeTerkirim(false);
    setPesan({ tipe: 'ok', teks: 'Password berhasil diubah. Gunakan password baru saat masuk berikutnya.' });
  };

  const kirimKode = async () => {
    if (loading || cd > 0) return;
    setLoading(true);
    setPesan(null);
    const r = await kirimKodeVerifikasi();
    setLoading(false);
    if (r.error) return setPesan({ tipe: 'err', teks: r.error });
    setKodeTerkirim(true);
    mulaiCd(60);
    setPesan({ tipe: 'ok', teks: 'Kode verifikasi dikirim ke email/nomor HP akun Anda.' });
  };

  return (
    <View>
      {mode === 'password' ? (
        <Field label="Password saat ini" secureTextEntry value={lama} onChangeText={setLama} autoComplete="current-password" textContentType="password" />
      ) : (
        <>
          <Btn title={cd > 0 ? `Kirim ulang kode dalam ${cd} detik` : kodeTerkirim ? 'Kirim ulang kode' : 'Kirim kode verifikasi'} variant="ghost" icon="mail" onPress={kirimKode} loading={loading && !kodeTerkirim} disabled={loading || cd > 0} style={{ marginTop: 12 }} />
          <Field label="Kode verifikasi" value={kode} onChangeText={setKode} keyboardType="number-pad" placeholder="Kode dari email/SMS" textContentType="oneTimeCode" />
        </>
      )}
      <Field label="Password baru" secureTextEntry value={baru} onChangeText={setBaru} hint="Minimal 8 karakter, kombinasi huruf dan angka" autoComplete="new-password" textContentType="newPassword" />
      <BarKekuatan nilai={kekuatanPassword(baru)} />
      <Field label="Ulangi password baru" secureTextEntry value={ulang} onChangeText={setUlang} autoComplete="new-password" textContentType="newPassword" />
      <Banner tipe={pesan?.tipe ?? 'info'} teks={pesan?.teks} />
      <Btn title="Simpan password" onPress={simpan} loading={loading && (mode === 'password' || kodeTerkirim)} disabled={loading} style={{ marginTop: 14 }} />
      <Pressable onPress={() => { setMode(mode === 'password' ? 'kode' : 'password'); setPesan(null); reset(); }} hitSlop={8} style={{ marginTop: 12 }}>
        <Txt style={{ color: C.acc, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
          {mode === 'password' ? 'Lupa password / belum punya password? Verifikasi dengan kode' : '← Verifikasi dengan password saat ini'}
        </Txt>
      </Pressable>
    </View>
  );
}

/* ---------- ubah email ---------- */
function UbahEmailForm({ user, onSelesai }: { user: User | null; onSelesai: () => void }) {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('');
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);

  const kirim = async () => {
    if (loading) return;
    setLoading(true);
    setPesan(null);
    const r = await ubahEmail({ passwordLama: lama, emailBaru: baru });
    setLoading(false);
    if (r.error) return setPesan({ tipe: 'err', teks: r.error });
    setLama('');
    setPesan({ tipe: 'ok', teks: `Tautan konfirmasi dikirim ke ${baru.trim().toLowerCase()}. Email baru berlaku setelah tautan diklik (jika diminta, konfirmasi juga di email lama).` });
    onSelesai();
  };

  return (
    <View>
      <Txt style={{ color: C.mut, fontSize: 12, marginTop: 10 }}>
        Email saat ini: {user?.email ? samarkanEmail(user.email) : 'belum ada'}
        {user?.new_email ? `\nMenunggu konfirmasi: ${samarkanEmail(user.new_email)}` : ''}
      </Txt>
      <Field label="Email baru" placeholder="nama@email.com" value={baru} onChangeText={setBaru} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password saat ini (verifikasi identitas)" secureTextEntry value={lama} onChangeText={setLama} autoComplete="current-password" textContentType="password" hint="Belum punya password? Atur dulu di bagian Ubah Password dengan kode verifikasi." />
      <Banner tipe={pesan?.tipe ?? 'info'} teks={pesan?.teks} />
      <Btn title="Kirim tautan konfirmasi" onPress={kirim} loading={loading} style={{ marginTop: 14 }} />
    </View>
  );
}

/* ---------- ubah nomor HP (OTP ke nomor baru) ---------- */
function UbahHpForm({ user, onSelesai }: { user: User | null; onSelesai: () => void }) {
  const [lama, setLama] = useState('');
  const [baru, setBaru] = useState('+62');
  const [nomor, setNomor] = useState<string | null>(null); // terisi = tahap OTP
  const [kode, setKode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [cd, mulaiCd] = useHitungMundur(0);
  const [kunci, mulaiKunci] = useHitungMundur(0);

  const segarkan = useCallback(async (n: string) => {
    const s = await otpGuard.status(n);
    mulaiCd(s.cooldownDetik);
    mulaiKunci(s.terkunciDetik);
  }, [mulaiCd, mulaiKunci]);

  const mulai = async () => {
    if (loading) return;
    setLoading(true);
    setPesan(null);
    const r = await mulaiUbahHp({ passwordLama: lama, nomorBaru: baru });
    setLoading(false);
    if (r.error || !r.nomor) return setPesan({ tipe: 'err', teks: r.error ?? 'Gagal mengirim kode.' });
    setNomor(r.nomor);
    setLama('');
    setKode('');
    await segarkan(r.nomor);
    setPesan({ tipe: 'ok', teks: `Kode OTP dikirim ke ${samarkanHp(r.nomor)}. Berlaku ${OTP_CONFIG.validMinutes} menit.` });
  };

  const kirimUlang = async () => {
    if (!nomor || loading || cd > 0) return;
    setLoading(true);
    setPesan(null);
    // updateUser({phone}) tanpa verifikasi password lagi: identitas sudah diverifikasi di tahap pertama
    const { error } = await supabase.auth.updateUser({ phone: nomor });
    if (!error) await otpGuard.catatKirim(nomor);
    setLoading(false);
    await segarkan(nomor);
    setPesan(error ? { tipe: 'err', teks: 'Gagal mengirim ulang kode. Coba lagi beberapa saat.' } : { tipe: 'ok', teks: 'Kode baru dikirim.' });
  };

  const verifikasi = async (nilai: string) => {
    if (!nomor || loading) return;
    setLoading(true);
    setPesan(null);
    const r = await selesaikanUbahHp(nomor, nilai);
    setLoading(false);
    if (r.error) {
      setKode('');
      await segarkan(nomor);
      return setPesan({ tipe: 'err', teks: r.error });
    }
    setPesan({ tipe: 'ok', teks: `Nomor HP berhasil diubah ke ${samarkanHp(nomor)}.` });
    setNomor(null);
    setBaru('+62');
    onSelesai();
  };

  if (nomor) {
    return (
      <View>
        <OtpInput value={kode} onChange={(v) => { setKode(v); if (v.length === OTP_LENGTH && kunci <= 0) void verifikasi(v); }} onSubmit={() => verifikasi(kode)} disabled={kunci > 0 || loading} panjang={OTP_LENGTH} />
        {kunci > 0 ? <Txt style={{ color: C.er, fontSize: 12, textAlign: 'center', marginTop: 8 }}>Terlalu banyak kode salah. Coba lagi dalam {formatDurasi(kunci)}.</Txt> : null}
        <Banner tipe={pesan?.tipe ?? 'info'} teks={pesan?.teks} />
        <Btn title="Verifikasi nomor" onPress={() => verifikasi(kode)} loading={loading} disabled={kode.length !== OTP_LENGTH || kunci > 0} style={{ marginTop: 14 }} />
        <Pressable onPress={kirimUlang} disabled={cd > 0 || loading} style={{ marginTop: 12, opacity: cd > 0 ? 0.55 : 1 }} accessibilityRole="button">
          <Txt style={{ color: C.acc, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{cd > 0 ? `Kirim ulang kode dalam ${cd} detik` : 'Kirim ulang kode'}</Txt>
        </Pressable>
        <Pressable onPress={() => { setNomor(null); setPesan(null); }} hitSlop={8} style={{ marginTop: 10 }}>
          <Txt style={{ color: C.mut, fontSize: 12, textAlign: 'center' }}>Batalkan / ganti nomor</Txt>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Txt style={{ color: C.mut, fontSize: 12, marginTop: 10 }}>Nomor saat ini: {user?.phone ? samarkanHp(user.phone) : 'belum ada'}</Txt>
      <Field label="Nomor HP baru" placeholder="+62 812-3456-7890" value={baru} onChangeText={setBaru} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" hint="Kode OTP dikirim lewat SMS ke nomor baru." />
      <Field label="Password saat ini (verifikasi identitas)" secureTextEntry value={lama} onChangeText={setLama} autoComplete="current-password" textContentType="password" />
      <Banner tipe={pesan?.tipe ?? 'info'} teks={pesan?.teks} />
      <Btn title="Kirim kode OTP" icon="chatbubble-ellipses" onPress={mulai} loading={loading} style={{ marginTop: 14 }} />
    </View>
  );
}

/* ---------- layar ---------- */
export default function AkunScreen({ navigation, route }: Props) {
  const [belumTertaut, setBelumTertaut] = useState(!!route.params?.belumTertaut);
  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [buka, setBuka] = useState<'pass' | 'email' | 'hp' | null>(null);
  const [pesanGoogle, setPesanGoogle] = useState<Pesan>(null);
  const [lGoogle, setLGoogle] = useState(false);

  const muat = useCallback(async () => {
    const [u, p] = await Promise.all([ambilAkun(), ambilProfil()]);
    setUser(u);
    setProfil(p);
    setMemuat(false);
  }, []);
  useEffect(() => { void muat(); }, [muat]);
  useEffect(() => {
    // penghuni yang belum ditautkan Pengelola (mis. akun baru dari email/Google)
    tentukanRute().then((r) => setBelumTertaut(r.ok && r.route === 'Akun'));
  }, []);

  const kembali = async () => {
    if (navigation.canGoBack()) return navigation.goBack();
    const r = await tentukanRute();
    if (r.ok && r.route !== 'Akun') navigation.reset({ index: 0, routes: [{ name: r.route }] });
  };

  const doKeluar = async () => {
    await keluar();
    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  const punyaGoogle = !!user?.identities?.some((i) => i.provider === 'google');
  const metode = (user?.identities ?? []).map((i) => (i.provider === 'google' ? 'Google' : i.provider === 'phone' ? 'Nomor HP' : 'Email')).join(' · ');

  const sambungGoogle = async () => {
    if (lGoogle) return;
    setLGoogle(true);
    setPesanGoogle(null);
    const r = await hubungkanGoogle();
    setLGoogle(false);
    if (r.menunggu) return;
    if (r.error) return setPesanGoogle({ tipe: 'err', teks: r.error });
    setPesanGoogle({ tipe: 'ok', teks: 'Akun Google berhasil dihubungkan ke akun ini.' });
    void muat();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {!belumTertaut ? (
              <Pressable onPress={kembali} hitSlop={10} style={st.back} accessibilityLabel="Kembali"><Ionicons name="arrow-back" size={18} color={C.acc} /></Pressable>
            ) : null}
            <Txt style={{ fontSize: 22, fontWeight: '700', letterSpacing: -0.4 }}>Akun Saya</Txt>
          </View>

          {belumTertaut ? (
            <Banner tipe="info" teks="Akun Anda sudah dibuat, tetapi belum terhubung dengan data penghuni. Minta pengelola kos menghubungkan akun ini. Sampai saat itu fitur penghuni belum dapat dipakai." style={{ marginTop: 0, marginBottom: 14 }} />
          ) : null}

          <View style={st.kartu}>
            {memuat ? (
              <ActivityIndicator color={C.acc} style={{ margin: 20 }} />
            ) : (
              <View style={{ padding: 16, gap: 6 }}>
                <Txt style={{ fontSize: 16, fontWeight: '700' }}>{profil?.nama ?? '-'}</Txt>
                <Txt style={{ color: C.mut, fontSize: 12 }}>Peran: {profil ? ROLE[profil.role] : '-'}</Txt>
                <Txt style={{ color: C.mut, fontSize: 12 }}>Email: {user?.email ?? '-'}{user?.email && !user.email_confirmed_at ? ' (belum diverifikasi)' : ''}</Txt>
                <Txt style={{ color: C.mut, fontSize: 12 }}>Nomor HP: {user?.phone ? '+' + user.phone.replace(/^\+/, '') : '-'}</Txt>
                <Txt style={{ color: C.mut, fontSize: 12 }}>Metode masuk: {metode || '-'}</Txt>
              </View>
            )}
          </View>

          <View style={{ height: 12 }} />
          <Bagian judul="Ubah Password" ikon="lock-closed" buka={buka === 'pass'} onToggle={() => setBuka(buka === 'pass' ? null : 'pass')}><UbahPasswordForm /></Bagian>
          <View style={{ height: 12 }} />
          <Bagian judul="Ubah Email" ikon="mail" buka={buka === 'email'} onToggle={() => setBuka(buka === 'email' ? null : 'email')}><UbahEmailForm user={user} onSelesai={muat} /></Bagian>
          <View style={{ height: 12 }} />
          <Bagian judul="Ubah Nomor HP" ikon="call" buka={buka === 'hp'} onToggle={() => setBuka(buka === 'hp' ? null : 'hp')}><UbahHpForm user={user} onSelesai={muat} /></Bagian>

          {!memuat && !punyaGoogle ? (
            <View style={[st.kartu, { padding: 16, marginTop: 12 }]}>
              <Txt style={{ fontSize: 15, fontWeight: '700' }}>Hubungkan Google</Txt>
              <Txt style={{ color: C.mut, fontSize: 12, marginTop: 4, lineHeight: 17 }}>Tambahkan Google sebagai cara masuk ke akun yang sama (tidak membuat akun baru).</Txt>
              <Banner tipe={pesanGoogle?.tipe ?? 'info'} teks={pesanGoogle?.teks} />
              <Btn title="Hubungkan akun Google" variant="google" icon="logo-google" onPress={sambungGoogle} loading={lGoogle} style={{ marginTop: 12 }} />
            </View>
          ) : null}

          <Btn title="Keluar" variant="danger" icon="log-out-outline" onPress={doKeluar} style={{ marginTop: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = {
  kartu: { backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 16, overflow: 'hidden' as const },
  kartuHead: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, padding: 16 },
  ikon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.accb, alignItems: 'center' as const, justifyContent: 'center' as const },
  back: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.acc, alignItems: 'center' as const, justifyContent: 'center' as const },
};
