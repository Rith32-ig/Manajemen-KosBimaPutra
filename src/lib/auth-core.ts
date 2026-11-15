/* Logika autentikasi MURNI (tanpa React Native / Supabase) agar mudah diuji.
   Dipakai oleh src/lib/auth.ts dan layar Login / Register / OTP / Akun. */

/* ============ KONFIGURASI OTP (non-rahasia, boleh lewat env EXPO_PUBLIC_*) ============ */
const angka = (v: string | undefined, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
};

export const OTP_LENGTH = 6; // samakan dengan "OTP Length" di dashboard Supabase (default 6)

export type OtpConfig = {
  resendSeconds: number;   // jeda minimal kirim ulang
  maxSendPerHour: number;  // batas kirim per nomor per jam (sisi aplikasi)
  maxAttempts: number;     // salah kode berturut-turut sebelum dikunci
  lockMinutes: number;     // lama kunci setelah salah terlalu banyak
  validMinutes: number;    // masa berlaku kode (samakan dengan "OTP Expiry" di dashboard)
};

export const OTP_CONFIG: OtpConfig = {
  resendSeconds: angka(process.env.EXPO_PUBLIC_OTP_RESEND_SECONDS, 60),
  maxSendPerHour: angka(process.env.EXPO_PUBLIC_OTP_MAX_SEND_PER_HOUR, 5),
  maxAttempts: angka(process.env.EXPO_PUBLIC_OTP_MAX_ATTEMPTS, 5),
  lockMinutes: angka(process.env.EXPO_PUBLIC_OTP_LOCK_MINUTES, 5),
  validMinutes: angka(process.env.EXPO_PUBLIC_OTP_VALID_MINUTES, 5),
};

/* ============ NOMOR HP ============ */
// "0812-3456-789" / "+62 812..." / "812..." -> "+62812..."; tidak valid -> null
export function keE164(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  if (!/^62\d{8,13}$/.test(d)) return null;
  return '+' + d;
}

/* ============ VALIDASI ============ */
export const validasiEmail = (v: string): string | null => {
  const e = v.trim();
  if (!e) return 'Email wajib diisi';
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'Format email tidak valid';
  return null;
};

export const validasiPassword = (p: string): string | null => {
  if (!p) return 'Password wajib diisi';
  if (p.length < 8) return 'Password minimal 8 karakter';
  if (p.length > 72) return 'Password maksimal 72 karakter';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'Password harus mengandung huruf dan angka';
  return null;
};

export const validasiKonfirmasi = (p: string, k: string): string | null =>
  !k ? 'Ulangi password baru' : p !== k ? 'Konfirmasi password tidak sama' : null;

export const validasiNama = (n: string): string | null => {
  const t = n.trim();
  if (t.length < 2) return 'Nama minimal 2 karakter';
  if (t.length > 60) return 'Nama maksimal 60 karakter';
  return null;
};

export const validasiOtp = (kode: string): string | null =>
  new RegExp(`^\\d{${OTP_LENGTH}}$`).test(kode) ? null : `Kode harus ${OTP_LENGTH} digit angka`;

// 0 = kosong, 1 = lemah ... 4 = kuat (hanya indikator tampilan)
export function kekuatanPassword(p: string): 0 | 1 | 2 | 3 | 4 {
  if (!p) return 0;
  let skor = 0;
  if (p.length >= 8) skor++;
  if (p.length >= 12) skor++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) skor++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) skor++;
  return Math.min(4, Math.max(1, skor)) as 1 | 2 | 3 | 4;
}

/* ============ PEMBATAS OTP (sisi aplikasi) ============
   Menyimpan jejak kirim/gagal per nomor di penyimpanan lokal (AsyncStorage / localStorage di web).
   CATATAN: ini hanya lapisan kenyamanan + pengurangan spam dari perangkat jujur. Perlindungan
   yang sebenarnya ada di server Supabase (rate limit SMS, OTP expiry, rate limit verifikasi). */
