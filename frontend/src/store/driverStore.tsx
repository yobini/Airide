import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import Constants from "expo-constants";
import { MMKV } from "react-native-mmkv";

// Types
export type Vehicle = { make: string; model: string; plate: string; color?: string; year?: number };
export type Driver = {
  id: string;
  name: string;
  phone: string;
  vehicle: Vehicle;
  online: boolean;
  created_at: string;
  updated_at: string;
  latest_location?: any;
};

type Ctx = {
  apiBase: string;
  driver: Driver | null;
  setDriver: (d: Driver | null) => void;
  registerDriver: (payload: { name: string; phone: string; vehicle: Vehicle }) => Promise<Driver>;
  toggleOnline: (driverId: string, nextOnline: boolean) => Promise<Driver>;
  sendLocation: (driverId: string, body: { lat: number; lng: number }) => Promise<Driver>;
  refetchDriver: (driverId: string) => Promise<Driver>;
  createTrip: (driverId: string, fare: number) => Promise<any>;
};

const BACKEND_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || (Constants as any).expoConfig?.extra?.backendUrl || "";

const DriverContext = createContext<Ctx | undefined>(undefined);
const storage = new MMKV({ id: "airide-driver" });
const DRIVER_KEY = "driver_json";

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const apiBase = useMemo(() => `${BACKEND_BASE}/api`, []);
  const [driver, _setDriver] = useState<Driver | null>(null);

  // Load from MMKV on mount
  useEffect(() => {
    try {
      const raw = storage.getString(DRIVER_KEY);
      if (raw) {
        const parsed: Driver = JSON.parse(raw);
        _setDriver(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Persist changes
  const setDriver = (d: Driver | null) => {
    _setDriver(d);
    try {
      if (d) storage.set(DRIVER_KEY, JSON.stringify(d));
      else storage.delete(DRIVER_KEY);
    } catch (e) {
      // ignore
    }
  };

  const registerDriver = async (payload: { name: string; phone: string; vehicle: Vehicle }) => {
    const res = await fetch(`${apiBase}/drivers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Register failed (${res.status})`);
    return res.json();
  };

  const toggleOnline = async (driverId: string, nextOnline: boolean) => {
    const path = nextOnline ? "online" : "offline";
    const res = await fetch(`${apiBase}/drivers/${driverId}/${path}`, { method: "POST" });
    if (!res.ok) throw new Error(`Status change failed (${res.status})`);
    return res.json();
  };

  const sendLocation = async (driverId: string, body: { lat: number; lng: number }) => {
    const res = await fetch(`${apiBase}/drivers/${driverId}/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Location failed (${res.status})`);
    return res.json();
  };

  const refetchDriver = async (driverId: string) => {
    const res = await fetch(`${apiBase}/drivers/${driverId}`);
    if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
    return res.json();
  };

  const createTrip = async (driverId: string, fare: number) => {
    const res = await fetch(`${apiBase}/drivers/${driverId}/trips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fare }),
    });
    if (!res.ok) throw new Error(`Create trip failed (${res.status})`);
    return res.json();
  };

  const value = { apiBase, driver, setDriver, registerDriver, toggleOnline, sendLocation, refetchDriver, createTrip };
  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDriver must be used within DriverProvider");
  return ctx;
}