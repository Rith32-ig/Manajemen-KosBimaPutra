/* === ANGGOTA 3: DAWWAS (PENGELOLA) — SCREEN 6: DATA PENGHUNI ===
   Data dari Supabase: tabel penghuni. */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar, StyleSheet,
  Text, TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isPemilik, supabase, tglPanjang } from '../../lib/supabase';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type TipeSewa = (typeof TIPE_SEWA)[number];
type Penghuni = { id: string; nama: string; kamar: string; tipe: TipeSewa; hp: string; masuk: string; punyaAkun: boolean };
type Kandidat = { id: string; nama: string; email: string | null; nomor_hp: string | null };
type AkunLama = { penghuniId: string; password: string; akun: { id: string; nama: string | null; diblokir: boolean } };
type AksiAkun = 'set_password' | 'keluar' | 'hubungkan';
type HasilAkun = { ok: boolean; code?: string; pesan?: string; akun?: AkunLama['akun'] };

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', er: '#DC2626', accb: '#DBEAFE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD_PRIMARY = ['#1E293B', '#2563EB'] as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };
const SHADOW_CARD = { shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };
const SHADOW_BTN = { shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 };

// Sistem sewa hanya BULANAN (tipe Harian dihapus).
const TIPE_SEWA = ['Bulanan'] as const;

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

function Badge({ text }: { text: string }) {
  return (
    <View style={s.badge}>
      <View style={s.badgeDot} />
      <Txt style={{ color: C.acc, fontSize: 12, fontWeight: '600' }}>{text}</Txt>
    </View>
  );
}

function CustomButton({ title, onPress, ghost = false }: { title: string; onPress: () => void; ghost?: boolean }) {
  const color = ghost ? C.acc : '#fff';
  const label = (
    <View style={s.btnRow}>
      <Txt style={{ color, fontSize: 14, fontWeight: '600' }}>{title}</Txt>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ borderRadius: 9, backgroundColor: ghost ? 'transparent' : C.acc }, !ghost && SHADOW_BTN, pressed && { opacity: 0.85 }]}
    >
      {ghost ? (
        <View style={{ borderWidth: 1, borderColor: C.acc, borderRadius: 9 }}>{label}</View>
      ) : (
        <LinearGradient colors={GRAD_PRIMARY} start={G_START} end={G_END} style={{ borderRadius: 9 }}>
          {label}
        </LinearGradient>
      )}
    </Pressable>
  );
}

function CustomCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function CustomInput({ label, error, leftIcon, style, ...rest }: Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  leftIcon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  const message = typeof error === 'string' ? error : null;
  return (
    <View style={[{ marginTop: 12 }, style]}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <View style={[s.field, focused && { borderColor: C.acc }, !!error && { borderColor: C.er }]}>
        {leftIcon ? <Ionicons name={leftIcon} size={16} color={C.mut} style={{ marginRight: 8 }} /> : null}
        <TextInput
          {...rest}
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={s.input}
        />
      </View>
      {message ? <Txt style={s.errText}>{message}</Txt> : null}
    </View>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={s.toggleRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={[s.sw, { backgroundColor: value ? C.acc : C.bd }]}>
        <View style={[s.knob, { left: value ? 21 : 3 }]} />
      </View>
      <Txt style={{ flex: 1, fontSize: 14 }}>{label}</Txt>
    </Pressable>
  );
}

function Popup({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <CustomCard style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>{children}</CustomCard>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// toast: pil navy di bawah layar, hilang setelah 2,2 detik
function useToast(): [(pesan: string) => void, ReactElement] {
  const [msg, setMsg] = useState('');
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (m: string) => {
      setMsg(m);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(anim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
      }, 2200);
    },
    [anim]
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const node = (
    <View pointerEvents="none" style={s.toastWrap}>
      <Animated.View
        style={[s.toast, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}
      >
        <Txt style={{ color: '#fff', fontSize: 14 }}>{msg}</Txt>
      </Animated.View>
    </View>
  );
  return [show, node];
}

/* ============ SCREEN 6: DATA PENGHUNI ============ */
export default function DataPenghuniScreen() {
  const [toast, toastNode] = useToast();
  const [residents, setResidents] = useState<Penghuni[]>([]);
  const readOnly = isPemilik();

  const muat = useCallback(async () => {
    const { data, error } = await supabase
      .from('penghuni')
      .select('id,nama,nomor_kamar,tipe_sewa,nomor_hp,tanggal_masuk,profile_id')
      .eq('status_penghuni', 'Aktif')
      .order('nomor_kamar');
    if (error) { toast('Gagal memuat data: ' + error.message); return; }
    setResidents((data ?? []).map((r) => ({
      id: r.id, nama: r.nama, kamar: r.nomor_kamar, tipe: r.tipe_sewa as TipeSewa,
      hp: r.nomor_hp || '-', masuk: tglPanjang(r.tanggal_masuk), punyaAkun: !!r.profile_id,
    })));
  }, [toast]);
  useEffect(() => { muat(); }, [muat]);

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  // form "Tambah Penghuni Baru"
  const [nama, setNama] = useState('');
  const [kamar, setKamar] = useState('');
  const tipe: TipeSewa = 'Bulanan';
  const [hp, setHp] = useState('');
  const [masuk, setMasuk] = useState('');
  const [pass, setPass] = useState('');
  const [kirimWa, setKirimWa] = useState(true);
  const [errNama, setErrNama] = useState<string | null>(null);

  // cari di semua kolom
  const data = residents.filter((r) => {
    const teks = [r.nama, r.kamar, r.tipe, r.hp, r.masuk].join(' ').toLowerCase();
    return teks.includes(q.toLowerCase());
  });

  const bukaModal = () => {
    setNama(''); setKamar(''); setHp(''); setMasuk(''); setPass(''); setKirimWa(true); setErrNama(null);
    setOpen(true);
  };

  const simpan = async () => {
    if (!nama.trim()) { setErrNama('Nama wajib diisi'); return; }
    if (!kamar.trim()) { setErrNama('Nomor kamar wajib diisi'); return; }
    if (!hp.trim()) { setErrNama('Nomor HP wajib diisi (untuk login)'); return; }
    if (pass.length < 8) { setErrNama('Password awal minimal 8 karakter'); return; }
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(masuk.trim()) ? masuk.trim() : new Date().toISOString().slice(0, 10);
    const { data: baru, error } = await supabase.from('penghuni').insert({
      nama: nama.trim(), nomor_kamar: kamar.trim(), tipe_sewa: tipe,
      nomor_hp: hp.trim(), tanggal_masuk: iso, metode_pembayaran: 'TF',
    }).select('id').single();
    if (error) {
      setErrNama(error.message.includes('foreign key') ? 'Nomor kamar tidak ditemukan'
        : error.message.includes('uq_penghuni_kamar_aktif') ? 'Kamar sudah terisi penghuni aktif' : error.message);
      return;
    }
    setOpen(false);
    const ak = await aturPassword(baru!.id, pass);
    // false karena menunggu konfirmasi akun lama -> pop-up konfirmasi tampil, jangan tampilkan pesan gagal
    if (ak) toast('Penghuni & akun login dibuat ✓');
    muat();
  };

  // Edge Function kelola-akun (service role hanya di server)
  const kelolaAkun = async (
    action: AksiAkun,
    id: string,
    extra: { password?: string; user_id?: string; reaktivasi_akun_id?: string } = {},
  ): Promise<HasilAkun> => {
    const { data, error } = await supabase.functions.invoke('kelola-akun', { body: { action, penghuni_id: id, ...extra } });
    if (error || data?.error) {
      let body: { error?: string; code?: string; akun?: AkunLama['akun'] } | null = data ?? null;
      try { const j = await (error as any)?.context?.json?.(); if (j) body = j; } catch {}
      return { ok: false, code: body?.code, akun: body?.akun, pesan: body?.error || error?.message || 'gagal' };
    }
    return { ok: true };
  };

  // Nomor HP penghuni sudah punya akun lama (penghuni yang keluar lalu kembali): minta konfirmasi EKSPLISIT Pengelola
  const [akunLama, setAkunLama] = useState<AkunLama | null>(null);

  // Atur password / buat akun. Akun TIDAK pernah ditautkan otomatis dari nama atau nomor HP.
  const aturPassword = async (id: string, password: string, reaktivasi?: string): Promise<boolean> => {
    const r = await kelolaAkun('set_password', id, { password, reaktivasi_akun_id: reaktivasi });
    if (r.ok) return true;
    if (r.code === 'AKUN_LAMA' && r.akun) setAkunLama({ penghuniId: id, password, akun: r.akun });
    else toast(r.pesan ?? 'Gagal');
    return false;
  };

  const konfirmasiAkunLama = async () => {
    if (!akunLama) return;
    const ok = await aturPassword(akunLama.penghuniId, akunLama.password, akunLama.akun.id);
    if (ok) { toast('Akun lama diaktifkan kembali & ditautkan ✓'); setAkunLama(null); muat(); }
  };

  const [aksiId, setAksiId] = useState<string | null>(null);
  const [aksiMode, setAksiMode] = useState<'password' | 'keluar'>('password');
  const [passBaru, setPassBaru] = useState('');
  const jalankanAksi = async () => {
    if (!aksiId) return;
    if (aksiMode === 'password' && passBaru.length < 8) { toast('Password minimal 8 karakter'); return; }
    const ok = aksiMode === 'password'
      ? await aturPassword(aksiId, passBaru)
      : (await kelolaAkun('keluar', aksiId)).ok;
    if (ok) { toast(aksiMode === 'password' ? 'Password diatur ✓' : 'Penghuni ditandai keluar & akun diblokir ✓'); setAksiId(null); setPassBaru(''); muat(); }
    else if (aksiMode === 'keluar') toast('Gagal menandai keluar');
  };

  // Hubungkan akun yang sudah terdaftar (email / Google) ke penghuni ini, dipilih manual oleh Pengelola
  const [hubId, setHubId] = useState<string | null>(null);
  const [kandidat, setKandidat] = useState<Kandidat[]>([]);
  const [cariAkun, setCariAkun] = useState('');
  const [pilih, setPilih] = useState<string | null>(null);
  const bukaHubungkan = async (id: string) => {
    setHubId(id); setPilih(null); setCariAkun(''); setKandidat([]);
    const [{ data: akun }, { data: terpakai }] = await Promise.all([
      supabase.from('profiles').select('id,nama,email,nomor_hp').eq('role', 'penghuni').order('nama'),
      supabase.from('penghuni').select('profile_id').eq('status_penghuni', 'Aktif').not('profile_id', 'is', null),
    ]);
    const dipakai = new Set((terpakai ?? []).map((x) => x.profile_id));
    setKandidat((akun ?? []).filter((a) => !dipakai.has(a.id)));
  };
  const jalankanHubungkan = async () => {
    if (!hubId || !pilih) return;
    const r = await kelolaAkun('hubungkan', hubId, { user_id: pilih });
    if (!r.ok) { toast(r.pesan ?? 'Gagal menghubungkan akun'); return; }
    toast('Akun berhasil dihubungkan ✓'); setHubId(null); muat();
  };
  const kandidatTampil = kandidat
    .filter((k) => [k.nama, k.email, k.nomor_hp].join(' ').toLowerCase().includes(cariAkun.toLowerCase()))
    .slice(0, 20);

  const bukaWa = (nomor: string) => {
    const digits = nomor.split('/')[0].replace(/\D/g, '').replace(/^0/, '62');
    if (!digits) return;
    Linking.openURL(`https://wa.me/${digits}`).catch(() => toast('WhatsApp tidak dapat dibuka'));
  };

  const header = (
    <View>
      <View style={{ marginBottom: 20 }}>
        <Txt style={s.h1}>Data Penghuni &amp; Kamar</Txt>
      </View>
      <View style={s.tools}>
        <CustomInput placeholder="Cari nama / kamar…" leftIcon="search" value={q} onChangeText={setQ} style={{ flex: 1, marginTop: 0 }} />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <CustomCard style={{ alignItems: 'center' }}>
            <Ionicons name="people-outline" size={28} color={C.mut} />
            <Txt style={{ color: C.mut, marginTop: 6 }}>Tidak ada penghuni yang cocok</Txt>
          </CustomCard>
        }
        renderItem={({ item }) => (
          <CustomCard>
            <View style={s.rowTop}>
              <Txt style={{ flex: 1, fontSize: 15, fontWeight: '700' }}>{item.nama}</Txt>
              <Badge text={item.kamar} />
            </View>
            <View style={s.info}>
              <Txt style={s.lbl}>Tipe Sewa</Txt>
              <Txt style={s.val}>{item.tipe}</Txt>
            </View>
            <View style={s.info}>
              <Txt style={s.lbl}>No. WA</Txt>
              <View style={s.waRow}>
                <Txt style={s.val}>{item.hp}</Txt>
                {item.hp !== '-' ? (
                  <Pressable onPress={() => bukaWa(item.hp)} hitSlop={8} style={s.waBtn} accessibilityLabel="Buka WhatsApp">
                    <Ionicons name="logo-whatsapp" size={14} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <View style={[s.info, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Txt style={s.lbl}>Tgl Masuk</Txt>
              <Txt style={s.val}>{item.masuk}</Txt>
            </View>
            {readOnly ? null : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                <CustomButton title="Atur Password" ghost onPress={() => { setAksiMode('password'); setPassBaru(''); setAksiId(item.id); }} />
                {item.punyaAkun ? null : <CustomButton title="Hubungkan Akun" ghost onPress={() => bukaHubungkan(item.id)} />}
                <CustomButton title="Penghuni Keluar" ghost onPress={() => { setAksiMode('keluar'); setAksiId(item.id); }} />
              </View>
            )}
          </CustomCard>
        )}
      />

      {/* FAB tambah penghuni (hanya Pengelola) */}
      {readOnly ? null : <Pressable onPress={bukaModal} style={s.fab} accessibilityLabel="Tambah penghuni">
        <LinearGradient colors={GRAD_PRIMARY} start={G_START} end={G_END} style={s.fabIn}>
          <Ionicons name="add" size={30} color="#fff" />
        </LinearGradient>
      </Pressable>}

      {/* pop-up Atur Password / Penghuni Keluar */}
      <Popup visible={!!aksiId} onClose={() => setAksiId(null)}>
        <Txt style={{ fontSize: 16, fontWeight: '700' }}>{aksiMode === 'password' ? 'Atur Password Penghuni' : 'Penghuni Keluar'}</Txt>
        {aksiMode === 'password' ? (
          <CustomInput label="Password baru (min. 8 karakter)" value={passBaru} onChangeText={setPassBaru} secureTextEntry autoCapitalize="none" />
        ) : (
          <Txt style={{ marginTop: 10, color: C.mut }}>Status penghuni menjadi Keluar dan akunnya diblokir. Data riwayat tidak dihapus.</Txt>
        )}
        <View style={{ marginTop: 16 }}><CustomButton title="Konfirmasi" onPress={jalankanAksi} /></View>
      </Popup>

      {/* pop-up: akun lama ditemukan -> konfirmasi eksplisit */}
      <Popup visible={!!akunLama} onClose={() => setAkunLama(null)}>
        <Txt style={{ fontSize: 16, fontWeight: '700' }}>Akun lama ditemukan</Txt>
        <Txt style={{ marginTop: 10, color: C.mut, lineHeight: 20 }}>
          Nomor HP ini sudah punya akun dari masa tinggal sebelumnya{akunLama?.akun.nama ? ` (${akunLama.akun.nama})` : ''}
          {akunLama?.akun.diblokir ? ', saat ini diblokir' : ''}. Data penghuni baru ini tetap terpisah (ID baru) dan riwayat lama tidak ditimpa.
          {'\n\n'}Aktifkan kembali akun tersebut untuk penghuni ini dan atur password barunya?
        </Txt>
        <View style={s.actions}>
          <CustomButton title="Batal" ghost onPress={() => setAkunLama(null)} />
          <CustomButton title="Aktifkan kembali" onPress={konfirmasiAkunLama} />
        </View>
      </Popup>

      {/* pop-up: hubungkan akun terdaftar (manual) */}
      <Popup visible={!!hubId} onClose={() => setHubId(null)}>
        <Txt style={{ fontSize: 16, fontWeight: '700' }}>Hubungkan akun</Txt>
        <Txt style={{ marginTop: 8, color: C.mut, fontSize: 12, lineHeight: 18 }}>
          Pilih akun yang sudah mendaftar (email / Google). Penautan dilakukan manual oleh Anda dan tidak pernah otomatis dari kesamaan nama atau nomor HP.
        </Txt>
        <CustomInput placeholder="Cari nama / email / nomor HP…" leftIcon="search" value={cariAkun} onChangeText={setCariAkun} />
        <View style={{ marginTop: 10, maxHeight: 260 }}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {kandidatTampil.length === 0 ? (
              <Txt style={{ color: C.mut, textAlign: 'center', paddingVertical: 14 }}>Tidak ada akun yang belum tertaut</Txt>
            ) : kandidatTampil.map((k) => (
              <Pressable key={k.id} onPress={() => setPilih(k.id)} style={[s.kand, pilih === k.id && { borderColor: C.acc, backgroundColor: C.accb }]}>
                <Ionicons name={pilih === k.id ? 'radio-button-on' : 'radio-button-off'} size={18} color={pilih === k.id ? C.acc : C.mut} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '600' }}>{k.nama}</Txt>
                  <Txt style={{ color: C.mut, fontSize: 12 }}>{[k.email, k.nomor_hp].filter(Boolean).join(' · ') || '-'}</Txt>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={s.actions}>
          <CustomButton title="Batal" ghost onPress={() => setHubId(null)} />
          <CustomButton title="Hubungkan" onPress={jalankanHubungkan} />
        </View>
      </Popup>

      {/* pop-up Tambah Penghuni Baru */}
      <Popup visible={open} onClose={() => setOpen(false)}>
        <Txt style={{ fontSize: 16, fontWeight: '700' }}>Tambah Penghuni Baru</Txt>
        <CustomInput
          label="Nama lengkap"
          placeholder="Contoh: Rina Maharani"
          value={nama}
          onChangeText={(t) => { setNama(t); setErrNama(null); }}
          error={errNama}
          autoCapitalize="words"
        />
        <CustomInput label="No. Kamar" placeholder="A-12" value={kamar} onChangeText={setKamar} autoCapitalize="characters" />
        <CustomInput label="No. HP" placeholder="08xxxxxxxxxx" value={hp} onChangeText={setHp} keyboardType="phone-pad" />
        <CustomInput label="Password awal (min. 8 karakter)" value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" />
        <CustomInput label="Tanggal masuk" placeholder="YYYY-MM-DD (kosong = hari ini)" value={masuk} onChangeText={setMasuk} />
        <Toggle value={kirimWa} onChange={setKirimWa} label="Kirim info aturan kos via WhatsApp" />
        <View style={s.actions}>
          <CustomButton title="Batal" ghost onPress={() => setOpen(false)} />
          <CustomButton title="Simpan" onPress={simpan} />
        </View>
      </Popup>
      {toastNode}
    </SafeAreaView>
  );
}

/* ============ STYLE ============ */
const s = StyleSheet.create({
  /* komponen */
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.accb },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5, backgroundColor: C.acc },
  btnRow: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 16, ...SHADOW_CARD },
  label: { fontSize: 12, fontWeight: '600', color: C.mut, marginBottom: 4 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd,
    borderRadius: 9, paddingHorizontal: 11, minHeight: 42,
  },
  input: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.txt, paddingVertical: 9 },
  errText: { color: C.er, fontSize: 12, marginTop: 4 },
  selList: { marginTop: 4, backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 9, overflow: 'hidden' },
  selOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  sw: { width: 40, height: 22, borderRadius: 99, marginRight: 8 },
  knob: { position: 'absolute', top: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 16 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', zIndex: 99 },
  toast: {
    backgroundColor: C.navy, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 99, maxWidth: '90%',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  /* layar */
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  tools: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  info: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.bd,
  },
  lbl: { color: C.mut, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  val: { fontSize: 14 },
  waRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', right: 24, bottom: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: C.acc,
    shadowColor: '#2563EB', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  fabIn: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  kand: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: C.bd, borderRadius: 10, marginBottom: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
});
