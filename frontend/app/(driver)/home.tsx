import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import { useDriver } from "../../src/store/driverStore";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const regSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  make: z.string().min(1, "Required"),
  model: z.string().min(1, "Required"),
  plate: z.string().min(1, "Required"),
  color: z.string().optional(),
  year: z.string().optional(),
});

type RegForm = z.infer<typeof regSchema>;

export default function HomeScreen() {
  const { driver, setDriver, registerDriver, toggleOnline, sendLocation, refetchDriver } = useDriver();
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegForm>({
    resolver: zodResolver(regSchema),
    defaultValues: { name: "", phone: "", make: "", model: "", plate: "", color: "", year: "" },
  });

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params?.id as string | undefined;
    if (id && !driver) {
      refetchDriver(id).then(setDriver).catch(() => {});
    }
  }, [params?.id]);

  const onRegister = useCallback(async (form: RegForm) => {
    setError(null);
    try {
      const d = await registerDriver({
        name: form.name,
        phone: form.phone,
        vehicle: { make: form.make, model: form.model, plate: form.plate, color: form.color || undefined, year: form.year ? Number(form.year) : undefined },
      });
      setDriver(d);
      router.replace({ pathname: "./home", params: { id: d.id } });
    } catch (e: any) {
      setError(e.message || "Register failed");
    }
  }, [registerDriver, setDriver, router]);

  const onToggle = useCallback(async () => {
    if (!driver) return;
    setSending(true);
    setError(null);
    try {
      const d = await toggleOnline(driver.id, !driver.online);
      setDriver(d);
    } catch (e: any) {
      setError(e.message || "Status change failed");
    } finally {
      setSending(false);
    }
  }, [driver, toggleOnline, setDriver]);

  const onSendLocation = useCallback(async () => {
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
      const d = await sendLocation(driver.id, { lat: latNum, lng: lngNum });
      setDriver(d);
      setLat("");
      setLng("");
    } catch (e: any) {
      setError(e.message || "Location update failed");
    } finally {
      setSending(false);
    }
  }, [driver, lat, lng, sendLocation, setDriver]);

  const requestAndSendCurrentLocation = useCallback(async () => {
    if (!driver) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed to send current location.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const d = await sendLocation(driver.id, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      setDriver(d);
    } catch (e: any) {
      setError(e.message || "Unable to get current location");
    }
  }, [driver, sendLocation, setDriver]);

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
              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

              {/* Simple controlled inputs with RHF via setValue */}
              <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#8A8A8A" onChangeText={(t)=>setValue('name', t)} />
              {errors.name ? <Text style={styles.errText}>{errors.name.message}</Text> : null}

              <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#8A8A8A" keyboardType="phone-pad" onChangeText={(t)=>setValue('phone', t)} />
              {errors.phone ? <Text style={styles.errText}>{errors.phone.message}</Text> : null}

              <Text style={styles.label}>Vehicle</Text>
              <TextInput style={styles.input} placeholder="Make" placeholderTextColor="#8A8A8A" onChangeText={(t)=>setValue('make', t)} />
              {errors.make ? <Text style={styles.errText}>{errors.make.message}</Text> : null}
              <TextInput style={styles.input} placeholder="Model" placeholderTextColor="#8A8A8A" onChangeText={(t)=>setValue('model', t)} />
              {errors.model ? <Text style={styles.errText}>{errors.model.message}</Text> : null}
              <TextInput style={styles.input} placeholder="Plate" placeholderTextColor="#8A8A8A" autoCapitalize="characters" onChangeText={(t)=>setValue('plate', t)} />
              {errors.plate ? <Text style={styles.errText}>{errors.plate.message}</Text> : null}

              <TextInput style={styles.input} placeholder="Color (optional)" placeholderTextColor="#8A8A8A" onChangeText={(t)=>setValue('color', t)} />
              <TextInput style={styles.input} placeholder="Year (optional)" placeholderTextColor="#8A8A8A" keyboardType="numeric" onChangeText={(t)=>setValue('year', t)} />

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit(onRegister)} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Driver Dashboard</Text>
              {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
              <Text style={styles.infoText}>ID: {driver.id}</Text>
              <Text style={styles.infoText}>Name: {driver.name}</Text>
              <Text style={styles.infoText}>Phone: {driver.phone}</Text>
              <Text style={styles.infoText}>Vehicle: {driver.vehicle.make} {driver.vehicle.model} • {driver.vehicle.plate}</Text>
              <Text style={styles.infoText}>Status: <Text style={{ color: driver.online ? '#22c55e' : '#ef4444' }}>{driver.online ? 'Online' : 'Offline'}</Text></Text>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: driver.online ? '#ef4444' : '#22c55e' }]} onPress={onToggle} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{driver.online ? 'Go Offline' : 'Go Online'}</Text>}
              </TouchableOpacity>

              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Latitude" placeholderTextColor="#8A8A8A" keyboardType="numeric" value={lat} onChangeText={setLat} />
                <View style={{ width: 8 }} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Longitude" placeholderTextColor="#8A8A8A" keyboardType="numeric" value={lng} onChangeText={setLng} />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={onSendLocation} disabled={sending || !lat || !lng}>
                  {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Location</Text>}
                </TouchableOpacity>
                <View style={{ width: 8 }} />
                <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, backgroundColor: '#22c55e' }]} onPress={requestAndSendCurrentLocation}>
                  <Text style={styles.btnText}>Use Current Location</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.ghostBtn} onPress={() => driver && refetchDriver(driver.id).then(setDriver)}>
                <Text style={styles.ghostText}>Refresh</Text>
              </TouchableOpacity>
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
  errText: { color: '#ffb4b4', marginTop: -6, marginBottom: 8, marginLeft: 4 },
});