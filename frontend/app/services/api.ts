import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

console.log('API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  sendCode: (phone: string) => api.post('/auth/send-code', { phone }),
  verifyCode: (phone: string, code: string) => api.post('/auth/verify-code', { phone, code }),
  register: (userData: any) => api.post('/auth/register', userData),
  getUserByPhone: (phone: string) => api.get(`/auth/user/${phone}`),
};

// Ride API
export const rideAPI = {
  createRide: (rideData: any, riderId: string) => 
    api.post(`/rides?rider_id=${riderId}`, rideData),
  getRide: (rideId: string) => api.get(`/rides/${rideId}`),
  updateRide: (rideId: string, updateData: any) => api.put(`/rides/${rideId}`, updateData),
  getRiderRides: (riderId: string) => api.get(`/rides/rider/${riderId}`),
  getDriverRides: (driverId: string) => api.get(`/rides/driver/${driverId}`),
  getAvailableRides: () => api.get('/rides/available'),
};

// Driver API
export const driverAPI = {
  updateLocation: (driverId: string, location: { latitude: number; longitude: number }) =>
    api.put(`/drivers/${driverId}/location`, location),
  updateStatus: (driverId: string, isOnline: boolean) =>
    api.put(`/drivers/${driverId}/status`, { isOnline }),
  getNearbyDrivers: (latitude: number, longitude: number, radius?: number) =>
    api.get('/drivers/nearby', { params: { latitude, longitude, radius } }),
  getDriver: (driverId: string) => api.get(`/drivers/${driverId}`),
  acceptRide: (driverId: string, rideId: string) =>
    api.put(`/drivers/${driverId}/accept-ride?ride_id=${rideId}`),
};

// Rating API
export const ratingAPI = {
  createRating: (ratingData: any, raterId: string) =>
    api.post(`/ratings?rater_id=${raterId}`, ratingData),
  getUserRatings: (userId: string) => api.get(`/ratings/${userId}`),
};

export default api;