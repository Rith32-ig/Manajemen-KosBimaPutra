/* === ANGGOTA 4: HANIFA (PENGELOLA) — SCREEN 7: PEMBAYARAN & KUITANSI ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
import {
  View, Text, TextInput, Pressable, SectionList, Share, Animated, KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'ok' | 'wn';
type ButtonType = 'primary' | 'ghost' | 'wa';
type Penghuni = { id: string; nama: string; kamar: string };
type Transaksi = { id: string; nama: string; metode: string; nominal: string; periode: string };
type Telat = { id: string; label: string; info: string };
type Seksi = { key: 'riwayat' | 'late'; title: string; data: (Transaksi | Telat)[] };
type DataKuitansi = { nm: string; rm: string; kp: string; km: string; kt: string; tgl: string; kno: string };
type KuitansiTersimpan = { nm: string; kp: string; km: string; kt: string; kno: string };

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', okb: '#DCFCE7', wn: '#B45309', wnb: '#FEF3C7', er: '#DC2626', accb: '#DBEAFE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD = { primary: ['#1E293B', '#2563EB'], wa: ['#16A34A', '#22C55E'] } as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };
const SHADOW_CARD = { shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 };
const SHADOW_BTN = { shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 };

/* ============ DATA DUMMY ============ */
const RESIDENTS: Penghuni[] = [
  { id: 'r1', nama: 'Andi Pratama', kamar: 'A-03' },
  { id: 'r2', nama: 'Siti Nurhaliza', kamar: 'B-07' },
  { id: 'r3', nama: 'Budi Santoso', kamar: 'A-11' },
  { id: 'r4', nama: 'Dewi Lestari', kamar: 'C-02' },
  { id: 'r5', nama: 'Rizky Fadilah', kamar: 'B-02' },
];

const PAYMENTS: Transaksi[] = [
  { id: 'p1', nama: 'Andi Pratama', metode: 'Transfer', nominal: 'Rp 1.200.000', periode: 'Okt 2026' },
  { id: 'p2', nama: 'Dewi Lestari', metode: 'Cash', nominal: 'Rp 350.000', periode: 'Okt 2026' },
];

const LATE: Telat[] = [
  { id: 'l1', label: 'Budi Santoso · A-11', info: 'Terlambat 5 hari' },
  { id: 'l2', label: 'Rizky Fadilah · B-02', info: 'Terlambat 12 hari' },
  { id: 'l3', label: 'Maya Putri · C-09', info: 'Terlambat 3 hari' },
];

/* ============ FUNGSI BANTU ============ */
// 1200000 -> "Rp 1.200.000" (tanpa Intl, aman di Hermes Android)
const formatRupiah = (n: number | string) => 'Rp ' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tanggalPanjang = (d: Date = new Date()) => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

/* ============ KOMPONEN RE-USABLE ============ */
function Txt({ style, ...props }: TextProps) {
  const { fontWeight, ...rest }: TextStyle = StyleSheet.flatten(style) || {};
  return <Text {...props} style={[{ fontFamily: FAMILY[String(fontWeight || '400')], color: C.txt }, rest]} />;
}

const TONES: Record<Tone, { bg: string; fg: string }> = { ok: { bg: C.okb, fg: C.ok }, wn: { bg: C.wnb, fg: C.wn } };

function Badge({ text, tone = 'ok' }: { text: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: t.fg }]} />
      <Txt style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{text}</Txt>
    </View>
  );
}

const BTN = { sm: { v: 5, h: 10, fs: 12, ic: 14 }, md: { v: 10, h: 16, fs: 14, ic: 16 } };

