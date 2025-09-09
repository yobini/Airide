import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { toast } from 'sonner';
import { Car, Smartphone, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AuthPage() {
  const [step, setStep] = useState('phone'); // phone, verify, register
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    verification_code: '',
    name: '',
    email: '',
    role: 'passenger'
  });
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone_number) {
      toast.error('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/send-verification';
      await axios.post(`${API}${endpoint}`, {
        phone_number: formData.phone_number
      });
      
      toast.success(`Verification code sent to ${formData.phone_number}`);
      setStep('verify');
    } catch (error) {
      if (error.response?.status === 404 && isLogin) {
        toast.error('User not found. Please register first.');
        setIsLogin(false);
      } else {
        toast.error(error.response?.data?.detail || 'Failed to send verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!formData.verification_code) {
      toast.error('Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login-verify`, {
          phone_number: formData.phone_number,
          verification_code: formData.verification_code
        });
        
        login(response.data.access_token, response.data.user);
        toast.success('Login successful!');
        
        // Redirect based on user role
        if (response.data.user.role === 'driver') {
          navigate('/driver/dashboard');
        } else {
          navigate('/passenger/dashboard');
        }
      } else {
        await axios.post(`${API}/auth/verify-phone`, {
          phone_number: formData.phone_number,
          verification_code: formData.verification_code
        });
        
        toast.success('Phone verified successfully!');
        setStep('register');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        phone_number: formData.phone_number,
        name: formData.name,
        email: formData.email || null,
        role: formData.role
      });
      
      login(response.data.access_token, response.data.user);
      toast.success('Registration successful!');
      
      // Redirect based on user role
      if (formData.role === 'driver') {
        navigate('/driver/dashboard');
      } else {
        navigate('/passenger/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
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
            {step === 'phone' && (isLogin ? 'Welcome Back' : 'Get Started')}
            {step === 'verify' && 'Verify Your Phone'}
            {step === 'register' && 'Complete Registration'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'phone' && 'Enter your phone number to continue'}
            {step === 'verify' && `We sent a code to ${formData.phone_number}`}
            {step === 'register' && 'Tell us a bit about yourself'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Send Login Code' : 'Send Verification Code')}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-yellow-500 hover:text-yellow-400 text-sm"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-white">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={formData.verification_code}
                  onChange={(e) => handleInputChange('verification_code', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-yellow-500 hover:text-yellow-400 text-sm"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  disabled={loading}
                />
              </div>

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
                      <Smartphone className="h-5 w-5 text-yellow-500" />
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

              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}