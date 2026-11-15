/* Semua alur autentikasi yang memanggil Supabase Auth.
   Logika murni (validasi, pembatas OTP, teks error) ada di auth-core.ts. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { AuthErr } from './auth-core';
import {
  buatOtpGuard,
  formatDurasi,
  keE164, pesanAuth,
  validasiEmail,
  validasiKonfirmasi,
  validasiOtp,
  validasiPassword,
} from './auth-core';
import { ambilProfil, supabase, TARGET } from './supabase';

// Menutup jendela popup OAuth di web setelah redirect (dilewati saat render server/SSR).
if (Platform.OS !== 'web' || typeof window !== 'undefined') WebBrowser.maybeCompleteAuthSession();

export type Hasil = { error: string | null };
export const otpGuard = buatOtpGuard(AsyncStorage);

/* URL tujuan balik dari Google / email verifikasi / reset password.
   Native: kelompok4://auth/callback (atau exp://… di Expo Go). Web: https://domain-anda/auth/callback.
   URL ini HARUS terdaftar di Supabase > Authentication > URL Configuration > Redirect URLs. */
export const redirectUrl = (query?: Record<string, string>) => {
  const url = Linking.createURL(
    'auth/callback',
    query ? { queryParams: query } : undefined
  );

  console.log('REDIRECT URL:', url);

  return url;
};

const galat = (e: AuthErr): Hasil => ({ error: pesanAuth(e) });

/* ============ LOGIN / REGISTRASI EMAIL ============ */
export async function masukEmail(email: string, password: string): Promise<Hasil> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  return error ? galat(error) : { error: null };
}

export async function masukHpPassword(nomorE164: string, password: string): Promise<Hasil> {
  const { error } = await supabase.auth.signInWithPassword({ phone: nomorE164, password });
  return error ? galat(error) : { error: null };
}

export async function daftarEmail(i: { nama: string; email: string; password: string }): Promise<Hasil & { perluVerifikasi: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: i.email.trim().toLowerCase(),
    password: i.password,
    options: { data: { nama: i.nama.trim() }, emailRedirectTo: redirectUrl({ mode: 'verify' }) },
  });
  if (error) return { ...galat(error), perluVerifikasi: false };
  // Email sudah terdaftar (mis. lewat Google): Supabase tidak membuat akun baru dan mengembalikan
  // user dengan identities kosong -> tidak ada akun/profil ganda.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: 'Email sudah terdaftar. Silakan masuk, atau pakai "Lupa password" bila lupa/ belum punya password.', perluVerifikasi: false };
  }
  return { error: null, perluVerifikasi: !data.session };
}

export async function kirimResetPassword(email: string): Promise<Hasil> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: redirectUrl({ mode: 'reset' }),
  });
  return error ? galat(error) : { error: null };
}


/* ============ GOOGLE (Supabase OAuth, PKCE) ============ */

export async function masukGoogle(): Promise<Hasil & { menunggu?: boolean }> {
  const redirectTo = redirectUrl();
  const web = Platform.OS === 'web';

  console.log('REDIRECT YANG DIMINTA:', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: !web,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error) {
    console.log('OAUTH ERROR:', error);
    return galat(error);
  }

  if (web) return { error: null, menunggu: true };

  if (!data.url) {
    return { error: 'Tidak dapat membuka Google. Coba lagi.' };
  }

  const oauthUrl = new URL(data.url);

  console.log(
    'REDIRECT YANG DIKIRIM SUPABASE:',
    oauthUrl.searchParams.get('redirect_to')
  );

  const hasil = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  console.log('HASIL OAUTH:', hasil.type);

  if (hasil.type !== 'success') {
    return { error: 'Login Google dibatalkan.' };
  }

  return selesaikanDariUrl(hasil.url);
}