function CustomButton({ title, onPress, type = 'primary', icon, size = 'md', block = false, style }: {
  title: string;
  onPress: () => void;
  type?: ButtonType;
  icon?: IconName;
  size?: 'sm' | 'md';
  block?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const z = BTN[size];
  const ghost = type === 'ghost';
  const color = ghost ? C.acc : '#fff';
  const content = (
    <View style={[s.btnRow, { paddingVertical: z.v, paddingHorizontal: z.h }]}>
      {icon ? <Ionicons name={icon} size={z.ic} color={color} style={{ marginRight: 6 }} /> : null}
      <Txt style={{ color, fontSize: z.fs, fontWeight: '600', flexShrink: 1 }}>{title}</Txt>
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        { borderRadius: 9, alignSelf: block ? 'stretch' : 'flex-start', backgroundColor: type === 'wa' ? C.ok : ghost ? 'transparent' : C.acc },
        !ghost && SHADOW_BTN,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {type === 'ghost' ? (
        <View style={{ borderWidth: 1, borderColor: C.acc, borderRadius: 9 }}>{content}</View>
      ) : (
        <LinearGradient colors={GRAD[type]} start={G_START} end={G_END} style={{ borderRadius: 9 }}>
          {content}
        </LinearGradient>
      )}
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
  const message = typeof error === 'string' ? error : null;
  return (
    <View style={[{ marginTop: 12 }, style]}>
      {label ? <Txt style={s.label}>{label}</Txt> : null}
      <View style={[s.field, focused && { borderColor: C.acc }, !!error && { borderColor: C.er }]}>
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

function Select({ label, value, options, onChange, style }: {
  label?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[{ marginTop: 12 }, style]}>
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

function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={s.segBtn}>
            {on ? <LinearGradient colors={GRAD.primary} start={G_START} end={G_END} style={[StyleSheet.absoluteFill, { borderRadius: 7 }]} /> : null}
            <Txt style={{ fontWeight: '600', color: on ? '#fff' : C.mut }}>{o}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const FieldLabel = ({ children }: { children: ReactNode }) => <Txt style={[s.label, { marginTop: 12 }]}>{children}</Txt>;

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

/* ============ KUITANSI DIGITAL ============ */
function Kuitansi({ d }: { d: DataKuitansi }) {
  const rows: [string, string][] = [
    ['Telah diterima dari', d.nm],
    ['No. Kamar', d.rm],
    ['Untuk pembayaran', d.kp],
    ['Metode', d.km],
    ['Tanggal', d.tgl],
  ];
  return (
    <View style={s.paper}>
      <Txt style={s.c}>KOS BIMA PUTRA · Jl. Perjuangan No. 72</Txt>
      <Txt style={s.paperH}>KUITANSI</Txt>
      <Txt style={s.c}>{d.kno}</Txt>

      <View style={s.stamp}>
        <Txt style={{ color: C.ok, fontWeight: '800', letterSpacing: 2 }}>LUNAS</Txt>
      </View>

      <View style={{ marginTop: 22 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={s.row}>
            <Txt style={{ color: C.mut, fontSize: 13 }}>{k}</Txt>
            <Txt style={{ fontWeight: '700', fontSize: 13, flex: 1, textAlign: 'right', marginLeft: 12 }}>{v}</Txt>
          </View>
        ))}
      </View>

      <View style={s.tot}>
        <Txt style={{ fontSize: 18, fontWeight: '700' }}>Jumlah</Txt>
        <Txt style={{ fontSize: 18, fontWeight: '700' }}>{d.kt}</Txt>
      </View>

      <View style={s.sign}>
        <View style={{ alignItems: 'center' }}>
          <Txt style={s.signTxt}>Penghuni</Txt>
          <View style={{ height: 40 }} />
          <Txt style={s.signTxt}>( ____________ )</Txt>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Txt style={s.signTxt}>Pengelola</Txt>
          <View style={{ height: 40 }} />
          <Txt style={s.signTxt}>( Peni Azzam )</Txt>
        </View>
      </View>
    </View>
  );
}

/* ============ SCREEN 7: PEMBAYARAN ============ */
export default function PembayaranScreen() {
  const [toast, toastNode] = useToast();
  const [payments, setPayments] = useState(PAYMENTS);

  const options = RESIDENTS.map((r) => `${r.nama} · ${r.kamar}`);
  const [penghuni, setPenghuni] = useState(options[0]);
  const [tipe, setTipe] = useState('Bulanan');
  const [metode, setMetode] = useState('Transfer');
  const [periode, setPeriode] = useState('Oktober 2026');
  const [nominal, setNominal] = useState('1200000');
  const [errNominal, setErrNominal] = useState<string | null>(null);
  const [saved, setSaved] = useState<KuitansiTersimpan | null>(null); // snapshot kuitansi yang sudah disimpan

  const [nm, rm] = penghuni.split(' · ');

  // kuitansi mengikuti form (live preview); nomor tetap bila sama dengan yang tersimpan
  const kt = formatRupiah(nominal);
  const kp = `Sewa ${tipe.toLowerCase()} – ${periode}`;
  const nextNo = 'No. KW/2026/10/' + String(143 + payments.length + 1).padStart(4, '0');
  const sameAsSaved = !!saved && saved.nm === nm && saved.kp === kp && saved.km === metode && saved.kt === kt;
  const kw: DataKuitansi = { nm, rm, kp, km: metode, kt, tgl: tanggalPanjang(), kno: sameAsSaved && saved ? saved.kno : nextNo };

  const simpan = () => {
    if (!(Number(nominal) > 0)) {
      setErrNominal('Nominal wajib diisi');
      return;
    }
    setErrNominal(null);
    setPayments((list) => [{ id: 'p' + Date.now(), nama: nm, metode, nominal: kt, periode }, ...list]);
    setSaved({ nm, kp, km: metode, kt, kno: nextNo });
    toast('Pembayaran tersimpan ✓');
  };

  const bagikan = async () => {
    const pesan =
      `KUITANSI KOS BIMA PUTRA\n${kw.kno}\n\n` +
      `Diterima dari : ${kw.nm}\nNo. Kamar     : ${kw.rm}\nPembayaran    : ${kw.kp}\n` +
      `Metode        : ${kw.km}\nTanggal       : ${kw.tgl}\nJumlah        : ${kw.kt}\n\nStatus: LUNAS`;
    try {
      await Share.share({ message: pesan });
    } catch (e) {
      toast('Kuitansi tidak dapat dibagikan');
    }
  };

  const header = (
    <View style={{ marginBottom: 16 }}>
      {/* form pencatatan transaksi */}
      <Txt style={s.h1}>Catat Pembayaran</Txt>
      <CustomCard style={{ marginTop: 12 }}>
        <Select label="Penghuni" value={penghuni} options={options} onChange={setPenghuni} style={{ marginTop: 0 }} />
        <FieldLabel>Tipe sewa</FieldLabel>
        <SegmentedControl options={['Bulanan', 'Harian']} value={tipe} onChange={setTipe} />
        <FieldLabel>Metode</FieldLabel>
        <SegmentedControl options={['Transfer', 'Cash']} value={metode} onChange={setMetode} />
        <CustomInput label="Periode" value={periode} onChangeText={setPeriode} autoCapitalize="words" />
        <CustomInput
          label="Nominal (Rp)"
          value={nominal}
          onChangeText={(t) => { setNominal(t.replace(/\D/g, '')); setErrNominal(null); }}
          keyboardType="numeric"
          error={errNominal}
        />
        <CustomButton title="Simpan & Buat Kuitansi" icon="receipt" block style={{ marginTop: 20 }} onPress={simpan} />
      </CustomCard>

      {/* preview kuitansi digital */}
      <View style={s.previewHead}>
        <Txt style={s.h2}>Preview Kuitansi Digital</Txt>
        {sameAsSaved ? <Badge text="Tersimpan" tone="ok" /> : <Badge text="Pratinjau" tone="wn" />}
      </View>
      <View style={s.desk}>
        <Kuitansi d={kw} />
        <View style={s.acts}>
          <CustomButton title="Cetak PDF" icon="print" onPress={() => toast('Simulasi: kuitansi diekspor ke PDF')} />
          <CustomButton title="Bagikan ke WhatsApp" icon="logo-whatsapp" type="wa" onPress={bagikan} />
        </View>
      </View>
    </View>
  );

  const sections: Seksi[] = [
    { key: 'riwayat', title: 'Riwayat Transaksi', data: payments },
    { key: 'late', title: 'Terlambat Bayar', data: LATE },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 18, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={header}
          renderSectionHeader={({ section }) => (
            <CardHead>
              {section.key === 'late' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="warning" size={16} color={C.er} />
                  <Txt style={{ fontSize: 16, fontWeight: '700', color: C.er }}>{section.title}</Txt>
                </View>
              ) : (
                <Txt style={{ fontSize: 16, fontWeight: '700' }}>{section.title}</Txt>
              )}
            </CardHead>
          )}
          renderSectionFooter={() => <View style={{ height: 16 }} />}
          renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            if ('label' in item) {
              return (
                <CardRow isLast={isLast}>
                  <View style={s.between}>
                    <View style={{ flex: 1 }}>
                      <Txt>{item.label}</Txt>
                      <Txt style={s.small}>{item.info}</Txt>
                    </View>
                    <CustomButton title="Ingatkan" type="ghost" size="sm" onPress={() => toast('Pengingat dikirim via WhatsApp')} />
                  </View>
                </CardRow>
              );
            }
            return (
              <CardRow isLast={isLast}>
                <View style={s.between}>
                  <View style={{ flex: 1 }}>
                    <Txt>{item.nama}</Txt>
                    <Txt style={s.small}>{item.metode} · {item.periode}</Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Txt style={{ fontWeight: '700' }}>{item.nominal}</Txt>
                    <Badge text="Lunas" tone="ok" />
                  </View>
                </View>
              </CardRow>
            );
          }}
        />
      </KeyboardAvoidingView>
      {toastNode}
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
  errText: { color: C.er, fontSize: 12, marginTop: 4 },
  selList: { marginTop: 4, backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderRadius: 9, overflow: 'hidden' },
  selOpt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 },
  seg: { flexDirection: 'row', backgroundColor: C.bg, borderWidth: 1, borderColor: C.bd, borderRadius: 9, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center', marginHorizontal: 1.5 },
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
  h2: { fontSize: 16, fontWeight: '700' },
  small: { color: C.mut, fontSize: 12, marginTop: 2 },
  between: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  desk: { backgroundColor: '#CBD5E1', borderRadius: 16, padding: 14, gap: 16 },
  acts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },

  /* kertas kuitansi */
  paper: {
    backgroundColor: '#fff', padding: 22, borderTopWidth: 6, borderTopColor: C.navy,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  c: { textAlign: 'center', color: C.mut, fontSize: 12 },
  paperH: { textAlign: 'center', letterSpacing: 3, fontSize: 20, fontWeight: '700', color: C.navy, marginTop: 10, marginBottom: 2 },
  stamp: {
    position: 'absolute', right: 20, top: 92, borderWidth: 3, borderColor: C.ok, borderRadius: 6,
    paddingVertical: 2, paddingHorizontal: 14, opacity: 0.8, transform: [{ rotate: '-12deg' }],
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#CBD5E1', borderStyle: 'dashed',
  },
  tot: { backgroundColor: '#F1F5F9', padding: 14, marginVertical: 16, flexDirection: 'row', justifyContent: 'space-between' },
  sign: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  signTxt: { fontSize: 12, color: C.mut },
});
