/* === ANGGOTA 4: HANIFA (PENGELOLA) — SCREEN 8: KELUHAN (KANBAN) ===
   File mandiri: UI + komponen kecil + data dummy ada di file ini. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, SectionList, Animated, KeyboardAvoidingView, Platform, StatusBar, StyleSheet,
} from 'react-native';
import type { TextProps, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { AdminTabParamList } from '../RootNavigator';

/* ============ TIPE ============ */
type IconName = ComponentProps<typeof Ionicons>['name'];
type Props = BottomTabScreenProps<AdminTabParamList, 'Keluhan'>;
type Tone = 'ok' | 'wn' | 'er' | 'ac' | 'pu';
type Prio = 'h' | 'm' | 'l';
type Tiket = { id: string; judul: string; info: string; prio: Prio; kol: number };
type Catatan = { id: string; teks: string; done: boolean };

/* ============ TEMA ============ */
const C = {
  navy: '#1E293B', acc: '#2563EB', bg: '#F8FAFC', surf: '#FFFFFF', txt: '#1E293B', mut: '#64748B',
  bd: '#E2E8F0', ok: '#16A34A', okb: '#DCFCE7', wn: '#B45309', wnb: '#FEF3C7', er: '#DC2626', erb: '#FEE2E2',
  accb: '#DBEAFE', pu: '#7C3AED', pub: '#EDE9FE',
};
const F = { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };
const FAMILY: Record<string, string> = { normal: F.regular, 400: F.regular, 500: F.medium, 600: F.semibold, 700: F.bold, bold: F.bold, 800: F.bold };
const GRAD_PRIMARY = ['#1E293B', '#2563EB'] as const;
const G_START = { x: 0, y: 0 };
const G_END = { x: 1, y: 1 };
const SHADOW_BTN = { shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 };

/* ============ DATA DUMMY ============ */
// prio: h = Urgent, m = Sedang, l = Rendah | kol = indeks kolom pada TICKET_COLS
const TICKET_COLS = ['Masuk', 'Ditangani Mandiri', 'Perlu Teknisi', 'Selesai'];
const TICKETS: Tiket[] = [
  { id: 't1', judul: 'Wi-Fi lantai 2 lambat', info: 'B-05 · 17 Okt', prio: 'm', kol: 0 },
  { id: 't2', judul: 'Keran bocor', info: 'A-08 · 17 Okt', prio: 'h', kol: 0 },
  { id: 't3', judul: 'Lampu koridor mati', info: 'Koridor A · 16 Okt', prio: 'l', kol: 1 },
  { id: 't4', judul: 'Air mati', info: 'C-04 · 15 Okt', prio: 'h', kol: 2 },
  { id: 't5', judul: 'Atap bocor saat hujan', info: 'B-12 · 12 Okt', prio: 'h', kol: 2 },
  { id: 't6', judul: 'Kunci kamar macet', info: 'A-01 · 10 Okt', prio: 'l', kol: 3 },
];

const NOTES: Catatan[] = [
  { id: 'n1', teks: 'Telepon tukang ledeng untuk keran A-08', done: false },
  { id: 'n2', teks: 'Cek listrik koridor hari Senin', done: false },
  { id: 'n3', teks: 'Follow up atap bocor B-12 (sudah 6 hari!)', done: false },
];

const COL_COLOR = [C.acc, '#8B5CF6', '#F59E0B', C.ok]; // garis atas tiap kolom
const COL_TONE: Tone[] = ['ac', 'pu', 'wn', 'ok'];
const PRIO: Record<Prio, { label: string; tone: Tone; color: string }> = {
  h: { label: 'Urgent', tone: 'er', color: C.er },
  m: { label: 'Sedang', tone: 'wn', color: C.wn },
  l: { label: 'Rendah', tone: 'ac', color: C.acc },
};

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
  pu: { bg: C.pub, fg: C.pu },
};

