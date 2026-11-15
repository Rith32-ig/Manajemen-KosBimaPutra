/* Klien Supabase + helper bersama (profil, role, format tampilan).
   Dipakai oleh src/lib/auth.ts dan semua layar. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Konfigurasi Supabase
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Validasi konfigurasi
if (!url || !key) {
  throw new Error(
    'Supabase URL atau Publishable Key tidak ditemukan. Periksa file .env'
  );
}

// Inisialisasi Supabase
export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

/* ============ PROFIL & ROLE ============ */
export type Role = 'pemilik' | 'pengelola' | 'penghuni';

export type Profil = {
  id: string;
  nama: string | null;
  email: string | null;
  nomor_hp: string | null;
  role: Role;
};

// Rute awal per role (penghuni ditangani terpisah di tentukanRute karena perlu cek tautan penghuni)
export const TARGET = {
  pengelola: 'AdminTabs',
  pemilik: 'PemilikTabs',
} as const;

// Cache profil di memori agar layar tidak query berulang
let cacheProfil: Profil | null = null;

// Bersihkan cache saat sesi berakhir / pengguna berganti
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    cacheProfil = null;
  } else if (cacheProfil && session.user.id !== cacheProfil.id) {
    cacheProfil = null;
  }
});

// Baca profil dari tabel profiles (role berasal dari database, bukan dari input pengguna)
export async function ambilProfil(): Promise<Profil | null> {
  const { data: sesi } = await supabase.auth.getSession();
  const uid = sesi.session?.user.id;
  if (!uid) {
    cacheProfil = null;
    return null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id,nama,email,nomor_hp,role')
    .eq('id', uid)
    .maybeSingle();
  if (error || !data) {
    cacheProfil = null;
    return null;
  }
  cacheProfil = data as Profil;
  return cacheProfil;
}

// Profil dari cache (tanpa query). null bila belum pernah dimuat.
export const profilSaatIni = (): Profil | null => cacheProfil;

// Pemilik hanya boleh melihat (read-only) di layar pengelola
export const isPemilik = (): boolean => cacheProfil?.role === 'pemilik';

export async function keluar(): Promise<void> {
  cacheProfil = null;
  await supabase.auth.signOut();
}

/* ============ FORMAT TAMPILAN (tanpa Intl, aman di Hermes Android) ============ */
export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// 1200000 -> "Rp 1.200.000"
export const rupiah = (n: number | string | null | undefined): string => {
  const v = Math.round(Number(n) || 0);
  const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '-' : ''}Rp ${s}`;
};

// Menerima 'YYYY-MM-DD' (tanpa geser zona waktu), timestamp ISO, atau Date
const keTanggal = (d: string | Date | null | undefined): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const t = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  return isNaN(t.getTime()) ? null : t;
};

// "15 Januari 2026"
export const tglPanjang = (d: string | Date | null | undefined): string => {
  const t = keTanggal(d);
  return t ? `${t.getDate()} ${BULAN[t.getMonth()]} ${t.getFullYear()}` : '-';
};

// "15 Jan 2026"
export const tglPendek = (d: string | Date | null | undefined): string => {
  const t = keTanggal(d);
  return t ? `${t.getDate()} ${BULAN_PENDEK[t.getMonth()]} ${t.getFullYear()}` : '-';
};