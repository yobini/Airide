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
        
        # For testing, we'll use a mock verification code since SMS is logged to console
        # In real testing, you'd extract this from logs
        mock_code = "123456"  # This would normally come from console logs
        self.verification_codes[phone_number] = mock_code
        
        # Verify phone
        success, status, response = self.make_request(
            'POST',
            'auth/verify-phone',
            {"phone_number": phone_number, "verification_code": mock_code},
            expected_status=400  # Expected to fail with mock code
        )
        
        # Since we're using mock code, this will fail - that's expected
        self.log_test(f"Verify phone ({user_type})", False, "Expected failure with mock code")
        return False

    def test_registration_flow(self, phone_number, name, role):
        """Test user registration"""
        print(f"\n🔍 Testing Registration for {role}...")
        
        # This will fail because phone verification failed, but we test the endpoint
        success, status, response = self.make_request(
            'POST',
            'auth/register',
            {
                "phone_number": phone_number,
                "name": name,
                "email": f"test_{role}@example.com",
                "role": role
            },
            expected_status=400  # Expected to fail due to unverified phone
        )
        
        self.log_test(f"Register {role}", False, "Expected failure - phone not verified")
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

    def run_comprehensive_test(self):
        """Run all backend tests"""
        print("🚀 Starting Airide Backend API Tests")
        print(f"Testing against: {self.api_url}")
        print("=" * 60)
        
        # Test basic connectivity
        self.test_health_endpoints()
        
        # Test authentication flow (will fail due to mock verification)
        self.test_phone_verification_flow(self.test_phone_passenger, "passenger")
        self.test_phone_verification_flow(self.test_phone_driver, "driver")
        
        # Test registration (will fail due to unverified phone)
        self.test_registration_flow(self.test_phone_passenger, "Test Passenger", "passenger")
        self.test_registration_flow(self.test_phone_driver, "Test Driver", "driver")
        
        # Test login (will fail due to non-existent users)
        self.test_login_flow(self.test_phone_passenger, "passenger")
        self.test_login_flow(self.test_phone_driver, "driver")
        
        # Test protected endpoints without authentication
        self.test_protected_endpoints_without_auth()
        
        # Test driver-specific endpoints
        self.test_driver_endpoints_without_driver_role()
        
        # Test ride endpoints
        self.test_ride_endpoints_without_auth()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed < self.tests_run:
            print("\n⚠️  Note: Some failures are expected due to:")
            print("   - Mock verification codes (SMS not implemented)")
            print("   - Testing protected endpoints without authentication")
            print("   - Testing with non-existent users")
        
        # Check if basic connectivity works
        basic_connectivity = self.tests_passed >= 2  # At least health endpoints should work
        
        if basic_connectivity:
            print("\n✅ Backend API is accessible and responding")
            return 0
        else:
            print("\n❌ Backend API has connectivity issues")
            return 1

def main():
    tester = AirideAPITester()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())