// Menukar ?code=… (PKCE) menjadi sesi. Dipakai alur native dan rute auth/callback.
export async function selesaikanDariUrl(url: string): Promise<Hasil> {
  const q = (Linking.parse(url).queryParams ?? {}) as Record<string, unknown>;
  const pesan = (q.error_description || q.error) as string | undefined;
  if (pesan) return { error: 'Login gagal: ' + String(pesan).replace(/\+/g, ' ') };
  if (typeof q.code === 'string' && q.code) return tukarKode(q.code);
  const frag = url.includes('#') ? url.split('#')[1] : '';
  if (frag) {
    const p = new URLSearchParams(frag);
    const at = p.get('access_token');
    const rt = p.get('refresh_token');
    if (at && rt) {
      const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
      return error ? galat(error) : { error: null };
    }
  }
  return { error: 'Tautan tidak berisi kode login.' };
}

export async function tukarKode(code: string): Promise<Hasil> {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? galat(error) : { error: null };
}

/* ============ OTP SMS (Supabase Phone Auth) ============ */
// shouldCreateUser:false -> OTP hanya untuk akun yang SUDAH ada (dibuat Pengelola). Mencegah pendaftaran liar
// dan pemborosan kredit SMS ke nomor acak.
export async function kirimOtpLogin(nomorMentah: string): Promise<{ error: string | null; nomor?: string; sudahDikirim?: boolean }> {
  const nomor = keE164(nomorMentah);
  if (!nomor) return { error: 'Masukkan nomor HP valid dengan format +62…' };
  const st = await otpGuard.status(nomor);
  if (st.terkunciDetik > 0) return { error: `Terlalu banyak kode salah. Coba lagi dalam ${formatDurasi(st.terkunciDetik)}.`, nomor };
  // kode sebelumnya masih dalam jeda kirim-ulang -> jangan kirim SMS lagi, cukup lanjut ke layar OTP
  if (st.cooldownDetik > 0 && st.kedaluwarsaDetik > 0) return { error: null, nomor, sudahDikirim: true };
  if (st.sisaKirim <= 0) return { error: 'Batas permintaan kode per jam tercapai. Coba lagi nanti.', nomor };

  const { error } = await supabase.auth.signInWithOtp({ phone: nomor, options: { shouldCreateUser: false, channel: 'sms' } });
  if (error) {
    const kode = (error.code || '').toLowerCase();
    const m = (error.message || '').toLowerCase();
    // Nomor tidak terdaftar: perlakukan seperti terkirim (anti-enumerasi nomor). Verifikasi akan gagal wajar.
    if (kode === 'otp_disabled' || m.includes('signups not allowed')) {
      await otpGuard.catatKirim(nomor);
      return { error: null, nomor };
    }
    return { error: pesanAuth(error), nomor };
  }
  await otpGuard.catatKirim(nomor);
  return { error: null, nomor };
}

export async function verifikasiOtpLogin(nomor: string, kode: string): Promise<Hasil> {
  const e = validasiOtp(kode);
  if (e) return { error: e };
  const st = await otpGuard.status(nomor);
  if (st.terkunciDetik > 0) return { error: `Terlalu banyak kode salah. Coba lagi dalam ${formatDurasi(st.terkunciDetik)}.` };
  if (st.kedaluwarsaDetik <= 0) return { error: 'Kode kedaluwarsa. Minta kode baru.' };

  const { error } = await supabase.auth.verifyOtp({ phone: nomor, token: kode, type: 'sms' });
  if (error) {
    const s2 = await otpGuard.catatGagal(nomor);
    if (s2.terkunciDetik > 0) return { error: `Terlalu banyak kode salah. Dikunci ${formatDurasi(s2.terkunciDetik)}.` };
    return { error: `${pesanAuth(error)} Sisa percobaan: ${s2.sisaPercobaan}.` };
  }
  await otpGuard.reset(nomor);
  return { error: null };
}

/* ============ SETELAH LOGIN: ke mana pengguna diarahkan ============ */
export type Rute =
  | { ok: true; route: 'AdminTabs' | 'PemilikTabs' | 'PenghuniTabs'; belumTertaut?: false }
  | { ok: true; route: 'Akun'; belumTertaut: true }
  | { ok: false; pesan: string };

