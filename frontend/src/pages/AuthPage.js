import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Car, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage() {
  const [authMode, setAuthMode] = useState('login'); // login, register
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'passenger'
  });
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleAuth = async (role) => {
    try {
      // In a real app, you would integrate with Google OAuth
      // For demo purposes, we'll simulate a successful login
      toast.info('Google login will be integrated with actual Google OAuth');
      
      // Simulate Google OAuth response
      const mockGoogleToken = 'mock-google-token';
      const response = await axios.post(`${API}/auth/social`, {
        access_token: mockGoogleToken,
        provider: 'google',
        role: role
      });
      
      login(response.data.access_token, response.data.user);
      toast.success('Login successful!');
      
      // Redirect based on user role
      if (role === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/passenger/dashboard');
      }
    } catch (error) {
      // For demo, create a mock user
      const mockUser = {
        id: `user_${Date.now()}`,
        email: 'demo@google.com',
        name: 'Demo User',
        role: role,
        auth_provider: 'google',
        picture: 'https://via.placeholder.com/100'
      };
      
      const mockToken = btoa(JSON.stringify({ sub: mockUser.id, exp: Date.now() + 86400000 }));
      login(mockToken, mockUser);
      toast.success('Demo login successful!');
      
      if (role === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/passenger/dashboard');
      }
    }
  };

  const handleFacebookAuth = async (role) => {
    try {
      // In a real app, you would integrate with Facebook OAuth
      toast.info('Facebook login will be integrated with actual Facebook OAuth');
      
      // For demo, create a mock user
      const mockUser = {
        id: `user_${Date.now()}`,
        email: 'demo@facebook.com',
        name: 'Demo Facebook User',
        role: role,
        auth_provider: 'facebook',
        picture: 'https://via.placeholder.com/100'
      };
      
      const mockToken = btoa(JSON.stringify({ sub: mockUser.id, exp: Date.now() + 86400000 }));
      login(mockToken, mockUser);
      toast.success('Demo Facebook login successful!');
      
      if (role === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/passenger/dashboard');
      }
    } catch (error) {
      toast.error('Facebook login failed');
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (authMode === 'register' && !formData.name) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/email/login' : '/auth/email/register';
      const response = await axios.post(`${API}${endpoint}`, formData);
      
      login(response.data.access_token, response.data.user);
      toast.success(`${authMode === 'login' ? 'Login' : 'Registration'} successful!`);
      
      // Redirect based on user role
      if (formData.role === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/passenger/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || `${authMode} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      {/* Back to Home */}
      <Link to="/" className="absolute top-6 left-6 text-white hover:text-yellow-500 transition-colors">
        <ArrowLeft className="h-6 w-6" />
      </Link>

      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Car className="h-8 w-8 text-yellow-500" />
            <span className="text-2xl font-bold text-white">Airide</span>
          </div>
          <CardTitle className="text-white">
            {authMode === 'login' ? 'Welcome Back' : 'Get Started'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {authMode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role Selection (only for registration and social auth) */}
          {authMode === 'register' && (
            <div className="space-y-3">
              <Label className="text-white">I want to</Label>
              <RadioGroup 
                value={formData.role} 
                onValueChange={(value) => handleInputChange('role', value)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors">
                  <RadioGroupItem value="passenger" id="passenger" className="text-yellow-500" />
                  <Label htmlFor="passenger" className="text-white flex items-center space-x-2 cursor-pointer flex-1">
                    <Car className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Book Rides</div>
                      <div className="text-sm text-gray-400">I need transportation</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-gray-600 rounded-lg hover:border-yellow-500 transition-colors">
                  <RadioGroupItem value="driver" id="driver" className="text-yellow-500" />
                  <Label htmlFor="driver" className="text-white flex items-center space-x-2 cursor-pointer flex-1">
                    <Car className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Drive & Earn</div>
                      <div className="text-sm text-gray-400">I want to provide rides</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-red-600 hover:text-white hover:border-red-600"
                onClick={() => handleGoogleAuth(authMode === 'register' ? formData.role : 'passenger')}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                onClick={() => handleFacebookAuth(authMode === 'register' ? formData.role : 'passenger')}
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>

          <Separator className="bg-gray-600" />

          {/* Email Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="pl-11 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  disabled={loading}
                />
              </div>
            </div>

            {authMode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="pr-11 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-yellow-500 hover:text-yellow-400 text-sm"
            >
              {authMode === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}