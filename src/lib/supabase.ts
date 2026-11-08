import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Hanya publishable/anon key (aman di frontend). Jangan pernah taruh service role key di sini.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY as string;

export const supabase = createClient(url, key, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

export type Role = 'pemilik' | 'pengelola' | 'penghuni';
export type Profil = { id: string; nama: string; role: Role; nomor_hp: string | null };

// "0812-3456-789" / "+62 812..." -> "+62812..."
export function keE164(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  if (!/^62\d{8,13}$/.test(d)) return null;
  return '+' + d;
}

export const rupiah = (n: number | string) => 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const tglPendek = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)}`; };
export const tglPanjang = (iso: string) => { const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };

let _profil: Profil | null = null;
export const profilSaatIni = () => _profil;
export const isPemilik = () => _profil?.role === 'pemilik';

export async function keluar() {
  _profil = null;
  await supabase.auth.signOut();
}

export async function ambilProfil(): Promise<Profil | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) { _profil = null; return null; }
  const { data } = await supabase.from('profiles').select('id,nama,role,nomor_hp').eq('id', u.user.id).maybeSingle();
  _profil = (data as Profil) ?? null;
  return _profil;
}

export const TARGET = { pemilik: 'PemilikTabs', pengelola: 'AdminTabs', penghuni: 'PenghuniTabs' } as const;
