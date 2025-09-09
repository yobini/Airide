import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";

// Import pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import PassengerDashboard from "./pages/PassengerDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import DriverApp from "./pages/DriverApp";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Set the authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Try to decode the token to check if it's expired
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        
        if (tokenPayload.exp && tokenPayload.exp < currentTime) {
          // Token is expired
          logout();
          return;
        }
        
        // Fetch user profile to verify token is still valid
        await fetchUserProfile();
      } catch (error) {
        console.error('Error initializing auth:', error);
        logout();
      }
    } else {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/user/profile`);
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      logout();
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Protected Route Component
function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/passenger/dashboard" 
              element={
                <ProtectedRoute requiredRole="passenger">
                  <PassengerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/driver/dashboard" 
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/driver/app" 
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverApp />
                </ProtectedRoute>
              } 
            />
          </Routes>
          <Toaster position="top-right" />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export { useAuth };
export default App;