export async function tentukanRute(): Promise<Rute> {
  const profil = await ambilProfil(); // role dari tabel profiles, bukan dari input pengguna
  if (!profil) {
    await supabase.auth.signOut();
    return { ok: false, pesan: 'Profil tidak ditemukan. Hubungi pengelola kos.' };
  }
  if (profil.role !== 'penghuni') return { ok: true, route: TARGET[profil.role] };

  // Penghuni: cek berdasarkan profile_id (tidak bergantung pada RLS untuk membatasi baris)
  const { data, error } = await supabase.from('penghuni').select('id,status_penghuni').eq('profile_id', profil.id);
  if (error) return { ok: false, pesan: pesanAuth(error) };
  if (!data || data.length === 0) return { ok: true, route: 'Akun', belumTertaut: true }; // akun baru, belum dihubungkan Pengelola
  if (data.some((r) => r.status_penghuni === 'Aktif')) return { ok: true, route: 'PenghuniTabs' };
  await supabase.auth.signOut();
  return { ok: false, pesan: 'Akun sudah tidak aktif. Hubungi pengelola kos.' };
}

/* ============ EDIT AKUN (password / email / nomor HP) ============ */
export async function ambilAkun(): Promise<User | null> {
  const { data } = await supabase.auth.getUser(); // data terbaru dari server
  return data.user ?? null;
}

// Verifikasi identitas = login ulang dengan password saat ini (re-authentication).
export async function verifikasiIdentitas(passwordSaatIni: string): Promise<Hasil> {
  if (!passwordSaatIni) return { error: 'Password saat ini wajib diisi' };
  const u = await ambilAkun();
  if (!u) return { error: 'Sesi berakhir. Silakan masuk kembali.' };
  const cred = u.email ? { email: u.email, password: passwordSaatIni } : u.phone ? { phone: '+' + u.phone.replace(/^\+/, ''), password: passwordSaatIni } : null;
  if (!cred) return { error: 'Akun tidak memiliki email atau nomor HP.' };
  const { error } = await supabase.auth.signInWithPassword(cred);
  if (error) {
    return { error: (error.code || '') === 'invalid_credentials' ? 'Password saat ini salah.' : pesanAuth(error) };
  }
  return { error: null };
}

export async function ubahPassword(i: { passwordLama: string; passwordBaru: string; konfirmasi: string }): Promise<Hasil> {
  const e = validasiPassword(i.passwordBaru) || validasiKonfirmasi(i.passwordBaru, i.konfirmasi);
  if (e) return { error: e };
  if (i.passwordBaru === i.passwordLama) return { error: 'Password baru tidak boleh sama dengan password lama.' };
  const v = await verifikasiIdentitas(i.passwordLama);
  if (v.error) return v;
  const { error } = await supabase.auth.updateUser({ password: i.passwordBaru });
  return error ? galat(error) : { error: null };
}

// Untuk akun tanpa password (Google / OTP) atau lupa password: kode verifikasi dikirim ke email/HP akun.
export async function kirimKodeVerifikasi(): Promise<Hasil> {
  const { error } = await supabase.auth.reauthenticate();
  return error ? galat(error) : { error: null };
}

export async function ubahPasswordDenganKode(i: { kode: string; passwordBaru: string; konfirmasi: string }): Promise<Hasil> {
  const e = validasiPassword(i.passwordBaru) || validasiKonfirmasi(i.passwordBaru, i.konfirmasi);
  if (e) return { error: e };
  if (!i.kode.trim()) return { error: 'Kode verifikasi wajib diisi' };
  const { error } = await supabase.auth.updateUser({ password: i.passwordBaru, nonce: i.kode.trim() });
  return error ? galat(error) : { error: null };
}

// Dipakai layar "atur password baru" setelah tautan reset email (sesi recovery sudah aktif).
export async function setPasswordBaru(passwordBaru: string, konfirmasi: string): Promise<Hasil> {
  const e = validasiPassword(passwordBaru) || validasiKonfirmasi(passwordBaru, konfirmasi);
  if (e) return { error: e };
  const { error } = await supabase.auth.updateUser({ password: passwordBaru });
  return error ? galat(error) : { error: null };
}

