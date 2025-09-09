import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  MapPin, 
  Navigation, 
  Phone, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  User,
  Clock,
  Car
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Mapbox integration (will be configured with API key)
const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'your-mapbox-token-here';

export default function DriverApp() {
  const { user } = useAuth();
  const [driverProfile, setDriverProfile] = useState(null);
  const [currentRide, setCurrentRide] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    fetchDriverProfile();
    fetchCurrentRide();
    initializeLocation();
  }, []);

  useEffect(() => {
    if (location && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [location]);

  const fetchDriverProfile = async () => {
    try {
      const response = await axios.get(`${API}/driver/profile`);
      setDriverProfile(response.data);
    } catch (error) {
      console.error('Error fetching driver profile:', error);
    }
  };

  const fetchCurrentRide = async () => {
    try {
      const response = await axios.get(`${API}/rides/driver`);
      const activeRide = response.data.find(ride => 
        ['accepted', 'picked_up'].includes(ride.status)
      );
      setCurrentRide(activeRide);
    } catch (error) {
      console.error('Error fetching current ride:', error);
    }
  };

  const initializeLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          updateDriverLocation(newLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get your location. Please enable location services.');
          // Fallback to a default location (e.g., city center)
          setLocation({ lat: 40.7128, lng: -74.0060 }); // New York City
        }
      );

      // Watch position for continuous updates
      navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(newLocation);
          updateDriverLocation(newLocation);
        },
        (error) => console.error('Error watching location:', error),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
      setLocation({ lat: 40.7128, lng: -74.0060 }); // Default location
    }
  };

  const initializeMap = () => {
    // In a real implementation, you would use the actual Mapbox GL JS library
    // For this demo, we'll create a placeholder map interface
    const mapElement = mapContainer.current;
    mapElement.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        background: linear-gradient(45deg, #1f2937, #374151);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        text-align: center;
        position: relative;
        border-radius: 12px;
        overflow: hidden;
      ">
        <div style="
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(0,0,0,0.7);
          padding: 10px;
          border-radius: 8px;
          font-size: 12px;
        ">
          📍 Your Location<br/>
          Lat: ${location.lat.toFixed(6)}<br/>
          Lng: ${location.lng.toFixed(6)}
        </div>
        
        <div style="
          width: 60px;
          height: 60px;
          background: #eab308;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          animation: pulse 2s infinite;
        ">
          🚗
        </div>
        
        <h3 style="margin: 0 0 10px 0; color: #eab308;">Live Map View</h3>
        <p style="margin: 0; color: #9ca3af; font-size: 14px;">
          Mapbox integration will show your real-time location<br/>
          and route to passenger pickup/destination
        </p>
        
        ${currentRide ? `
          <div style="
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(234, 179, 8, 0.9);
            color: black;
            padding: 10px 20px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
          ">
            🎯 ${currentRide.status === 'accepted' ? 'Navigate to Pickup' : 'Navigate to Destination'}
          </div>
        ` : ''}
      </div>
      
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>
    `;
  };

  const updateDriverLocation = async (newLocation) => {
    try {
      await axios.put(`${API}/driver/location`, {
        latitude: newLocation.lat,
        longitude: newLocation.lng
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleStatusToggle = async () => {
    if (!driverProfile) return;
    
    const newStatus = driverProfile.status === 'online' ? 'offline' : 'online';
    setLoading(true);
    
    try {
      await axios.put(`${API}/driver/status`, { status: newStatus });
      toast.success(`You are now ${newStatus}`);
      fetchDriverProfile();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handlePickup = async () => {
    if (!currentRide) return;
    
    try {
      await axios.put(`${API}/rides/${currentRide.id}/pickup`);
      toast.success('Passenger picked up!');
      fetchCurrentRide();
    } catch (error) {
      toast.error('Failed to update ride status');
    }
  };

  const handleComplete = async () => {
    if (!currentRide) return;
    
    try {
      await axios.put(`${API}/rides/${currentRide.id}/complete`);
      toast.success('Ride completed!');
      fetchCurrentRide();
      fetchDriverProfile();
    } catch (error) {
      toast.error('Failed to complete ride');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'busy': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header - Mobile Optimized */}
      <div className="bg-gray-900/50 border-b border-gray-700 sticky top-0 z-50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/driver/dashboard" className="text-white hover:text-yellow-500">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div className="flex items-center space-x-2">
                <Car className="h-6 w-6 text-yellow-500" />
                <span className="text-lg font-bold text-white">Driver</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getStatusColor(driverProfile?.status)} text-white text-xs`}>
                {driverProfile?.status?.toUpperCase() || 'OFFLINE'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container - Full Screen */}
      <div className="relative h-[50vh] min-h-[300px]">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {/* Control Panel */}
      <div className="p-4 space-y-4">
        {/* Go Online/Offline Button - Prominent */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardContent className="p-6">
            <Button
              onClick={handleStatusToggle}
              className={`w-full h-16 text-xl font-bold ${
                driverProfile?.status === 'online' 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white`}
              disabled={loading || driverProfile?.status === 'busy'}
            >
              {loading ? 'Updating...' : (
                driverProfile?.status === 'online' ? (
                  <>
                    <XCircle className="h-6 w-6 mr-3" />
                    GO OFFLINE
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-6 w-6 mr-3" />
                    GO ONLINE
                  </>
                )
              )}
            </Button>
            
            {driverProfile?.status === 'busy' && (
              <p className="text-center text-yellow-400 text-sm mt-2">
                Complete your current ride to change status
              </p>
            )}
          </CardContent>
        </Card>

        {/* Current Ride Information */}
        {currentRide && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-yellow-400 flex items-center text-lg">
                <User className="h-5 w-5 mr-2" />
                Current Ride
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">
                      {currentRide.status === 'accepted' ? 'Pickup Location' : 'Current Location'}
                    </p>
                    <p className="text-white font-medium">
                      {currentRide.pickup_location.address}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Navigation className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Destination</p>
                    <p className="text-white font-medium">
                      {currentRide.destination.address}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Trip Status</p>
                    <Badge className={`${getStatusColor(currentRide.status)} mt-1`}>
                      {currentRide.status === 'accepted' ? 'Heading to Pickup' : 'Passenger On Board'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                {currentRide.status === 'accepted' && (
                  <Button
                    onClick={handlePickup}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Passenger Picked Up
                  </Button>
                )}
                
                {currentRide.status === 'picked_up' && (
                  <Button
                    onClick={handleComplete}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Ride
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                  onClick={() => window.open(`tel:${user?.phone_number}`, '_self')}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Stats - Compact */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {driverProfile?.total_rides || 0}
              </p>
              <p className="text-xs text-gray-400">Total Rides</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">
                {driverProfile?.rating || 5.0}
              </p>
              <p className="text-xs text-gray-400">Rating</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-500">
                {driverProfile?.status === 'online' ? '🟢' : '🔴'}
              </p>
              <p className="text-xs text-gray-400">Status</p>
            </CardContent>
          </Card>
        </div>

        {/* No Active Ride Message */}
        {!currentRide && driverProfile?.status === 'online' && (
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Ready for Rides</h3>
              <p className="text-gray-400 text-sm">
                You're online and ready to receive ride requests. Stay in a busy area for more opportunities!
              </p>
            </CardContent>
          </Card>
        )}

        {driverProfile?.status === 'offline' && (
          <Card className="bg-gray-500/10 border-gray-500/30">
            <CardContent className="p-6 text-center">
              <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">You're Offline</h3>
              <p className="text-gray-400 text-sm">
                Go online to start receiving ride requests and earning money.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}