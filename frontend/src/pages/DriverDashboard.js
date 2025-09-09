import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Car, 
  MapPin, 
  Clock, 
  Star, 
  LogOut,
  Settings,
  History,
  User,
  Smartphone,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [driverProfile, setDriverProfile] = useState(null);
  const [rides, setRides] = useState([]);
  const [availableRides, setAvailableRides] = useState([]);
  const [registrationData, setRegistrationData] = useState({
    license_number: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    vehicle_color: '',
    vehicle_plate: ''
  });

  useEffect(() => {
    fetchDriverProfile();
    fetchRides();
    fetchAvailableRides();
  }, []);

  const fetchDriverProfile = async () => {
    try {
      const response = await axios.get(`${API}/driver/profile`);
      setDriverProfile(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        // Driver profile doesn't exist yet
        setDriverProfile(null);
      } else {
        console.error('Error fetching driver profile:', error);
      }
    }
  };

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API}/rides/driver`);
      setRides(response.data);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const fetchAvailableRides = async () => {
    try {
      const response = await axios.get(`${API}/rides/available`);
      setAvailableRides(response.data);
    } catch (error) {
      console.error('Error fetching available rides:', error);
    }
  };

  const handleDriverRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/driver/register`, registrationData);
      toast.success('Driver profile created successfully!');
      fetchDriverProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to register as driver');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await axios.put(`${API}/driver/status`, { status });
      toast.success(`Status updated to ${status}`);
      fetchDriverProfile();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAcceptRide = async (rideId) => {
    try {
      await axios.put(`${API}/rides/${rideId}/accept`);
      toast.success('Ride accepted!');
      fetchRides();
      fetchAvailableRides();
      fetchDriverProfile();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to accept ride');
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

  const completedRides = rides.filter(ride => ride.status === 'completed');
  const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);

  // If driver profile doesn't exist, show registration form
  if (!driverProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="bg-gray-900/50 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Car className="h-8 w-8 text-yellow-500" />
                  <span className="text-2xl font-bold text-white">Airide</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Driver Registration
                </Badge>
              </div>
              <Button variant="outline" onClick={logout} className="border-gray-600 text-gray-300">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Complete Your Driver Profile</CardTitle>
              <CardDescription className="text-gray-400">
                Provide your vehicle information to start driving with Airide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDriverRegistration} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license" className="text-white">License Number</Label>
                    <Input
                      id="license"
                      value={registrationData.license_number}
                      onChange={(e) => setRegistrationData(prev => ({
                        ...prev, license_number: e.target.value
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make" className="text-white">Vehicle Make</Label>
                    <Input
                      id="make"
                      placeholder="e.g., Toyota"
                      value={registrationData.vehicle_make}
                      onChange={(e) => setRegistrationData(prev => ({
                        ...prev, vehicle_make: e.target.value
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model" className="text-white">Vehicle Model</Label>
                    <Input
                      id="model"
                      placeholder="e.g., Camry"
                      value={registrationData.vehicle_model}
                      onChange={(e) => setRegistrationData(prev => ({
                        ...prev, vehicle_model: e.target.value
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-white">Vehicle Year</Label>
                    <Input
                      id="year"
                      type="number"
                      min="2000"
                      max={new Date().getFullYear() + 1}
                      value={registrationData.vehicle_year}
                      onChange={(e) => setRegistrationData(prev => ({
                        ...prev, vehicle_year: parseInt(e.target.value)
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color" className="text-white">Vehicle Color</Label>
                    <Input
                      id="color"
                      placeholder="e.g., White"
                      value={registrationData.vehicle_color}
                      onChange={(e) => setRegistrationData(prev => ({
                        ...prev, vehicle_color: e.target.value
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate" className="text-white">License Plate</Label>
                    <Input
                      id="plate"
                      placeholder="e.g., ABC123"
                      value={registrationData.vehicle_plate}
                      onChange={(e) => setRegistrationData(prev => ({
                        ...prev, vehicle_plate: e.target.value.toUpperCase()
                      }))}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Creating Profile...' : 'Complete Registration'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Car className="h-8 w-8 text-yellow-500" />
                <span className="text-2xl font-bold text-white">Airide</span>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Driver
              </Badge>
              <Badge className={`${getStatusColor(driverProfile?.status)} text-white`}>
                {driverProfile?.status?.toUpperCase() || 'OFFLINE'}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/driver/app">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Driver App
                </Button>
              </Link>
              <span className="text-white">Hello, {user?.name}</span>
              <Button variant="outline" onClick={logout} className="border-gray-600 text-gray-300">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Rides</p>
                  <p className="text-2xl font-bold text-white">{driverProfile?.total_rides || 0}</p>
                </div>
                <Car className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Rating</p>
                  <p className="text-2xl font-bold text-white">{driverProfile?.rating || 5.0}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Earnings</p>
                  <p className="text-2xl font-bold text-white">${totalEarnings.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Available Rides</p>
                  <p className="text-2xl font-bold text-white">{availableRides.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Control */}
        <Card className="mb-8 bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Driver Status</CardTitle>
            <CardDescription className="text-gray-400">
              Control your availability to receive ride requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button
                onClick={() => handleStatusUpdate('online')}
                className={`${driverProfile?.status === 'online' ? 'bg-green-500' : 'bg-gray-600'} hover:bg-green-600`}
                disabled={driverProfile?.status === 'busy'}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Go Online
              </Button>
              <Button
                onClick={() => handleStatusUpdate('offline')}
                variant="outline"
                className="border-gray-600 text-gray-300"
                disabled={driverProfile?.status === 'busy'}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Go Offline
              </Button>
            </div>
            {driverProfile?.status === 'busy' && (
              <p className="text-sm text-yellow-400 mt-2">
                You're currently on a ride. Complete it to change your status.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Available Rides */}
        {driverProfile?.status === 'online' && availableRides.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Available Rides</h2>
            <div className="space-y-4">
              {availableRides.map((ride) => (
                <Card key={ride.id} className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-yellow-500" />
                          <span className="text-white font-medium">
                            From: {ride.pickup_location.address}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="text-white font-medium">
                            To: {ride.destination.address}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 text-sm">
                            Requested: {new Date(ride.requested_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleAcceptRide(ride.id)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      >
                        Accept Ride
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Rides */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Recent Rides</h2>
          {rides.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8 text-center">
                <Car className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No rides yet. Go online to start receiving requests!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rides.slice(0, 5).map((ride) => (
                <Card key={ride.id} className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-yellow-500" />
                          <span className="text-white font-medium">
                            {ride.pickup_location.address}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="text-white font-medium">
                            {ride.destination.address}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400 text-sm">
                            {new Date(ride.requested_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(ride.status)} mb-2`}>
                          {ride.status.toUpperCase()}
                        </Badge>
                        {ride.fare && (
                          <p className="text-white font-bold">${ride.fare}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}