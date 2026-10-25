/* === ANGGOTA 2: DHIYAUL (PENGHUNI) — SCREEN 3: DASHBOARD PENGHUNI ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini.
   Juga mengekspor PengumumanScreen (tab "Info") yang dipakai RootNavigator.
   Keluhan baru dari LaporKeluhanScreen diterima lewat route.params.keluhanBaru. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, ComponentType, ReactElement, ReactNode } from 'react';
import {
  View, Text, TextInput, Pressable, SectionList, FlatList, Animated, Modal, ScrollView,
  KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { PenghuniTabParamList } from '../RootNavigator';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = BottomTabScreenProps<PenghuniTabParamList, 'Beranda'>;
type Tone = 'ok' | 'wn' | 'er' | 'ac';
type ButtonType = 'primary' | 'wa' | 'report';
type ButtonSize = 'sm' | 'md' | 'lg';
// dipakai juga oleh LaporKeluhanScreen dan RootNavigator (param tab "Beranda")
export type Keluhan = { id: string; judul: string; tanggal: string; status: string; tone: Tone; step: number };
type Tagihan = { id: string; bulan: string; ket: string; status: string; tone: Tone };
type Pengumuman = { id: string; judul: string; ket: string; label: string; tone: Tone };
type SheetKey = 'izin' | 'info' | 'aturan' | 'bayar';
type Aksi = { key: SheetKey; icon: IconName; label: string };
type SheetProps = { onClose: () => void; toast: (pesan: string) => void };
type Seksi = { key: 'keluhan' | 'tagihan'; title: string; data: (Keluhan | Tagihan)[] };

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', okb: '#DCFCE7', wn: '#B45309', wnb: '#FEF3C7', er: '#DC2626', erb: '#FEE2E2', accb: '#DBEAFE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD = { primary: ['#1E293B', '#2563EB'], wa: ['#16A34A', '#22C55E'], report: ['#EF4444', '#F97316'] } as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };
const SHADOW_CARD = { shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };
const SHADOW_BTN = { shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 };
const SHADOW_REPORT = { shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 };

/* ============ DATA DUMMY ============ */
const OWN_COMPLAINTS: Keluhan[] = [
  { id: 'c1', judul: 'Wi-Fi lantai 2 lambat', tanggal: 'Dilaporkan 17 Okt', status: 'Ditangani', tone: 'wn', step: 2 },
  { id: 'c2', judul: 'Lampu koridor mati', tanggal: 'Dilaporkan 10 Okt', status: 'Selesai', tone: 'ok', step: 4 },
];

const BILLS: Tagihan[] = [
  { id: 'b1', bulan: 'Oktober 2026', ket: 'Rp 1.200.000', status: 'Lunas', tone: 'ok' },
  { id: 'b2', bulan: 'September 2026', ket: 'Rp 1.200.000', status: 'Lunas', tone: 'ok' },
  { id: 'b3', bulan: 'November 2026', ket: 'Jatuh tempo 5 Nov', status: 'Menunggu', tone: 'wn' },
];

const ANNOUNCEMENTS: Pengumuman[] = [
  { id: 'a1', judul: 'Listrik padam sementara', ket: 'Senin 19 Okt, 09.00–12.00', label: 'Penting', tone: 'er' },
  { id: 'a2', judul: 'Perawatan jaringan Wi-Fi', ket: 'Selasa 20 Okt malam, koneksi bisa terputus', label: 'Info', tone: 'wn' },
  { id: 'a3', judul: 'Pemeriksaan kos mingguan', ket: 'Sabtu 24 Okt, pagi hari', label: 'Rutin', tone: 'ac' },
];

const RULES = [
  'Gerbang dikunci pukul 22.00',
  'Pulang malam wajib konfirmasi ke pengelola',
  'Laporkan kerusakan fasilitas lewat aplikasi atau WhatsApp',
  'Jaga kebersihan dan ketenangan bersama',
];

