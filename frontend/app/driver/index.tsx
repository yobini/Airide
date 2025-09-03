import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import Constants from "expo-constants";

const BACKEND_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backendUrl || "";

// Types
interface Vehicle {
  make: string;
  model: string;
  plate: string;
  color?: string;
  year?: number;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: Vehicle;
  online: boolean;
  created_at: string;
  updated_at: string;
  latest_location?: {
    id: string;
    driver_id: string;
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  } | null;
}

export default function DriverScreen() {
  const apiBase = useMemo(() => `${BACKEND_BASE}/api`, []);

  // Registration state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle>({ make: "", model: "", plate: "", color: "", year: undefined });
  const [driver, setDriver] = useState<Driver | null>(null);

  // Dashboard state
  const [sending, setSending] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!name.trim() || !phone.trim() || !vehicle.make.trim() || !vehicle.model.trim() || !vehicle.plate.trim()) {
      setError("Please fill name, phone, vehicle make/model/plate");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const body = { name: name.trim(), phone: phone.trim(), vehicle: { ...vehicle, year: vehicle.year ? Number(vehicle.year) : undefined } } as any;
      const res = await fetch(`${apiBase}/drivers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Register failed (${res.status})`);
      const data: Driver = await res.json();
      setDriver(data);
    } catch (e: any) {
      setError(e.message || "Register failed");
    } finally {
      setSending(false);
    }
  }, [apiBase, name, phone, vehicle]);

  const fetchDriver = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/drivers/${id}`);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data: Driver = await res.json();
      setDriver(data);
    } catch (e: any) {
      setError(e.message || "Fetch failed");
    }
  }, [apiBase]);

  const toggleOnline = useCallback(async () => {
    if (!driver) return;
    setSending(true);
    setError(null);
    try {
      const path = driver.online ? "offline" : "online";
      const res = await fetch(`${apiBase}/drivers/${driver.id}/${path}`, { method: "POST" });
      if (!res.ok) throw new Error(`Status change failed (${res.status})`);
      const data: Driver = await res.json();
      setDriver(data);
    } catch (e: any) {
      setError(e.message || "Status change failed");
    } finally {
      setSending(false);
    }
  }, [apiBase, driver]);

  const sendLocation = useCallback(async () => {
    if (!driver) return;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setError("Invalid lat/lng");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/drivers/${driver.id}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: latNum, lng: lngNum }),
      });
      if (!res.ok) throw new Error(`Location failed (${res.status})`);
      const data: Driver = await res.json();
      setDriver(data);
      setLat("");
      setLng("");
    } catch (e: any) {
      setError(e.message || "Location update failed");
    } finally {
      setSending(false);
    }
  }, [apiBase, driver, lat, lng]);

  // Simple in-app logo (text-based)
  const Logo = () => (
    <View style={styles.logoRow}>
      <View style={styles.logoDot} />
      <Text style={styles.logoText}>Airide Driver</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Logo />

          {!driver ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Register Driver</Text>
              {error ? (
                <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
              ) : null}

              <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#8A8A8A" value={name} onChangeText={setName} />
              <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#8A8A8A" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

              <Text style={styles.label}>Vehicle</Text>
              <TextInput style={styles.input} placeholder="Make" placeholderTextColor="#8A8A8A" value={vehicle.make} onChangeText={(t) => setVehicle(v => ({ ...v, make: t }))} />
              <TextInput style={styles.input} placeholder="Model" placeholderTextColor="#8A8A8A" value={vehicle.model} onChangeText={(t) => setVehicle(v => ({ ...v, model: t }))} />
              <TextInput style={styles.input} placeholder="Plate" placeholderTextColor="#8A8A8A" value={vehicle.plate} onChangeText={(t) => setVehicle(v => ({ ...v, plate: t }))} autoCapitalize="characters" />
              <TextInput style={styles.input} placeholder="Color (optional)" placeholderTextColor="#8A8A8A" value={vehicle.color} onChangeText={(t) => setVehicle(v => ({ ...v, color: t }))} />
              <TextInput style={styles.input} placeholder="Year (optional)" placeholderTextColor="#8A8A8A" value={vehicle.year ? String(vehicle.year) : ""} onChangeText={(t) => setVehicle(v => ({ ...v, year: t ? Number(t) : undefined }))} keyboardType="numeric" />

              <TouchableOpacity style={styles.primaryBtn} onPress={register} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Driver Dashboard</Text>
              {error ? (
                <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
              ) : null}

              <Text style={styles.infoText}>ID: {driver.id}</Text>
              <Text style={styles.infoText}>Name: {driver.name}</Text>
              <Text style={styles.infoText}>Phone: {driver.phone}</Text>
              <Text style={styles.infoText}>Vehicle: {driver.vehicle.make} {driver.vehicle.model} • {driver.vehicle.plate}</Text>
              <Text style={styles.infoText}>Status: <Text style={{ color: driver.online ? '#22c55e' : '#ef4444' }}>{driver.online ? 'Online' : 'Offline'}</Text></Text>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: driver.online ? '#ef4444' : '#22c55e' }]} onPress={toggleOnline} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{driver.online ? 'Go Offline' : 'Go Online'}</Text>}
              </TouchableOpacity>

              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Latitude" placeholderTextColor="#8A8A8A" keyboardType="numeric" value={lat} onChangeText={setLat} />
                <View style={{ width: 8 }} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Longitude" placeholderTextColor="#8A8A8A" keyboardType="numeric" value={lng} onChangeText={setLng} />
              </View>
              <TouchableOpacity style={styles.secondaryBtn} onPress={sendLocation} disabled={sending || !lat || !lng}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Location</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.ghostBtn} onPress={() => fetchDriver(driver.id)}>
                <Text style={styles.ghostText}>Refresh</Text>
              </TouchableOpacity>

              <Text style={styles.muted}>Connected to: {BACKEND_BASE || '(not set)'} </Text>
              {driver.latest_location ? (
                <View style={styles.locationBox}>
                  <Text style={styles.infoText}>Last Location: {driver.latest_location.lat}, {driver.latest_location.lng}</Text>
                  <Text style={styles.muted}>At: {new Date(driver.latest_location.timestamp).toLocaleString()}</Text>
                </View>
              ) : (
                <Text style={styles.muted}>No location yet.</Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0c0c0c' },
  container: { flexGrow: 1, padding: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logoDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4F46E5', marginRight: 8 },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  card: { backgroundColor: '#141414', borderWidth: 1, borderColor: '#232323', borderRadius: 12, padding: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { height: 48, borderRadius: 10, borderWidth: 1, borderColor: '#2a2a2a', paddingHorizontal: 12, color: '#fff', backgroundColor: '#1a1a1a', marginBottom: 10 },
  label: { color: '#c7c7c7', marginTop: 8, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  primaryBtn: { height: 48, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryBtn: { height: 48, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ghostBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ghostText: { color: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: '700' },
  errorBox: { backgroundColor: '#3b1a1a', borderColor: '#5e2a2a', borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12 },
  errorText: { color: '#ffb4b4' },
  infoText: { color: '#e5e7eb', marginTop: 4 },
  muted: { color: '#9ca3af', marginTop: 4 },
  locationBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#232323' },
});