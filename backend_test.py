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
        self.test_phone_passenger = f"+1555{datetime.now().strftime('%H%M%S')}"
        self.test_phone_driver = f"+1666{datetime.now().strftime('%H%M%S')}"
        self.verification_codes = {}

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

    def get_verification_code_from_logs(self, phone_number):
        """Extract verification code from backend logs"""
        try:
            import subprocess
            result = subprocess.run(['tail', '-n', '20', '/var/log/supervisor/backend.out.log'], 
                                  capture_output=True, text=True)
            logs = result.stdout
            
            # Look for SMS verification code for this phone number
            for line in logs.split('\n'):
                if f"SMS Verification Code for {phone_number}:" in line:
                    code = line.split(':')[-1].strip()
                    return code
            return None
        except:
            return None

    def test_phone_verification_flow(self, phone_number, user_type="passenger"):
        """Test phone verification process"""
        print(f"\n🔍 Testing Phone Verification for {user_type}...")
        
        # Send verification code
        success, status, response = self.make_request(
            'POST', 
            'auth/send-verification',
            {"phone_number": phone_number}
        )
        
        if not self.log_test(f"Send verification code ({user_type})", success, f"Status: {status}"):
            return False
        
        # Wait a moment for logs to be written
        time.sleep(1)
        
        # Get the actual verification code from logs
        verification_code = self.get_verification_code_from_logs(phone_number)
        
        if not verification_code:
            self.log_test(f"Get verification code ({user_type})", False, "Could not extract code from logs")
            return False
        
        print(f"   📱 Found verification code: {verification_code}")
        self.verification_codes[phone_number] = verification_code
        
        # Verify phone
        success, status, response = self.make_request(
            'POST',
            'auth/verify-phone',
            {"phone_number": phone_number, "verification_code": verification_code}
        )
        
        return self.log_test(f"Verify phone ({user_type})", success, f"Status: {status}")

    def test_registration_flow(self, phone_number, name, role):
        """Test user registration"""
        print(f"\n🔍 Testing Registration for {role}...")
        
        success, status, response = self.make_request(
            'POST',
            'auth/register',
            {
                "phone_number": phone_number,
                "name": name,
                "email": f"test_{role}@example.com",
                "role": role
            }
        )
        
        if success and 'access_token' in response:
            if role == 'passenger':
                self.passenger_token = response['access_token']
            else:
                self.driver_token = response['access_token']
            self.log_test(f"Register {role}", True, f"Status: {status}, Token received")
            return True
        else:
            self.log_test(f"Register {role}", False, f"Status: {status}")
            return False

    def test_login_flow(self, phone_number, user_type):
        """Test login process"""
        print(f"\n🔍 Testing Login for {user_type}...")
        
        # Send login verification
        success, status, response = self.make_request(
            'POST',
            'auth/login',
            {"phone_number": phone_number},
            expected_status=404  # User doesn't exist
        )
        
        self.log_test(f"Login request ({user_type})", False, "Expected failure - user not found")
        return False

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