function Badge({ text, tone = 'ac', dot = true }: { text: string; tone?: Tone; dot?: boolean }) {
  const t = TONES[tone] || TONES.ac;
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      {dot ? <View style={[s.badgeDot, { backgroundColor: t.fg }]} /> : null}
      <Txt style={{ color: t.fg, fontSize: 12, fontWeight: '600' }}>{text}</Txt>
    </View>
  );
}

// tombol kecil: ghost (teks + ikon) atau primary (ikon saja)
function CustomButton({ title, icon, onPress, ghost = false }: {
  title?: string;
  icon?: IconName;
  onPress: () => void;
  ghost?: boolean;
}) {
  const color = ghost ? C.acc : '#fff';
  const content = (
    <View style={s.btnRow}>
      {icon ? <Ionicons name={icon} size={14} color={color} style={{ marginRight: title ? 6 : 0 }} /> : null}
      {title ? <Txt style={{ color, fontSize: 12, fontWeight: '600' }}>{title}</Txt> : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [{ borderRadius: 9, backgroundColor: ghost ? 'transparent' : C.acc }, !ghost && SHADOW_BTN, pressed && { opacity: 0.85 }]}
    >
      {ghost ? (
        <View style={{ borderWidth: 1, borderColor: C.acc, borderRadius: 9 }}>{content}</View>
      ) : (
        <LinearGradient colors={GRAD_PRIMARY} start={G_START} end={G_END} style={{ borderRadius: 9 }}>
          {content}
        </LinearGradient>
      )}
    </Pressable>
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

/* ============ SCREEN 8: KELUHAN (KANBAN) ============ */
export default function KeluhanAdminScreen({ navigation }: Props) {
  const [toast, toastNode] = useToast();
  const [tickets, setTickets] = useState(TICKETS);
  const [notes, setNotes] = useState(NOTES);
  const [tab, setTab] = useState('Semua');
  const [nn, setNn] = useState('');

  // pindahkan tiket satu kolom ke kanan
  const pindah = (id: string) => {
    const t = tickets.find((x) => x.id === id);
    if (!t || t.kol >= TICKET_COLS.length - 1) return;
    setTickets((list) => list.map((x) => (x.id === id ? { ...x, kol: x.kol + 1 } : x)));
    toast('Tiket dipindahkan ke: ' + TICKET_COLS[t.kol + 1]);
  };

  const toggleNote = (id: string) => setNotes((list) => list.map((n) => (n.id === id ? { ...n, done: !n.done } : n)));

  const tambahCatatan = () => {
    const v = nn.trim();
    if (!v) return;
    setNotes((list) => [...list, { id: 'n' + Date.now(), teks: v, done: false }]);
    setNn('');
  };

  // satu section per kolom kanban (tab "Semua" menampilkan keempat kolom)
  const sections = TICKET_COLS.map((c, ci) => ({
    key: c,
    ci,
    title: c,
    data: tickets.filter((t) => t.kol === ci),
  })).filter((sec) => tab === 'Semua' || tab === sec.title);

  const header = (
    <View>
      <View style={s.head}>
        <View style={{ flex: 1 }}>
          <Txt style={s.h1}>Monitoring &amp; Tindak Lanjut Keluhan</Txt>
          <Txt style={s.sub}>Pindahkan tiket dengan tombol panah →</Txt>
        </View>
        <CustomButton title="Dashboard" icon="arrow-back" ghost onPress={() => navigation.navigate('Dashboard')} />
      </View>

      {/* tab filter status */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }} contentContainerStyle={{ gap: 6 }}>
        {['Semua', ...TICKET_COLS].map((t) => {
          const on = t === tab;
          return (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, on && s.tabOn]}>
              <Txt style={{ fontWeight: '500', color: on ? '#fff' : C.txt }}>{t}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // sticky note "Pengingat Pengelola"
  const footer = (
    <View style={s.notes}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="pin" size={16} color="#B91C1C" />
        <Txt style={{ fontSize: 14, fontWeight: '700', color: '#422006' }}>Pengingat Pengelola</Txt>
      </View>
      <View style={{ marginTop: 4 }}>
        {notes.map((n) => (
          <Pressable key={n.id} onPress={() => toggleNote(n.id)} style={s.noteRow}>
            <Ionicons name={n.done ? 'checkbox' : 'square-outline'} size={18} color="#422006" style={{ marginTop: 1, marginRight: 8 }} />
            <Txt
              style={{
                flex: 1, fontSize: 13, fontWeight: '500', color: '#422006',
                textDecorationLine: n.done ? 'line-through' : 'none', opacity: n.done ? 0.55 : 1,
              }}
            >
              {n.teks}
            </Txt>
          </Pressable>
        ))}
      </View>
      <View style={s.noteField}>
        <TextInput
          value={nn}
          onChangeText={setNn}
          onSubmitEditing={tambahCatatan}
          returnKeyType="done"
          placeholder="Tulis pengingat… (Enter)"
          placeholderTextColor="#A16207"
          style={s.noteInput}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 18, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          renderSectionHeader={({ section }) => (
            <View style={[s.col, { borderTopColor: COL_COLOR[section.ci] }]}>
              <Txt style={{ fontSize: 13, fontWeight: '700' }}>{section.title.toUpperCase()}</Txt>
              <Badge text={String(section.data.length)} tone="ac" dot={false} />
            </View>
          )}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? <Txt style={s.empty}>Belum ada tiket di kolom ini</Txt> : null
          }
          renderItem={({ item }) => {
            const p = PRIO[item.prio];
            return (
              <View style={[s.tk, { borderLeftColor: p.color }]}>
                <Txt style={{ fontWeight: '700' }}>{item.judul}</Txt>
                <Txt style={s.small}>{item.info}</Txt>
                <View style={s.tkFoot}>
                  <View style={s.badges}>
                    <Badge text={p.label} tone={p.tone} />
                    <Badge text={TICKET_COLS[item.kol]} tone={COL_TONE[item.kol]} />
                  </View>
                  {item.kol < TICKET_COLS.length - 1 ? (
                    <CustomButton icon="arrow-forward" onPress={() => pindah(item.id)} />
                  ) : (
                    <Ionicons name="checkmark-circle" size={22} color={C.ok} />
                  )}
                </View>
              </View>
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
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 10 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', zIndex: 99 },
  toast: {
    backgroundColor: C.navy, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 99, maxWidth: '90%',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  /* layar */
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  h1: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.4 },
  sub: { color: C.mut, fontSize: 12, marginTop: 2 },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.bd, backgroundColor: C.surf },
  tabOn: { backgroundColor: C.navy, borderColor: C.navy },

  /* kolom kanban */
  col: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14,
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderTopWidth: 4, backgroundColor: 'rgba(226,232,240,0.6)',
  },
  empty: { color: C.mut, fontSize: 12, textAlign: 'center', paddingTop: 12 },

  /* kartu tiket */
  tk: {
    backgroundColor: C.surf, borderWidth: 1, borderColor: C.bd, borderLeftWidth: 4, borderRadius: 10, padding: 12, marginTop: 10,
  },
  small: { color: C.mut, fontSize: 12, marginTop: 4, marginBottom: 8 },
  tkFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  /* sticky note kuning */
  notes: {
    backgroundColor: '#FEF08A', borderRadius: 6, padding: 14, marginTop: 24, transform: [{ rotate: '1deg' }],
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 3, height: 4 }, elevation: 5,
  },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 5 },
  noteField: {
    marginTop: 12, borderWidth: 1, borderColor: '#CA8A04', borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 11, minHeight: 42, justifyContent: 'center',
  },
  noteInput: { fontFamily: F.regular, fontSize: 14, color: '#422006', paddingVertical: 9 },
});
