import React, { createContext, useContext, useMemo, useState } from "react";
import Constants from "expo-constants";

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
};

const BACKEND_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || (Constants as any).expoConfig?.extra?.backendUrl || "";

const DriverContext = createContext<Ctx | undefined>(undefined);

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const apiBase = useMemo(() => `${BACKEND_BASE}/api`, []);
  const [driver, setDriver] = useState<Driver | null>(null);

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

  const value = { apiBase, driver, setDriver, registerDriver, toggleOnline, sendLocation, refetchDriver };
  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
}

export function useDriver() {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error("useDriver must be used within DriverProvider");
  return ctx;
}