export type KV = {
  getItem(k: string): Promise<string | null>;
  setItem(k: string, v: string): Promise<void>;
  removeItem(k: string): Promise<void>;
};

type Rec = { sends: number[]; fails: number; lockedUntil: number };
export type StatusOtp = {
  cooldownDetik: number;     // sisa jeda sebelum boleh kirim ulang
  terkunciDetik: number;     // sisa kunci karena salah kode berulang
  kedaluwarsaDetik: number;  // sisa masa berlaku kode terakhir (0 = habis / belum kirim)
  sisaKirim: number;         // sisa kuota kirim dalam 1 jam
  sisaPercobaan: number;     // sisa percobaan salah sebelum dikunci
  bolehKirim: boolean;
  bolehVerifikasi: boolean;
};

const JAM = 3600_000;

export function buatOtpGuard(kv: KV, cfg: OtpConfig = OTP_CONFIG, now: () => number = Date.now) {
  const kunci = (hp: string) => `kbp:otp:${hp}`;

  async function baca(hp: string): Promise<Rec> {
    try {
      const raw = await kv.getItem(kunci(hp));
      if (raw) {
        const r = JSON.parse(raw);
        return {
          sends: Array.isArray(r.sends) ? r.sends.filter((n: unknown) => typeof n === 'number') : [],
          fails: Number(r.fails) || 0,
          lockedUntil: Number(r.lockedUntil) || 0,
        };
      }
    } catch {
      /* data rusak -> mulai bersih */
    }
    return { sends: [], fails: 0, lockedUntil: 0 };
  }

  const tulis = (hp: string, r: Rec) => kv.setItem(kunci(hp), JSON.stringify(r));

  function hitung(r: Rec): StatusOtp {
    const t = now();
    const sends = r.sends.filter((s) => t - s < JAM);
    const terakhir = sends.length ? Math.max(...sends) : 0;
    const cooldown = terakhir ? Math.max(0, Math.ceil((terakhir + cfg.resendSeconds * 1000 - t) / 1000)) : 0;
    const kedaluwarsa = terakhir ? Math.max(0, Math.ceil((terakhir + cfg.validMinutes * 60_000 - t) / 1000)) : 0;
    const terkunci = Math.max(0, Math.ceil((r.lockedUntil - t) / 1000));
    const sisaKirim = Math.max(0, cfg.maxSendPerHour - sends.length);
    return {
      cooldownDetik: cooldown,
      terkunciDetik: terkunci,
      kedaluwarsaDetik: kedaluwarsa,
      sisaKirim,
      sisaPercobaan: Math.max(0, cfg.maxAttempts - r.fails),
      bolehKirim: cooldown === 0 && terkunci === 0 && sisaKirim > 0,
      bolehVerifikasi: terkunci === 0 && kedaluwarsa > 0,
    };
  }

  // kunci yang sudah habis dibuka lagi (percobaan di-reset)
  async function segar(hp: string): Promise<Rec> {
    const r = await baca(hp);
    if (r.lockedUntil > 0 && r.lockedUntil <= now()) {
      r.lockedUntil = 0;
      r.fails = 0;
      await tulis(hp, r);
    }
    return r;
  }

  return {
    async status(hp: string): Promise<StatusOtp> {
      return hitung(await segar(hp));
    },
    async catatKirim(hp: string): Promise<StatusOtp> {
      const r = await segar(hp);
      const t = now();
      r.sends = r.sends.filter((s) => t - s < JAM).concat(t);
      // jumlah salah TIDAK di-reset saat kirim ulang: mencegah tebak-kirim-tebak tanpa batas
      await tulis(hp, r);
      return hitung(r);
    },
    async catatGagal(hp: string): Promise<StatusOtp> {
      const r = await segar(hp);
      r.fails += 1;
      if (r.fails >= cfg.maxAttempts) r.lockedUntil = now() + cfg.lockMinutes * 60_000;
      await tulis(hp, r);
      return hitung(r);
    },
    async reset(hp: string): Promise<void> {
      await kv.removeItem(kunci(hp));
    },
  };
}

