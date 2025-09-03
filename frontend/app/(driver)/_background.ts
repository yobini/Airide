import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";

export const BACKGROUND_TASK = "airide-driver-location";

TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
    return;
  }
  const { locations } = data as any;
  // We do not send from here to avoid waking network too often.
  // Instead, Home screen will actively pull current foreground location when needed.
  // If you want to push in background, wire an event emitter to store and throttle network calls.
  console.log("Background locations:", locations?.length || 0);
});