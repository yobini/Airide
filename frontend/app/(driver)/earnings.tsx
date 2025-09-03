import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { useDriver } from "../../src/store/driverStore";

type TripWithFee = { id: string; fare: number; service_fee: number; created_at: string };

type EarningsSummary = {
  driver_id: string;
  start: string;
  end: string;
  trip_count: number;
  total_fares: number;
  total_service_fees: number;
  net_amount: number;
  trips: TripWithFee[];
};

function getWeekRange(date: Date) {
  // Monday (1) to Saturday (6) inclusive
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun,1=Mon
  const diffToMonday = day === 0 ? 6 : day - 1; // if Sunday, go back 6 days
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diffToMonday);
  const saturday = new Date(monday);
  saturday.setUTCDate(monday.getUTCDate() + 5);
  // set times
  const start = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0));
  const end = new Date(Date.UTC(saturday.getUTCFullYear(), saturday.getUTCMonth(), saturday.getUTCDate(), 23, 59, 59));
  return { start, end };
}

export default function EarningsScreen() {
  const { driver, apiBase, createTrip } = useDriver();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Date>(new Date()); // current week cursor
  const [fareInput, setFareInput] = useState("");
  const [adding, setAdding] = useState(false);

  const { start, end } = useMemo(() => getWeekRange(cursor), [cursor]);

  const fetchEarnings = async () => {
    if (!driver) return;
    setLoading(true);
    setError(null);
    try {
      const q = `start=${start.toISOString()}&end=${end.toISOString()}`;
      const res = await fetch(`${apiBase}/drivers/${driver.id}/earnings?${q}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data: EarningsSummary = await res.json();
      setSummary(data);
    } catch (e: any) {
      setError(e.message || "Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id, start.toISOString(), end.toISOString()]);

  const onAddTrip = async () => {
    if (!driver) return;
    const fare = Number(fareInput);
    if (Number.isNaN(fare) || fare <= 0) {
      setError("Enter a valid fare > 0");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await createTrip(driver.id, fare);
      setFareInput("");
      await fetchEarnings();
    } catch (e: any) {
      setError(e.message || "Add trip failed");
    } finally {
      setAdding(false);
    }
  };

  if (!driver) {
    return (
      <SafeAreaView style={styles.safe}><View style={styles.center}><Text style={styles.muted}>Register a driver first in Home.</Text></View></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCursor(new Date(cursor.getTime() - 7 * 86400000))}><Text style={styles.nav}>{"<"} Prev</Text></TouchableOpacity>
        <Text style={styles.title}>Weekly Earnings</Text>
        <TouchableOpacity onPress={() => setCursor(new Date(cursor.getTime() + 7 * 86400000))}><Text style={styles.nav}>Next {">"}</Text></TouchableOpacity>
      </View>
      <Text style={styles.muted}>Week: {start.toUTCString().slice(0, 16)} - {end.toUTCString().slice(0, 16)}</Text>

      <View style={styles.addRow}>
        <Text style={styles.muted}>Quick Add Trip</Text>
        <View style={{ height: 8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput value={fareInput} onChangeText={setFareInput} placeholder="Fare (e.g., 12.50)" placeholderTextColor="#8A8A8A" keyboardType="numeric" style={[styles.input, { flex: 1 }]} />
          <View style={{ width: 8 }} />
          <TouchableOpacity style={styles.addBtn} onPress={onAddTrip} disabled={adding || !fareInput}>
            {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Add</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#4F46E5" /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text></View>
      ) : summary ? (
        <View style={{ flex: 1 }}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Trips</Text>
              <Text style={styles.summaryValue}>{summary.trip_count}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Fares</Text>
              <Text style={styles.summaryValue}>${summary.total_fares.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Service Fees</Text>
              <Text style={styles.summaryValue}>${summary.total_service_fees.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net</Text>
              <Text style={styles.summaryValue}>${summary.net_amount.toFixed(2)}</Text>
            </View>
          </View>
          <FlatList
            data={[...summary.trips].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.itemTitle}>${item.fare.toFixed(2)}</Text>
                <Text style={styles.itemSub}>Fee: ${item.service_fee.toFixed(2)}</Text>
                <Text style={styles.itemSub}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            )}
            ListEmptyComponent={<View style={styles.center}><Text style={styles.muted}>No trips this week.</Text></View>}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      ) : (
        <View style={styles.center}><Text style={styles.muted}>No data.</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0c0c0c' },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  nav: { color: '#93c5fd' },
  muted: { color: '#9ca3af', paddingHorizontal: 16 },
  error: { color: '#ffb4b4', paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, color: '#fff', backgroundColor: '#1a1a1a' },
  addBtn: { height: 48, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  summaryCard: { backgroundColor: '#141414', borderColor: '#232323', borderWidth: 1, borderRadius: 12, padding: 12, minWidth: '46%' },
  summaryLabel: { color: '#c7c7c7', fontSize: 12 },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },
  item: { backgroundColor: '#141414', borderColor: '#232323', borderWidth: 1, borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 8 },
  itemTitle: { color: '#fff', fontWeight: '700' },
  itemSub: { color: '#9ca3af', marginTop: 2 },
});