import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";

// Use Expo env. All backend routes go through /api prefix per ingress rules.
const BACKEND_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backendUrl || "";

// Types
interface StatusCheck {
  id: string;
  client_name: string;
  timestamp: string;
}

export default function Index() {
  const [clientName, setClientName] = useState("");
  const [items, setItems] = useState<StatusCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const apiUrl = useMemo(() => `${BACKEND_BASE}/api`, []);

  const fetchItems = useCallback(async () => {
    if (!apiUrl) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/status`);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data: StatusCheck[] = await res.json();
      setItems(data.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)));
    } catch (e: any) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, [fetchItems]);

  const submit = useCallback(async () => {
    if (!clientName.trim()) return;
    if (!apiUrl) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: clientName.trim() }),
      });
      if (!res.ok) throw new Error(`Failed to submit (${res.status})`);
      const created: StatusCheck = await res.json();
      setItems((prev) => [created, ...prev]);
      setClientName("");
      Keyboard.dismiss();
    } catch (e: any) {
      setError(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }, [apiUrl, clientName]);

  const renderItem = ({ item }: { item: StatusCheck }) => {
    const date = new Date(item.timestamp);
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.client_name}</Text>
        <Text style={styles.cardSub}>{date.toLocaleString()}</Text>
        <Text style={styles.cardId}>{item.id}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}> 
          <Text style={styles.title}>Status Checks</Text>
          <Text style={styles.subtitle}>Connected to: {BACKEND_BASE || "(not set)"}</Text>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            placeholder="Enter client name"
            placeholderTextColor="#8A8A8A"
            value={clientName}
            onChangeText={setClientName}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <TouchableOpacity
            onPress={submit}
            style={[styles.button, !clientName.trim() || submitting ? styles.buttonDisabled : undefined]}
            disabled={!clientName.trim() || submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Add</Text>}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No status checks yet. Add one above.</Text>
              </View>
            )}
            contentContainerStyle={items.length === 0 ? styles.listEmptyContainer : undefined}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0c0c0c" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  header: { marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 4 },
  subtitle: { fontSize: 12, color: "#c7c7c7" },
  inputRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 12 },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 12,
    color: "#fff",
    backgroundColor: "#1a1a1a",
  },
  button: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700" },
  errorBox: {
    backgroundColor: "#3b1a1a",
    borderColor: "#5e2a2a",
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: { color: "#ffb4b4" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 8, color: "#c7c7c7" },
  emptyText: { color: "#c7c7c7", textAlign: "center" },
  listEmptyContainer: { flexGrow: 1, justifyContent: "center" },
  card: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#232323",
    marginBottom: 10,
  },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cardSub: { color: "#bdbdbd", marginTop: 2 },
  cardId: { color: "#7a7a7a", marginTop: 8, fontSize: 12 },
});