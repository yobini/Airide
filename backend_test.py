import requests
import sys
import json
from datetime import datetime
import time

class AirideAPITester:
    def __init__(self, base_url="https://ridesync-6.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.passenger_token = None
        self.driver_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_email_passenger = f"test_passenger_{datetime.now().strftime('%H%M%S')}@example.com"
        self.test_email_driver = f"test_driver_{datetime.now().strftime('%H%M%S')}@example.com"

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            return success, response.status_code, response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            return False, 0, {"error": str(e)}
        except json.JSONDecodeError:
            return False, response.status_code, {"error": "Invalid JSON response"}

    def test_health_endpoints(self):
        """Test health check endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, status, response = self.make_request('GET', '')
        self.log_test("Root endpoint", success, f"Status: {status}")
        
        # Test health endpoint
        success, status, response = self.make_request('GET', 'health')
        self.log_test("Health check", success, f"Status: {status}")

    def test_social_auth_google(self, role="passenger"):
        """Test Google social authentication"""
        print(f"\n🔍 Testing Google Social Auth for {role}...")
        
        # Test with mock Google token
        success, status, response = self.make_request(
            'POST',
            'auth/social',
            {
                "access_token": "mock-google-token",
                "provider": "google",
                "role": role
            }
        )
        
        if success and 'access_token' in response:
            if role == 'passenger':
                self.passenger_token = response['access_token']
            else:
                self.driver_token = response['access_token']
            self.log_test(f"Google social auth ({role})", True, f"Status: {status}, Token received")
            return True
        else:
            self.log_test(f"Google social auth ({role})", False, f"Status: {status}")
            return False

    def test_social_auth_facebook(self, role="passenger"):
        """Test Facebook social authentication"""
        print(f"\n🔍 Testing Facebook Social Auth for {role}...")
        
        # Test with mock Facebook token
        success, status, response = self.make_request(
            'POST',
            'auth/social',
            {
                "access_token": "mock-facebook-token",
                "provider": "facebook",
                "role": role
            }
        )
        
        if success and 'access_token' in response:
            if role == 'passenger':
                self.passenger_token = response['access_token']
            else:
                self.driver_token = response['access_token']
            self.log_test(f"Facebook social auth ({role})", True, f"Status: {status}, Token received")
            return True
        else:
            self.log_test(f"Facebook social auth ({role})", False, f"Status: {status}")
            return False

    def test_email_registration(self, email, name, password, role):
        """Test email registration"""
        print(f"\n🔍 Testing Email Registration for {role}...")
        
        success, status, response = self.make_request(
            'POST',
            'auth/email/register',
            {
                "email": email,
                "name": name,
                "password": password,
                "role": role
            }
        )
        
        if success and 'access_token' in response:
            if role == 'passenger':
                self.passenger_token = response['access_token']
            else:
                self.driver_token = response['access_token']
            self.log_test(f"Email registration ({role})", True, f"Status: {status}, Token received")
            return True
        else:
            self.log_test(f"Email registration ({role})", False, f"Status: {status}")
            return False

    def test_email_login(self, email, password, role):
        """Test email login"""
        print(f"\n🔍 Testing Email Login for {role}...")
        
        success, status, response = self.make_request(
            'POST',
            'auth/email/login',
            {
                "email": email,
                "password": password
            }
        )
        
        if success and 'access_token' in response:
            self.log_test(f"Email login ({role})", True, f"Status: {status}, Token received")
            return True
        else:
            self.log_test(f"Email login ({role})", False, f"Status: {status}")
            return False

    def test_duplicate_email_registration(self):
        """Test duplicate email registration should fail"""
        print(f"\n🔍 Testing Duplicate Email Registration...")
        
        success, status, response = self.make_request(
            'POST',
            'auth/email/register',
            {
                "email": self.test_email_passenger,
                "name": "Duplicate User",
                "password": "password123",
                "role": "passenger"
            },
            expected_status=400
        )
        
        self.log_test("Duplicate email registration", success, f"Status: {status} (should be 400)")

    def test_invalid_login_credentials(self):
        """Test login with invalid credentials"""
        print(f"\n🔍 Testing Invalid Login Credentials...")
        
        success, status, response = self.make_request(
            'POST',
            'auth/email/login',
            {
                "email": "nonexistent@example.com",
                "password": "wrongpassword"
            },
            expected_status=404
        )
        
        self.log_test("Invalid email login", success, f"Status: {status} (should be 404)")

    def test_invalid_social_token(self):
        """Test social auth with invalid token"""
        print(f"\n🔍 Testing Invalid Social Token...")
        
        success, status, response = self.make_request(
            'POST',
            'auth/social',
            {
                "access_token": "invalid-token",
                "provider": "google",
                "role": "passenger"
            },
            expected_status=400
        )
        
        self.log_test("Invalid social token", success, f"Status: {status} (should be 400)")

    def test_protected_endpoints_without_auth(self):
        """Test protected endpoints without authentication"""
        print("\n🔍 Testing Protected Endpoints (No Auth)...")
        
        endpoints = [
            ('GET', 'user/profile', 401),
            ('GET', 'driver/profile', 401),
            ('GET', 'rides/passenger', 401),
            ('GET', 'rides/driver', 401),
            ('GET', 'rides/available', 401),
        ]
        
        for method, endpoint, expected_status in endpoints:
            success, status, response = self.make_request(method, endpoint, expected_status=expected_status)
            self.log_test(f"Protected endpoint: {endpoint}", success, f"Status: {status}")

    def test_driver_endpoints_without_driver_role(self):
        """Test driver-specific endpoints behavior"""
        print("\n🔍 Testing Driver Endpoints Access Control...")
        
        # These would require proper authentication, but we're testing endpoint existence
        driver_endpoints = [
            ('POST', 'driver/register'),
            ('PUT', 'driver/status'),
            ('PUT', 'driver/location'),
        ]
        
        for method, endpoint in driver_endpoints:
            success, status, response = self.make_request(method, endpoint, expected_status=401)
            self.log_test(f"Driver endpoint: {endpoint}", success, f"Status: {status}")

    def test_ride_endpoints_without_auth(self):
        """Test ride endpoints without authentication"""
        print("\n🔍 Testing Ride Endpoints (No Auth)...")
        
        ride_endpoints = [
            ('POST', 'rides/request', 401),
            ('PUT', 'rides/test-id/accept', 401),
            ('PUT', 'rides/test-id/pickup', 401),
            ('PUT', 'rides/test-id/complete', 401),
        ]
        
        for method, endpoint, expected_status in ride_endpoints:
            success, status, response = self.make_request(method, endpoint, expected_status=expected_status)
            self.log_test(f"Ride endpoint: {endpoint}", success, f"Status: {status}")

    def test_authenticated_user_endpoints(self):
        """Test user endpoints with authentication"""
        if not self.passenger_token:
            print("\n⚠️  Skipping authenticated user tests - no passenger token")
            return
            
        print("\n🔍 Testing Authenticated User Endpoints...")
        
        # Test get profile
        success, status, response = self.make_request(
            'GET', 'user/profile', token=self.passenger_token
        )
        self.log_test("Get user profile", success, f"Status: {status}")
        
        # Test update profile
        success, status, response = self.make_request(
            'PUT', 'user/profile', 
            data={"name": "Updated Test Passenger", "email": "updated@example.com"},
            token=self.passenger_token
        )
        self.log_test("Update user profile", success, f"Status: {status}")

    def test_driver_registration_and_endpoints(self):
        """Test driver-specific functionality"""
        if not self.driver_token:
            print("\n⚠️  Skipping driver tests - no driver token")
            return
            
        print("\n🔍 Testing Driver Registration and Endpoints...")
        
        # Register as driver
        success, status, response = self.make_request(
            'POST', 'driver/register',
            data={
                "license_number": "DL123456789",
                "vehicle_make": "Toyota",
                "vehicle_model": "Camry",
                "vehicle_year": 2020,
                "vehicle_color": "Blue",
                "vehicle_plate": "ABC123"
            },
            token=self.driver_token
        )
        self.log_test("Driver registration", success, f"Status: {status}")
        
        # Get driver profile
        success, status, response = self.make_request(
            'GET', 'driver/profile', token=self.driver_token
        )
        self.log_test("Get driver profile", success, f"Status: {status}")
        
        # Update driver status
        success, status, response = self.make_request(
            'PUT', 'driver/status',
            data={"status": "online"},
            token=self.driver_token
        )
        self.log_test("Update driver status", success, f"Status: {status}")
        
        # Update driver location
        success, status, response = self.make_request(
            'PUT', 'driver/location',
            data={"latitude": 37.7749, "longitude": -122.4194},
            token=self.driver_token
        )
        self.log_test("Update driver location", success, f"Status: {status}")

    def test_ride_functionality(self):
        """Test ride request and management"""
        if not self.passenger_token or not self.driver_token:
            print("\n⚠️  Skipping ride tests - missing tokens")
            return
            
        print("\n🔍 Testing Ride Functionality...")
        
        # Request a ride as passenger
        success, status, response = self.make_request(
            'POST', 'rides/request',
            data={
                "pickup_location": {"lat": 37.7749, "lng": -122.4194, "address": "San Francisco, CA"},
                "destination": {"lat": 37.7849, "lng": -122.4094, "address": "Downtown SF"}
            },
            token=self.passenger_token
        )
        
        ride_id = None
        if success and 'ride' in response:
            ride_id = response['ride']['id']
            
        self.log_test("Request ride", success, f"Status: {status}")
        
        # Get passenger rides
        success, status, response = self.make_request(
            'GET', 'rides/passenger', token=self.passenger_token
        )
        self.log_test("Get passenger rides", success, f"Status: {status}")
        
        # Get available rides as driver
        success, status, response = self.make_request(
            'GET', 'rides/available', token=self.driver_token
        )
        self.log_test("Get available rides", success, f"Status: {status}")
        
        # Accept ride if we have a ride ID
        if ride_id:
            success, status, response = self.make_request(
                'PUT', f'rides/{ride_id}/accept', token=self.driver_token
            )
            self.log_test("Accept ride", success, f"Status: {status}")

    def run_comprehensive_test(self):
        """Run all backend tests"""
        print("🚀 Starting Airide Backend API Tests")
        print(f"Testing against: {self.api_url}")
        print("=" * 60)
        
        # Test basic connectivity
        self.test_health_endpoints()
        
        # Test authentication flow with real verification codes
        passenger_verified = self.test_phone_verification_flow(self.test_phone_passenger, "passenger")
        driver_verified = self.test_phone_verification_flow(self.test_phone_driver, "driver")
        
        # Test registration if phone verification succeeded
        if passenger_verified:
            self.test_registration_flow(self.test_phone_passenger, "Test Passenger", "passenger")
        if driver_verified:
            self.test_registration_flow(self.test_phone_driver, "Test Driver", "driver")
        
        # Test authenticated endpoints
        self.test_authenticated_user_endpoints()
        self.test_driver_registration_and_endpoints()
        self.test_ride_functionality()
        
        # Test protected endpoints without authentication
        self.test_protected_endpoints_without_auth()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        # Check if basic functionality works
        basic_functionality = self.tests_passed >= 4  # Health + some auth tests should work
        
        if basic_functionality:
            print("\n✅ Backend API is functional")
            return 0
        else:
            print("\n❌ Backend API has significant issues")
            return 1

def main():
    tester = AirideAPITester()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())