const QUICK: Aksi[] = [
  { key: 'izin', icon: 'moon', label: 'Izin Malam' },
  { key: 'info', icon: 'megaphone', label: 'Pengumuman' },
  { key: 'aturan', icon: 'list', label: 'Aturan' },
  { key: 'bayar', icon: 'receipt', label: 'Bukti Bayar' },
];

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  ok: { bg: C.okb, fg: C.ok },
  wn: { bg: C.wnb, fg: C.wn },
  er: { bg: C.erb, fg: C.er },
  ac: { bg: C.accb, fg: C.acc },
};

function Badge({ text, tone = 'ac' }: { text: string; tone?: Tone }) {
  const t = TONES[tone] || TONES.ac;
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: t.fg }]} />
      <Txt style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{text}</Txt>
    </View>
  );
}

const BTN = {
  sm: { v: 5, h: 10, fs: 12, r: 9, ic: 14 },
  md: { v: 10, h: 16, fs: 14, r: 9, ic: 16 },
  lg: { v: 13, h: 24, fs: 15, r: 12, ic: 18 },
  report: { v: 20, h: 20, fs: 17, r: 18, ic: 32 },
};
const SOLID = { primary: C.acc, wa: C.ok, report: C.er };

function CustomButton({ title, onPress, type = 'primary', icon, size = 'md', block = false, style }: {
  title: string;
  onPress: () => void;
  type?: ButtonType;
  icon?: IconName;
  size?: ButtonSize;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isReport = type === 'report';
  const z = isReport ? BTN.report : BTN[size];
  const content = (
    <View style={[s.btnRow, { paddingVertical: z.v, paddingHorizontal: z.h }, isReport && { justifyContent: 'flex-start' }]}>
      {icon ? <Ionicons name={icon} size={z.ic} color="#fff" style={{ marginRight: isReport ? 14 : 6 }} /> : null}
      <Txt style={{ color: '#fff', fontSize: z.fs, fontWeight: isReport ? '700' : '600', flexShrink: 1 }}>{title}</Txt>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        { borderRadius: z.r, alignSelf: block ? 'stretch' : 'flex-start', backgroundColor: SOLID[type] },
        isReport ? SHADOW_REPORT : SHADOW_BTN,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <LinearGradient colors={GRAD[type]} start={G_START} end={G_END} style={{ borderRadius: z.r }}>
        {content}
      </LinearGradient>
    </Pressable>
  );
}

function CustomCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function CustomInput({ label, error, style, ...rest }: Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginTop: 12 }, style]}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <View style={[s.field, focused && { borderColor: C.acc }, !!error && { borderColor: C.er }]}>
        <TextInput
          {...rest}
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          style={s.input}
        />
      </View>
    </View>
  );
}

