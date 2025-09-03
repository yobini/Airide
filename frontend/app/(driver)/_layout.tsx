import React from "react";
import { Tabs } from "expo-router";
import { Text } from "react-native";
import { DriverProvider } from "../../src/store/driverStore";

export default function Layout() {
  return (
    <DriverProvider>
      <Tabs screenOptions={{
        headerStyle: { backgroundColor: "#0c0c0c" },
        headerTintColor: "#fff",
        tabBarStyle: { backgroundColor: "#0c0c0c", borderTopColor: "#1f1f1f" },
        tabBarActiveTintColor: "#4F46E5",
        tabBarInactiveTintColor: "#9ca3af",
      }}>
        <Tabs.Screen name="home" options={{ title: "Home" }} />
        <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
      </Tabs>
    </DriverProvider>
  );
}