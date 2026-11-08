// Edge Function "kelola-akun" (sudah di-deploy ke project). Hanya Pengelola yang boleh memanggil.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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

    const { action, penghuni_id, password } = await req.json();
    if (!penghuni_id) return json({ error: 'penghuni_id wajib' }, 400);
    const { data: p } = await admin.from('penghuni').select('id,nama,nomor_hp,profile_id,status_penghuni').eq('id', penghuni_id).maybeSingle();
    if (!p) return json({ error: 'Penghuni tidak ditemukan' }, 404);

    if (action === 'set_password') {
      if (typeof password !== 'string' || password.length < 8) return json({ error: 'Password minimal 8 karakter' }, 400);
      if (p.status_penghuni !== 'Aktif') return json({ error: 'Penghuni sudah keluar' }, 400);
      if (p.profile_id) {
        const { error } = await admin.auth.admin.updateUserById(p.profile_id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true, mode: 'reset' });
      }
      const phone = hp(p.nomor_hp);
      if (!phone) return json({ error: 'Penghuni belum punya nomor HP' }, 400);
      const { error } = await admin.auth.admin.createUser({ phone, password, phone_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, mode: 'dibuat' });
    }

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