function Select({ label, value, options, onChange }: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <Pressable onPress={() => setOpen((o) => !o)} style={[s.field, open && { borderColor: C.acc }]}>
        <Txt style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{value}</Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.mut} />
      </Pressable>
      {open ? (
        <View style={s.selList}>
          {options.map((o, i) => {
            const on = o === value;
            return (
              <Pressable
                key={o}
                onPress={() => { onChange(o); setOpen(false); }}
                style={[s.selOpt, i > 0 && { borderTopWidth: 1, borderTopColor: C.bd }, on && { backgroundColor: C.accb }]}
              >
                <Txt style={{ flex: 1, fontSize: 14, color: on ? C.acc : C.txt, fontWeight: on ? '600' : '400' }}>{o}</Txt>
                {on ? <Ionicons name="checkmark" size={16} color={C.acc} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
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

// potongan "satu kartu" untuk SectionList: judul + baris
function CardHead({ children }: { children: ReactNode }) {
  return <View style={s.cardHead}>{children}</View>;
}
function CardRow({ isLast, children }: { isLast: boolean; children: ReactNode }) {
  return (
    <View style={[s.rowOuter, isLast && s.rowLast]}>
      <View style={[s.rowInner, !isLast && s.rowSep]}>{children}</View>
    </View>
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

/* ============ POP-UP FITUR PENGHUNI ============ */
function SheetTitle({ icon, title, onClose }: { icon: IconName; title: string; onClose: () => void }) {
  return (
    <View style={s.sheetHead}>
      <Ionicons name={icon} size={18} color={C.navy} style={{ marginRight: 8 }} />
      <Txt style={{ flex: 1, fontSize: 16, fontWeight: '700' }}>{title}</Txt>
      <Pressable onPress={onClose} hitSlop={10} style={s.closeBtn}>
        <Ionicons name="close" size={16} color={C.acc} />
      </Pressable>
    </View>
  );
}

function IzinSheet({ onClose, toast }: SheetProps) {
  const [jam, setJam] = useState('23:00');
  const [alasan, setAlasan] = useState('Kuliah / tugas kelompok');
  const [catatan, setCatatan] = useState('');
  return (
    <View>
      <SheetTitle icon="moon" title="Izin Pulang Malam" onClose={onClose} />
      <Txt style={s.sheetSub}>Gerbang dikunci pukul 22.00. Konfirmasi dulu agar pengelola tidak menunggu.</Txt>
      <CustomInput label="Perkiraan jam tiba" value={jam} onChangeText={setJam} keyboardType="numbers-and-punctuation" placeholder="23:00" />
      <Select label="Alasan" value={alasan} onChange={setAlasan} options={['Kuliah / tugas kelompok', 'Bekerja', 'Kegiatan organisasi', 'Lainnya']} />
      <CustomInput label="Catatan (opsional)" placeholder="Contoh: pulang dijemput teman" value={catatan} onChangeText={setCatatan} />
      <CustomButton title="Kirim Izin" block style={{ marginTop: 16 }} onPress={() => { toast('Izin terkirim ke pengelola ✓'); onClose(); }} />
    </View>
  );
}

function InfoSheet({ onClose }: Pick<SheetProps, 'onClose'>) {
  return (
    <View>
      <SheetTitle icon="megaphone" title="Pengumuman" onClose={onClose} />
      <Txt style={s.sheetSub}>Dari pengelola kos · contoh data</Txt>
      <View style={{ marginTop: 6 }}>
        {ANNOUNCEMENTS.map((a, i) => (
          <View key={a.id} style={[s.li, i < ANNOUNCEMENTS.length - 1 && s.liSep]}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{a.judul}</Txt>
              <Txt style={s.small}>{a.ket}</Txt>
            </View>
            <Badge text={a.label} tone={a.tone} />
          </View>
        ))}
      </View>
    </View>
  );
}

function AturanSheet({ onClose, toast }: SheetProps) {
  return (
    <View>
      <SheetTitle icon="list" title="Aturan & Kontak Darurat" onClose={onClose} />
      <View style={{ marginVertical: 12 }}>
        {RULES.map((r) => (
          <View key={r} style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Txt style={{ width: 16 }}>•</Txt>
            <Txt style={{ flex: 1, lineHeight: 22 }}>{r}</Txt>
          </View>
        ))}
      </View>
      <View style={s.contact}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }}>Ibu Peni Azzam</Txt>
          <Txt style={s.small}>Pengelola kos</Txt>
        </View>
        <CustomButton title="Hubungi" icon="logo-whatsapp" type="wa" size="sm" onPress={() => { toast('Membuka WhatsApp pengelola…'); onClose(); }} />
      </View>
    </View>
  );
}

function BayarSheet({ onClose, toast }: SheetProps) {
  const [periode, setPeriode] = useState('November 2026');
  const [nominal, setNominal] = useState('1200000');
  const [foto, setFoto] = useState<string | null>(null);
  return (
    <View>
      <SheetTitle icon="receipt" title="Unggah Bukti Bayar" onClose={onClose} />
      <Select label="Periode" value={periode} onChange={setPeriode} options={['November 2026', 'Oktober 2026']} />
      <CustomInput label="Nominal (Rp)" value={nominal} onChangeText={setNominal} keyboardType="numeric" />
      <Txt style={[s.label, { marginTop: 12 }]}>Foto bukti transfer</Txt>
      <Pressable style={s.drop} onPress={() => setFoto('bukti-transfer.jpg')}>
        <Ionicons name={foto ? 'checkmark-circle' : 'camera'} size={26} color={foto ? C.ok : C.mut} />
        <Txt style={{ fontWeight: '700', color: C.mut, marginTop: 4 }}>{foto ? `✓ ${foto}` : 'Ketuk untuk pilih foto'}</Txt>
      </Pressable>
      <CustomButton title="Kirim Bukti" block style={{ marginTop: 16 }} onPress={() => { toast('Bukti dikirim, menunggu konfirmasi pengelola ✓'); onClose(); }} />
    </View>
  );
}

const SHEETS: Record<SheetKey, ComponentType<SheetProps>> = { izin: IzinSheet, info: InfoSheet, aturan: AturanSheet, bayar: BayarSheet };

/* ============ SCREEN 3: DASHBOARD PENGHUNI ============ */
export default function PenghuniHomeScreen({ navigation, route }: Props) {
  const [toast, toastNode] = useToast();
  const [ownComplaints, setOwnComplaints] = useState(OWN_COMPLAINTS);
  const [sheet, setSheet] = useState<SheetKey | null>(null);
  const Sheet = sheet ? SHEETS[sheet] : null;

  // keluhan baru dari tab "Lapor" datang lewat params navigasi
  const keluhanBaru = route.params?.keluhanBaru;
  useEffect(() => {
    if (!keluhanBaru) return;
    setOwnComplaints((list) => (list.some((x) => x.id === keluhanBaru.id) ? list : [keluhanBaru, ...list]));
    toast('Keluhan terkirim ke pengelola ✓');
  }, [keluhanBaru, toast]);

  const header = (
    <View style={{ gap: 14, marginBottom: 14 }}>
      <View>
        <Txt style={{ color: C.mut, fontSize: 12 }}>Halo 👋</Txt>
        <Txt style={s.h1}>Andi Pratama</Txt>
      </View>

      {/* banner status sewa */}
      <LinearGradient colors={GRAD.primary} start={G_START} end={G_END} style={s.banner}>
        <View style={s.circleA} />
        <View style={s.circleB} />
        <Txt style={s.bannerSmall}>Sisa masa sewa · Kamar A-03</Txt>
        <Txt style={s.big}>
          47 <Txt style={{ fontSize: 16, fontWeight: '500', color: '#fff' }}>hari</Txt>
        </Txt>
        <View style={s.bar}>
          <View style={[s.barFill, { width: '48%' }]} />
        </View>
        <Txt style={[s.bannerSmall, { marginTop: 8 }]}>Berakhir 4 Des 2026</Txt>
        <View style={s.payRow}>
          <Ionicons name="card" size={15} color="#fff" />
          <Txt style={{ color: '#fff', fontSize: 12, marginLeft: 6, flex: 1 }}>Pembayaran Oktober 2026</Txt>
          <View style={s.payChip}>
            <View style={s.payDot} />
            <Txt style={{ color: C.ok, fontSize: 12, fontWeight: '700' }}>Lunas</Txt>
          </View>
        </View>
      </LinearGradient>

      <CustomButton title="Gabung Grup WhatsApp Koordinasi" icon="logo-whatsapp" type="wa" size="lg" block onPress={() => toast('Membuka Grup WhatsApp Koordinasi…')} />
      <CustomButton title="Laporkan Masalah / Keluhan Kos" icon="construct" type="report" block onPress={() => navigation.navigate('Lapor')} />

      {/* aksi cepat */}
      <View style={s.qa}>
        {QUICK.map((q) => (
          <Pressable key={q.key} style={s.qaBtn} onPress={() => setSheet(q.key)}>
            <View style={s.qaIcon}>
              <Ionicons name={q.icon} size={20} color={C.acc} />
            </View>
            <Txt style={{ fontSize: 11, fontWeight: '600' }}>{q.label}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const sections: Seksi[] = [
    { key: 'keluhan', title: 'Keluhan Saya', data: ownComplaints },
    { key: 'tagihan', title: 'Riwayat Tagihan', data: BILLS },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <CardHead>
            <Txt style={{ fontSize: 16, fontWeight: '700' }}>{section.title}</Txt>
          </CardHead>
        )}
        renderSectionFooter={() => <View style={{ height: 14 }} />}
        renderItem={({ item, index, section }) => {
          const isLast = index === section.data.length - 1;
          if ('step' in item) {
            return (
              <CardRow isLast={isLast}>
                <View style={s.rowBetween}>
                  <Txt style={{ flex: 1, fontWeight: '700' }}>{item.judul}</Txt>
                  <Badge text={item.status} tone={item.tone} />
                </View>
                <Txt style={s.small}>{item.tanggal}</Txt>
                <View style={s.steps}>
                  {[0, 1, 2, 3].map((n) => (
                    <View key={n} style={[s.step, n < item.step && { backgroundColor: C.acc }]} />
                  ))}
                </View>
              </CardRow>
            );
          }
          return (
            <CardRow isLast={isLast}>
              <View style={s.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Txt>{item.bulan}</Txt>
                  <Txt style={s.small}>{item.ket}</Txt>
                </View>
                <Badge text={item.status} tone={item.tone} />
              </View>
            </CardRow>
          );
        }}
      />

      <Popup visible={!!sheet} onClose={() => setSheet(null)}>
        {Sheet ? <Sheet onClose={() => setSheet(null)} toast={toast} /> : null}
      </Popup>
      {toastNode}
    </SafeAreaView>
  );
}

/* ============ TAB "INFO": DAFTAR PENGUMUMAN ============ */
export function PengumumanScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <FlatList
        data={ANNOUNCEMENTS}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ marginBottom: 14 }}>
            <Txt style={s.h1}>Pengumuman</Txt>
            <Txt style={{ color: C.mut, fontSize: 12 }}>Dari pengelola kos · contoh data</Txt>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <CustomCard>
            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: '700' }}>{item.judul}</Txt>
                <Txt style={s.small}>{item.ket}</Txt>
              </View>
              <Badge text={item.label} tone={item.tone} />
            </View>
          </CustomCard>
        )}
      />
    </SafeAreaView>
  );
}

/* ============ STYLE ============ */
const s = StyleSheet.create({
  /* komponen */
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 99 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 16, padding: 16, ...SHADOW_CARD },
  label: { fontSize: 12, fontWeight: '600', color: C.mut, marginBottom: 4 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd,
    borderRadius: 9, paddingHorizontal: 11, minHeight: 42,
  },
  input: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.txt, paddingVertical: 9 },
  selList: { marginTop: 4, backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 9, overflow: 'hidden' },
  selOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 16 },
  cardHead: {
    backgroundColor: C.surf, borderWidth: 1, borderBottomWidth: 0, borderColor: C.bd,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  rowOuter: { backgroundColor: C.surf, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.bd, paddingHorizontal: 16 },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingBottom: 6 },
  rowInner: { paddingVertical: 10 },
  rowSep: { borderBottomWidth: 1, borderBottomColor: C.bd },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', zIndex: 99 },
  toast: {
    backgroundColor: C.navy, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 99, maxWidth: '90%',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  /* layar */
  h1: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  small: { color: C.mut, fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  liSep: { borderBottomWidth: 1, borderBottomColor: C.bd },

  banner: {
    borderRadius: 20, padding: 20, overflow: 'hidden',
    shadowColor: '#2563EB', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8,
  },
  circleA: { position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.12)' },
  circleB: { position: 'absolute', right: 40, bottom: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.08)' },
  bannerSmall: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  big: { color: '#fff', fontSize: 42, lineHeight: 48, fontWeight: '700' },
  bar: { height: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 14 },
  barFill: { height: '100%', backgroundColor: '#fff' },
  payRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  payChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.okb, borderRadius: 99, paddingVertical: 2, paddingHorizontal: 10 },
  payDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.ok, marginRight: 5 },

  qa: { flexDirection: 'row', gap: 8 },
  qaBtn: {
    flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 2,
    backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 16,
  },
  qaIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.accb, alignItems: 'center', justifyContent: 'center' },

  steps: { flexDirection: 'row', gap: 4, marginTop: 8 },
  step: { flex: 1, height: 5, borderRadius: 9, backgroundColor: C.bd },

  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  sheetSub: { color: C.mut, fontSize: 12, marginTop: 6, lineHeight: 18 },
  closeBtn: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: C.acc, alignItems: 'center', justifyContent: 'center' },
  contact: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: 12, padding: 12 },
  drop: { borderWidth: 2, borderStyle: 'dashed', borderColor: C.bd, borderRadius: 16, padding: 22, alignItems: 'center' },
});