export async function ubahEmail(i: { passwordLama: string; emailBaru: string }): Promise<Hasil> {
  const e = validasiEmail(i.emailBaru);
  if (e) return { error: e };
  const u = await ambilAkun();
  if (u?.email && u.email.toLowerCase() === i.emailBaru.trim().toLowerCase()) return { error: 'Email baru sama dengan email saat ini.' };
  const v = await verifikasiIdentitas(i.passwordLama);
  if (v.error) return v;
  // Email baru baru berlaku setelah tautan konfirmasi diklik. Setelah itu trigger database
  // sync_profile_from_auth menyalin ke profiles.email.
  const { error } = await supabase.auth.updateUser({ email: i.emailBaru.trim().toLowerCase() }, { emailRedirectTo: redirectUrl({ mode: 'email' }) });
  return error ? galat(error) : { error: null };
}

export async function mulaiUbahHp(i: { passwordLama: string; nomorBaru: string }): Promise<{ error: string | null; nomor?: string }> {
  const nomor = keE164(i.nomorBaru);
  if (!nomor) return { error: 'Masukkan nomor HP valid dengan format +62…' };
  const u = await ambilAkun();
  if (u?.phone && '+' + u.phone.replace(/^\+/, '') === nomor) return { error: 'Nomor baru sama dengan nomor saat ini.' };
  const st = await otpGuard.status(nomor);
  if (st.terkunciDetik > 0) return { error: `Terlalu banyak kode salah. Coba lagi dalam ${formatDurasi(st.terkunciDetik)}.` };
  if (st.cooldownDetik > 0) return { error: `Tunggu ${formatDurasi(st.cooldownDetik)} sebelum meminta kode lagi.` };
  if (st.sisaKirim <= 0) return { error: 'Batas permintaan kode per jam tercapai. Coba lagi nanti.' };
  const v = await verifikasiIdentitas(i.passwordLama);
  if (v.error) return v;
  const { error } = await supabase.auth.updateUser({ phone: nomor }); // Supabase mengirim OTP ke nomor BARU
  if (error) return { error: pesanAuth(error) };
  await otpGuard.catatKirim(nomor);
  return { error: null, nomor };
}

export async function selesaikanUbahHp(nomor: string, kode: string): Promise<Hasil> {
  const e = validasiOtp(kode);
  if (e) return { error: e };
  const st = await otpGuard.status(nomor);
  if (st.terkunciDetik > 0) return { error: `Terlalu banyak kode salah. Coba lagi dalam ${formatDurasi(st.terkunciDetik)}.` };
  if (st.kedaluwarsaDetik <= 0) return { error: 'Kode kedaluwarsa. Minta kode baru.' };
  const { error } = await supabase.auth.verifyOtp({ phone: nomor, token: kode, type: 'phone_change' });
  if (error) {
    const s2 = await otpGuard.catatGagal(nomor);
    if (s2.terkunciDetik > 0) return { error: `Terlalu banyak kode salah. Dikunci ${formatDurasi(s2.terkunciDetik)}.` };
    return { error: `${pesanAuth(error)} Sisa percobaan: ${s2.sisaPercobaan}.` };
  }
  await otpGuard.reset(nomor);
  await ambilProfil(); // profiles.nomor_hp sudah disalin trigger database -> segarkan cache profil
  return { error: null };
}

// Menghubungkan akun Google ke akun yang sedang login (tanpa membuat akun / profil kedua).
// Membutuhkan "Allow manual linking" aktif di dashboard Supabase.
export async function hubungkanGoogle(): Promise<Hasil & { menunggu?: boolean }> {
  const redirectTo = redirectUrl({ mode: 'link' });
  const web = Platform.OS === 'web';
  const { data, error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo, skipBrowserRedirect: !web } });
  if (error) return galat(error);
  if (web) return { error: null, menunggu: true };
  if (!data?.url) return { error: 'Tidak dapat membuka Google. Coba lagi.' };
  const hasil = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (hasil.type !== 'success') return { error: 'Penghubungan Google dibatalkan.' };
  return selesaikanDariUrl(hasil.url);
}

