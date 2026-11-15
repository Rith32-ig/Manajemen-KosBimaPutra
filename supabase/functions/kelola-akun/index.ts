// Edge Function "kelola-akun" v2. Hanya role Pengelola yang boleh memanggil.
// Service Role Key HANYA ada di sini (server), tidak pernah di aplikasi.
//
// Aksi:
//   set_password : buat akun nomor HP untuk penghuni / reset password / aktifkan kembali akun lama
//   hubungkan    : tautkan akun yang sudah terdaftar (email / Google) ke data penghuni  [BARU]
//   keluar       : tandai penghuni keluar + blokir akunnya (riwayat tetap di baris penghuni lama)
//
// ATURAN IDENTITAS: akun TIDAK pernah ditautkan otomatis dari kesamaan nama / nomor HP.
// Setiap penautan terjadi karena Pengelola menyebut penghuni_id (dan user_id / konfirmasi) secara eksplisit.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hp(raw: string | null): string | null {
  let d = (raw ?? '').split('/')[0].replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: u } = await admin.auth.getUser(token);
    if (!u.user) return json({ error: 'Tidak terautentikasi' }, 401);
    const { data: me } = await admin.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
    if (me?.role !== 'pengelola') return json({ error: 'Hanya Pengelola yang boleh melakukan ini' }, 403);

    const body = await req.json();
    const { action, penghuni_id, password, user_id, reaktivasi_akun_id } = body ?? {};
    if (!penghuni_id || !UUID.test(String(penghuni_id))) return json({ error: 'penghuni_id tidak valid' }, 400);

    const { data: p } = await admin
      .from('penghuni')
      .select('id,nama,nomor_hp,profile_id,status_penghuni')
      .eq('id', penghuni_id)
      .maybeSingle();
    if (!p) return json({ error: 'Penghuni tidak ditemukan' }, 404);

    const cekPassword = () =>
      typeof password !== 'string' || password.length < 8 || password.length > 72
        ? 'Password harus 8-72 karakter'
        : null;

    // ------------------------------------------------------------------ set_password
    if (action === 'set_password') {
      const ePass = cekPassword();
      if (ePass) return json({ error: ePass }, 400);
      if (p.status_penghuni !== 'Aktif') return json({ error: 'Penghuni sudah keluar' }, 400);

      // (a) penghuni sudah punya akun -> reset password (dan buka blokir bila ada)
      if (p.profile_id) {
        const { error } = await admin.auth.admin.updateUserById(p.profile_id, { password, ban_duration: 'none' });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, mode: 'reset' });
      }

      const phone = hp(p.nomor_hp);
      if (!phone) return json({ error: 'Penghuni belum punya nomor HP' }, 400);

      // (b) nomor ini sudah punya akun? (mis. penghuni lama yang kembali)
      const { data: lama, error: eLama } = await admin.rpc('akun_by_hp', { p_phone: phone });
      if (eLama) return json({ error: eLama.message }, 400);
      const akun = Array.isArray(lama) ? lama[0] : null;

      if (akun) {
        if (akun.role && akun.role !== 'penghuni') {
          return json({ code: 'AKUN_BUKAN_PENGHUNI', error: 'Nomor ini dipakai akun staf, bukan penghuni.' }, 409);
        }
        if (akun.penghuni_aktif_id) {
          return json({ code: 'AKUN_SUDAH_TERPAKAI', error: 'Nomor ini sudah dipakai akun yang tertaut ke penghuni aktif lain.' }, 409);
        }
        // butuh konfirmasi eksplisit Pengelola sebelum akun lama dipakai lagi
        if (reaktivasi_akun_id !== akun.user_id) {
          return json({
            code: 'AKUN_LAMA',
            error: 'Nomor HP ini sudah memiliki akun dari masa tinggal sebelumnya. Konfirmasi untuk mengaktifkannya kembali.',
            akun: { id: akun.user_id, nama: akun.nama, diblokir: akun.diblokir },
          }, 409);
        }
        const { error: eUp } = await admin.auth.admin.updateUserById(akun.user_id, { password, ban_duration: 'none' });
        if (eUp) return json({ error: eUp.message }, 400);
        const { error: eLink } = await admin.from('penghuni').update({ profile_id: akun.user_id }).eq('id', p.id);
        if (eLink) return json({ error: eLink.message }, 400);
        return json({ ok: true, mode: 'diaktifkan_kembali' });
      }

      // (c) belum ada akun -> buat baru lalu tautkan EKSPLISIT ke penghuni_id ini
      const { data: baru, error: eNew } = await admin.auth.admin.createUser({ phone, password, phone_confirm: true });
      if (eNew || !baru.user) return json({ error: eNew?.message ?? 'Gagal membuat akun' }, 400);
      const { error: eLink } = await admin.from('penghuni').update({ profile_id: baru.user.id }).eq('id', p.id);
      if (eLink) {
        await admin.auth.admin.deleteUser(baru.user.id); // jangan tinggalkan akun yatim
        return json({ error: 'Gagal menautkan akun: ' + eLink.message }, 400);
      }
      await admin.from('profiles').update({ nama: p.nama }).eq('id', baru.user.id);
      return json({ ok: true, mode: 'dibuat' });
    }

    // ------------------------------------------------------------------ hubungkan
    if (action === 'hubungkan') {
      if (!user_id || !UUID.test(String(user_id))) return json({ error: 'user_id tidak valid' }, 400);
      if (p.status_penghuni !== 'Aktif') return json({ error: 'Penghuni sudah keluar' }, 400);
      if (p.profile_id) return json({ error: 'Penghuni ini sudah punya akun tertaut' }, 409);

      const { data: prof } = await admin.from('profiles').select('id,role').eq('id', user_id).maybeSingle();
      if (!prof) return json({ error: 'Akun tidak ditemukan' }, 404);
      if (prof.role !== 'penghuni') return json({ error: 'Hanya akun ber-role penghuni yang dapat ditautkan' }, 400);

      const { data: terpakai } = await admin
        .from('penghuni').select('id').eq('profile_id', user_id).eq('status_penghuni', 'Aktif').maybeSingle();
      if (terpakai) return json({ code: 'AKUN_SUDAH_TERPAKAI', error: 'Akun ini sudah tertaut ke penghuni aktif lain' }, 409);

      // akun mantan penghuni (diblokir saat keluar) diaktifkan kembali karena Pengelola memilihnya secara eksplisit
      await admin.auth.admin.updateUserById(user_id, { ban_duration: 'none' });
      const { error } = await admin.from('penghuni').update({ profile_id: user_id }).eq('id', p.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, mode: 'dihubungkan' });
    }

    // ------------------------------------------------------------------ keluar
    if (action === 'keluar') {
      const { error: e1 } = await admin.from('penghuni').update({ status_penghuni: 'Keluar' }).eq('id', p.id);
      if (e1) return json({ error: e1.message }, 400);
      if (p.profile_id) {
        const { error: e2 } = await admin.auth.admin.updateUserById(p.profile_id, { ban_duration: '876000h' });
        if (e2) return json({ error: e2.message }, 400);
      }
      return json({ ok: true });
    }

    return json({ error: 'action tidak dikenal' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
