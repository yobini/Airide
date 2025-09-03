import { create } from 'zustand';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  location: Location;
  vehicle: {
    make: string;
    model: string;
    year: string;
    plateNumber: string;
  };
  rating: number;
  isOnline: boolean;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: Location;
  destination: Location;
  status: 'requested' | 'accepted' | 'driverArriving' | 'inProgress' | 'completed' | 'cancelled';
  fare: number;
  distance: number;
  duration: string;
  createdAt: string;
  driver?: Driver;
}

interface RideState {
  currentRide: Ride | null;
  nearbyDrivers: Driver[];
  rideHistory: Ride[];
  isDriverOnline: boolean;
  driverLocation: Location | null;
  
  // Rider actions
  setCurrentRide: (ride: Ride | null) => void;
  setNearbyDrivers: (drivers: Driver[]) => void;
  updateRideStatus: (status: Ride['status']) => void;
  
  // Driver actions
  setDriverOnline: (online: boolean) => void;
  setDriverLocation: (location: Location) => void;
  acceptRide: (rideId: string) => void;
  
  // Common actions
  addToHistory: (ride: Ride) => void;
  clearCurrentRide: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  currentRide: null,
  nearbyDrivers: [],
  rideHistory: [],
  isDriverOnline: false,
  driverLocation: null,

  setCurrentRide: (ride: Ride | null) => {
    set({ currentRide: ride });
  },

  setNearbyDrivers: (drivers: Driver[]) => {
    set({ nearbyDrivers: drivers });
  },

  updateRideStatus: (status: Ride['status']) => {
    const { currentRide } = get();
    if (currentRide) {
      set({ currentRide: { ...currentRide, status } });
    }
  },

  setDriverOnline: (isDriverOnline: boolean) => {
    set({ isDriverOnline });
  },

  setDriverLocation: (location: Location) => {
    set({ driverLocation: location });
  },

  acceptRide: (rideId: string) => {
    const { currentRide } = get();
    if (currentRide && currentRide.id === rideId) {
      set({ 
        currentRide: { 
          ...currentRide, 
          status: 'accepted' 
        } 
      });
    }
  },

  addToHistory: (ride: Ride) => {
    const { rideHistory } = get();
    set({ rideHistory: [ride, ...rideHistory] });
  },

  clearCurrentRide: () => {
    set({ currentRide: null });
  },
}));