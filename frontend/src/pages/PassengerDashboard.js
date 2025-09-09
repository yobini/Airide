import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  MapPin, 
  Clock, 
  Car, 
  Star, 
  LogOut,
  Navigation,
  History,
  User,
  Plus
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PassengerDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('book');
  const [loading, setLoading] = useState(false);
  const [rides, setRides] = useState([]);
  const [currentRide, setCurrentRide] = useState(null);
  const [bookingData, setBookingData] = useState({
    pickup_location: {
      address: '',
      lat: 0,
      lng: 0
    },
    destination: {
      address: '',
      lat: 0,
      lng: 0
    }
  });

  useEffect(() => {
    fetchRides();
    // Check for active ride
    checkActiveRide();
  }, []);

  const fetchRides = async () => {
    try {
      const response = await axios.get(`${API}/rides/passenger`);
      setRides(response.data);
    } catch (error) {
      console.error('Error fetching rides:', error);
    }
  };

  const checkActiveRide = async () => {
    try {
      const response = await axios.get(`${API}/rides/passenger`);
      const activeRide = response.data.find(ride => 
        ['requested', 'accepted', 'picked_up'].includes(ride.status)
      );
      setCurrentRide(activeRide);
    } catch (error) {
      console.error('Error checking active ride:', error);
    }
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    if (!bookingData.pickup_location.address || !bookingData.destination.address) {
      toast.error('Please fill in both pickup and destination addresses');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/rides/request`, bookingData);
      toast.success('Ride requested successfully!');
      setBookingData({
        pickup_location: { address: '', lat: 0, lng: 0 },
        destination: { address: '', lat: 0, lng: 0 }
      });
      fetchRides();
      checkActiveRide();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'requested': return 'bg-yellow-500';
      case 'accepted': return 'bg-blue-500';
      case 'picked_up': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'requested': return 'Finding Driver...';
      case 'accepted': return 'Driver Assigned';
      case 'picked_up': return 'On the Way';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

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
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Passenger
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* Current Ride Alert */}
        {currentRide && (
          <Card className="mb-8 bg-yellow-500/10 border-yellow-500/30">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Active Ride
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">
                    From: {currentRide.pickup_location.address}
                  </p>
                  <p className="text-white font-medium">
                    To: {currentRide.destination.address}
                  </p>
                  <Badge className={`${getStatusColor(currentRide.status)} mt-2`}>
                    {getStatusText(currentRide.status)}
                  </Badge>
                </div>
                <div className="text-right text-gray-300">
                  <p className="text-sm">
                    Requested: {new Date(currentRide.requested_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-8 w-fit">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'book' 
                ? 'bg-yellow-500 text-black' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Plus className="h-4 w-4 mr-2 inline" />
            Book Ride
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'history' 
                ? 'bg-yellow-500 text-black' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <History className="h-4 w-4 mr-2 inline" />
            Ride History
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'bg-yellow-500 text-black' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <User className="h-4 w-4 mr-2 inline" />
            Profile
          </button>
        </div>

        {/* Book Ride Tab */}
        {activeTab === 'book' && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Book a New Ride</CardTitle>
              <CardDescription className="text-gray-400">
                Enter your pickup and destination to request a ride
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookRide} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pickup" className="text-white">Pickup Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-5 w-5 text-yellow-500" />
                    <Input
                      id="pickup"
                      type="text"
                      placeholder="Enter pickup address"
                      value={bookingData.pickup_location.address}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        pickup_location: { ...prev.pickup_location, address: e.target.value }
                      }))}
                      className="pl-11 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination" className="text-white">Destination</Label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-3 h-5 w-5 text-yellow-500" />
                    <Input
                      id="destination"
                      type="text"
                      placeholder="Enter destination address"
                      value={bookingData.destination.address}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        destination: { ...prev.destination, address: e.target.value }
                      }))}
                      className="pl-11 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  disabled={loading || currentRide}
                >
                  {loading ? 'Requesting Ride...' : 'Request Ride'}
                </Button>

                {currentRide && (
                  <p className="text-sm text-gray-400 text-center">
                    You have an active ride. Complete it before booking a new one.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Ride History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Ride History</h2>
            {rides.length === 0 ? (
              <Card className="bg-gray-900/50 border-gray-700">
                <CardContent className="p-8 text-center">
                  <Car className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No rides yet. Book your first ride!</p>
                </CardContent>
              </Card>
            ) : (
              rides.map((ride) => (
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
                          <Navigation className="h-4 w-4 text-yellow-500" />
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
                          {getStatusText(ride.status)}
                        </Badge>
                        {ride.fare && (
                          <p className="text-white font-bold">${ride.fare}</p>
                        )}
                        {ride.driver_rating && (
                          <div className="flex items-center mt-1">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="text-sm text-gray-400">{ride.driver_rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Your Profile</CardTitle>
              <CardDescription className="text-gray-400">
                Manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Name</Label>
                  <p className="mt-1 text-gray-300">{user?.name}</p>
                </div>
                <div>
                  <Label className="text-white">Phone Number</Label>
                  <p className="mt-1 text-gray-300">{user?.phone_number}</p>
                </div>
                <div>
                  <Label className="text-white">Email</Label>
                  <p className="mt-1 text-gray-300">{user?.email || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-white">Role</Label>
                  <Badge className="mt-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {user?.role}
                  </Badge>
                </div>
              </div>
              <div className="pt-4">
                <Label className="text-white">Total Rides</Label>
                <p className="mt-1 text-2xl font-bold text-yellow-500">
                  {rides.filter(ride => ride.status === 'completed').length}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}