/* ============ PESAN ERROR (Indonesia) ============ */
export type AuthErr = { message?: string; code?: string; status?: number; name?: string } | null | undefined;

export function pesanAuth(err: AuthErr): string {
  if (!err) return '';
  const code = (err.code || '').toLowerCase();
  const m = (err.message || '').toLowerCase();

  const peta: Record<string, string> = {
    invalid_credentials: 'Email/nomor HP atau password salah.',
    email_not_confirmed: 'Email belum diverifikasi. Cek kotak masuk Anda lalu klik tautan verifikasi.',
    phone_not_confirmed: 'Nomor HP belum diverifikasi.',
    user_banned: 'Akun sudah tidak aktif. Hubungi pengelola kos.',
    user_already_exists: 'Email sudah terdaftar. Silakan masuk.',
    email_exists: 'Email sudah dipakai akun lain.',
    phone_exists: 'Nomor HP sudah dipakai akun lain.',
    weak_password: 'Password terlalu lemah atau pernah bocor. Gunakan kombinasi lain.',
    same_password: 'Password baru tidak boleh sama dengan password lama.',
    signup_disabled: 'Pendaftaran akun sedang dinonaktifkan.',
    otp_disabled: 'Login dengan kode OTP belum diaktifkan untuk nomor ini.',
    otp_expired: 'Kode OTP kedaluwarsa. Minta kode baru.',
    sms_send_failed: 'SMS gagal dikirim. Coba lagi beberapa saat atau hubungi pengelola.',
    over_sms_send_rate_limit: 'Terlalu banyak permintaan SMS. Tunggu beberapa menit.',
    over_email_send_rate_limit: 'Terlalu banyak permintaan email. Tunggu beberapa menit.',
    over_request_rate_limit: 'Terlalu banyak percobaan. Tunggu beberapa menit.',
    reauthentication_needed: 'Verifikasi identitas diperlukan terlebih dahulu.',
    reauthentication_not_valid: 'Kode verifikasi salah atau kedaluwarsa.',
    provider_disabled: 'Metode masuk ini belum diaktifkan oleh administrator.',
    validation_failed: 'Data yang dimasukkan tidak valid.',
    bad_oauth_callback: 'Login Google gagal. Coba lagi.',
    bad_oauth_state: 'Sesi login Google tidak valid. Coba lagi.',
  };
  if (peta[code]) return peta[code];

  if (m.includes('invalid login')) return 'Email/nomor HP atau password salah.';
  if (m.includes('token has expired') || m.includes('expired')) return 'Kode kedaluwarsa. Minta kode baru.';
  if (m.includes('invalid') && (m.includes('token') || m.includes('otp'))) return 'Kode OTP salah.';
  if (m.includes('banned')) return 'Akun sudah tidak aktif. Hubungi pengelola kos.';
  if (m.includes('rate') || m.includes('too many') || err.status === 429) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to')) return 'Tidak ada koneksi internet.';
  if (m.includes('signups not allowed') || m.includes('not allowed for otp')) return 'Nomor ini belum terdaftar. Hubungi pengelola kos.';
  return 'Terjadi kesalahan: ' + (err.message || 'tidak diketahui');
}

// "5 menit 3 detik" / "42 detik"
export function formatDurasi(detik: number): string {
  const d = Math.max(0, Math.ceil(detik));
  if (d < 60) return `${d} detik`;
  const m = Math.floor(d / 60);
  const s = d % 60;
  return s ? `${m} menit ${s} detik` : `${m} menit`;
}

// samarkan untuk tampilan: +6281234567890 -> +62 8••• ••• 890 ; a***@gmail.com
export function samarkanHp(hp: string): string {
  const d = hp.replace(/\D/g, '');
  if (d.length < 7) return hp;
  return `+${d.slice(0, 2)} ${d.slice(2, 3)}••• ••• ${d.slice(-3)}`;
}
export function samarkanEmail(e: string): string {
  const [u, dom] = e.split('@');
  if (!dom) return e;
  return `${u.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(5, u.length - 1)))}@${dom}`;
}
