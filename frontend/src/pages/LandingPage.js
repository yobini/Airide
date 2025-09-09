import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Car, 
  MapPin, 
  Clock, 
  Shield, 
  Smartphone, 
  Star,
  Users,
  DollarSign,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-yellow-500" />,
      title: "Real-time Tracking",
      description: "Track your ride in real-time with accurate GPS location updates"
    },
    {
      icon: <Clock className="h-8 w-8 text-yellow-500" />,
      title: "Quick Booking",
      description: "Book a ride in seconds with our intuitive mobile-first interface"
    },
    {
      icon: <Shield className="h-8 w-8 text-yellow-500" />,
      title: "Safe & Secure",
      description: "All drivers are verified with background checks and vehicle inspections"
    },
    {
      icon: <Star className="h-8 w-8 text-yellow-500" />,
      title: "5-Star Service",
      description: "Rated drivers ensuring you get the best ride experience every time"
    }
  ];

  const benefits = [
    "Instant ride booking",
    "Real-time driver tracking",
    "Secure payment options",
    "24/7 customer support",
    "Affordable pricing",
    "Professional drivers"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Navigation */}
      <nav className="relative z-10 px-4 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Car className="h-8 w-8 text-yellow-500" />
            <span className="text-2xl font-bold text-white">Airide</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <Link to={user.role === 'driver' ? '/driver/dashboard' : '/passenger/dashboard'}>
                <Button variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 py-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1528033978085-52f315289665?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwxfHxyaWRlJTIwc2hhcmluZ3xlbnwwfHx8fDE3NTc0NTUxMzF8MA&ixlib=rb-4.1.0&q=85"
            alt="Ride sharing hero"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  🚗 Now Available in Your City
                </Badge>
                <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                  Your Ride,
                  <span className="text-yellow-500"> Anytime</span>
                </h1>
                <p className="text-xl text-gray-300 leading-relaxed">
                  Experience the future of transportation with Airide. Safe, reliable, and affordable rides at your fingertips.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {!user && (
                  <>
                    <Link to="/auth">
                      <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-lg px-8 py-4">
                        <Smartphone className="mr-2 h-5 w-5" />
                        Book a Ride
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button size="lg" variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black text-lg px-8 py-4">
                        <Car className="mr-2 h-5 w-5" />
                        Drive & Earn
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">50K+</div>
                  <div className="text-gray-400">Happy Riders</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">1K+</div>
                  <div className="text-gray-400">Drivers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">4.9</div>
                  <div className="text-gray-400">Rating</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-2xl blur-2xl"></div>
              <img 
                src="https://images.unsplash.com/photo-1600320254374-ce2d293c324e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHx0YXhpfGVufDB8fHx8MTc1NzQ1NTEyNXww&ixlib=rb-4.1.0&q=85"
                alt="Person using ride-sharing app"
                className="relative z-10 rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why Choose Airide?</h2>
            <p className="text-xl text-gray-300">Experience the difference with our premium ride-sharing service</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-gray-900/50 border-gray-700 hover:border-yellow-500/50 transition-all duration-300">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1490650404312-a2175773bbf5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHx0YXhpfGVufDB8fHx8MTc1NzQ1NTEyNXww&ixlib=rb-4.1.0&q=85"
                alt="Professional taxi service"
                className="rounded-2xl shadow-2xl w-full h-96 object-cover"
              />
            </div>
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  Professional Service, <span className="text-yellow-500">Every Time</span>
                </h2>
                <p className="text-xl text-gray-300">
                  Our commitment to excellence ensures you receive the highest quality ride experience with every booking.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>

              {!user && (
                <Link to="/auth">
                  <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
                    Start Your Journey
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 bg-gradient-to-r from-yellow-500/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of satisfied customers who trust Airide for their daily transportation needs.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-lg px-8 py-4">
                  <Users className="mr-2 h-5 w-5" />
                  Ride as Passenger
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black text-lg px-8 py-4">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Earn as Driver
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 bg-gray-900 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Car className="h-6 w-6 text-yellow-500" />
              <span className="text-xl font-bold text-white">Airide</span>
            </div>
            <div className="text-gray-400">
              © 2024 Airide. All rights reserved. Safe travels.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}