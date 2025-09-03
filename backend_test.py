#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Uber-like Mobile App
Tests authentication, ride management, driver operations, and rating system
"""

import requests
import json
import time
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://multi-uber-clone.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend API at: {API_BASE}")

# Test data
TEST_RIDER_PHONE = "+251912345678"
TEST_DRIVER_PHONE = "+251987654321"
VERIFICATION_CODE = "123456"  # Mock code that always works

# Addis Ababa coordinates for testing
ADDIS_ABABA_LAT = 9.0192
ADDIS_ABABA_LON = 38.7525

# Global variables to store test data
rider_user = None
driver_user = None
test_ride = None

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def add_pass(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def add_fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")

results = TestResults()

def make_request(method, endpoint, data=None, params=None):
    """Helper function to make HTTP requests"""
    url = f"{API_BASE}{endpoint}"
    try:
        if method.upper() == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, timeout=10)
        elif method.upper() == 'PUT':
            response = requests.put(url, json=data, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        raise Exception(f"Request failed: {str(e)}")

def test_health_check():
    """Test basic health check endpoint"""
    try:
        response = make_request('GET', '/health')
        if response.status_code == 200:
            data = response.json()
            if 'status' in data and data['status'] == 'healthy':
                results.add_pass("Health check endpoint")
                return True
            else:
                results.add_fail("Health check endpoint", "Invalid response format")
        else:
            results.add_fail("Health check endpoint", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Health check endpoint", str(e))
    return False

def test_send_verification_code(phone):
    """Test sending verification code"""
    try:
        data = {"phone": phone}
        response = make_request('POST', '/auth/send-code', data)
        
        if response.status_code == 200:
            resp_data = response.json()
            if resp_data.get('success') and 'message' in resp_data:
                results.add_pass(f"Send verification code for {phone}")
                return True
            else:
                results.add_fail(f"Send verification code for {phone}", "Invalid response format")
        else:
            results.add_fail(f"Send verification code for {phone}", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Send verification code for {phone}", str(e))
    return False

def test_verify_code(phone, code):
    """Test code verification"""
    try:
        data = {"phone": phone, "code": code}
        response = make_request('POST', '/auth/verify-code', data)
        
        if response.status_code == 200:
            resp_data = response.json()
            if 'isNewUser' in resp_data:
                results.add_pass(f"Verify code for {phone}")
                return resp_data
            else:
                results.add_fail(f"Verify code for {phone}", "Invalid response format")
        else:
            results.add_fail(f"Verify code for {phone}", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Verify code for {phone}", str(e))
    return None

def test_register_user(phone, user_type, language="en"):
    """Test user registration"""
    try:
        data = {
            "phone": phone,
            "userType": user_type,
            "language": language
        }
        response = make_request('POST', '/auth/register', data)
        
        if response.status_code == 200:
            user_data = response.json()
            if 'id' in user_data and user_data['phone'] == phone and user_data['userType'] == user_type:
                results.add_pass(f"Register {user_type} user {phone}")
                return user_data
            else:
                results.add_fail(f"Register {user_type} user {phone}", "Invalid user data returned")
        else:
            results.add_fail(f"Register {user_type} user {phone}", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Register {user_type} user {phone}", str(e))
    return None

def test_get_user_by_phone(phone):
    """Test getting user by phone"""
    try:
        response = make_request('GET', f'/auth/user/{phone}')
        
        if response.status_code == 200:
            user_data = response.json()
            if 'id' in user_data and user_data['phone'] == phone:
                results.add_pass(f"Get user by phone {phone}")
                return user_data
            else:
                results.add_fail(f"Get user by phone {phone}", "Invalid user data returned")
        else:
            results.add_fail(f"Get user by phone {phone}", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Get user by phone {phone}", str(e))
    return None

def test_create_ride(rider_id):
    """Test creating a ride request"""
    try:
        data = {
            "pickup": {
                "latitude": ADDIS_ABABA_LAT,
                "longitude": ADDIS_ABABA_LON,
                "address": "Bole, Addis Ababa"
            },
            "destination": {
                "latitude": ADDIS_ABABA_LAT + 0.01,
                "longitude": ADDIS_ABABA_LON + 0.01,
                "address": "Piazza, Addis Ababa"
            }
        }
        
        response = make_request('POST', f'/rides?rider_id={rider_id}', data)
        
        if response.status_code == 200:
            ride_data = response.json()
            if 'id' in ride_data and ride_data['riderId'] == rider_id and ride_data['status'] == 'requested':
                results.add_pass("Create ride request")
                return ride_data
            else:
                results.add_fail("Create ride request", "Invalid ride data returned")
        else:
            results.add_fail("Create ride request", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Create ride request", str(e))
    return None

def test_get_ride(ride_id):
    """Test getting ride by ID"""
    try:
        response = make_request('GET', f'/rides/{ride_id}')
        
        if response.status_code == 200:
            ride_data = response.json()
            if ride_data['id'] == ride_id:
                results.add_pass(f"Get ride {ride_id}")
                return ride_data
            else:
                results.add_fail(f"Get ride {ride_id}", "Invalid ride data returned")
        else:
            results.add_fail(f"Get ride {ride_id}", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Get ride {ride_id}", str(e))
    return None

def test_update_driver_location(driver_id):
    """Test updating driver location"""
    try:
        data = {
            "latitude": ADDIS_ABABA_LAT,
            "longitude": ADDIS_ABABA_LON
        }
        
        response = make_request('PUT', f'/drivers/{driver_id}/location', data)
        
        if response.status_code == 200:
            resp_data = response.json()
            if 'message' in resp_data:
                results.add_pass(f"Update driver location for {driver_id}")
                return True
            else:
                results.add_fail(f"Update driver location for {driver_id}", "Invalid response format")
        else:
            results.add_fail(f"Update driver location for {driver_id}", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Update driver location for {driver_id}", str(e))
    return False

def test_update_driver_status(driver_id, is_online):
    """Test updating driver online/offline status"""
    try:
        data = {"isOnline": is_online}
        
        response = make_request('PUT', f'/drivers/{driver_id}/status', data)
        
        if response.status_code == 200:
            resp_data = response.json()
            if 'message' in resp_data:
                status_text = "online" if is_online else "offline"
                results.add_pass(f"Set driver {driver_id} {status_text}")
                return True
            else:
                results.add_fail(f"Set driver {driver_id} status", "Invalid response format")
        else:
            results.add_fail(f"Set driver {driver_id} status", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Set driver {driver_id} status", str(e))
    return False

def test_get_nearby_drivers():
    """Test getting nearby drivers"""
    try:
        params = {
            "latitude": ADDIS_ABABA_LAT,
            "longitude": ADDIS_ABABA_LON,
            "radius": 5.0
        }
        
        response = make_request('GET', '/drivers/nearby', params=params)
        
        if response.status_code == 200:
            drivers = response.json()
            if isinstance(drivers, list):
                results.add_pass(f"Get nearby drivers (found {len(drivers)})")
                return drivers
            else:
                results.add_fail("Get nearby drivers", "Invalid response format")
        else:
            results.add_fail("Get nearby drivers", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Get nearby drivers", str(e))
    return []

def test_get_available_rides():
    """Test getting available rides"""
    try:
        response = make_request('GET', '/rides/available')
        
        if response.status_code == 200:
            rides = response.json()
            if isinstance(rides, list):
                results.add_pass(f"Get available rides (found {len(rides)})")
                return rides
            else:
                results.add_fail("Get available rides", "Invalid response format")
        else:
            results.add_fail("Get available rides", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Get available rides", str(e))
    return []

def test_accept_ride(driver_id, ride_id):
    """Test driver accepting a ride"""
    try:
        response = make_request('PUT', f'/drivers/{driver_id}/accept-ride?ride_id={ride_id}')
        
        if response.status_code == 200:
            resp_data = response.json()
            if 'message' in resp_data:
                results.add_pass(f"Driver {driver_id} accepts ride {ride_id}")
                return True
            else:
                results.add_fail(f"Driver accept ride", "Invalid response format")
        else:
            results.add_fail(f"Driver accept ride", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Driver accept ride", str(e))
    return False

def test_update_ride_status(ride_id, status, driver_id=None):
    """Test updating ride status"""
    try:
        data = {"status": status}
        if driver_id:
            data["driverId"] = driver_id
            
        response = make_request('PUT', f'/rides/{ride_id}', data)
        
        if response.status_code == 200:
            resp_data = response.json()
            if 'message' in resp_data:
                results.add_pass(f"Update ride {ride_id} status to {status}")
                return True
            else:
                results.add_fail(f"Update ride status", "Invalid response format")
        else:
            results.add_fail(f"Update ride status", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail(f"Update ride status", str(e))
    return False

def test_create_rating(rater_id, ride_id, rated_id, rating, comment=None):
    """Test creating a rating"""
    try:
        data = {
            "rideId": ride_id,
            "ratedId": rated_id,
            "rating": rating
        }
        if comment:
            data["comment"] = comment
            
        response = make_request('POST', f'/ratings?rater_id={rater_id}', data)
        
        if response.status_code == 200:
            rating_data = response.json()
            if 'id' in rating_data and rating_data['rating'] == rating:
                results.add_pass(f"Create rating ({rating} stars)")
                return rating_data
            else:
                results.add_fail("Create rating", "Invalid rating data returned")
        else:
            results.add_fail("Create rating", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Create rating", str(e))
    return None

def test_get_user_ratings(user_id):
    """Test getting user ratings"""
    try:
        response = make_request('GET', f'/ratings/{user_id}')
        
        if response.status_code == 200:
            ratings = response.json()
            if isinstance(ratings, list):
                results.add_pass(f"Get user ratings (found {len(ratings)})")
                return ratings
            else:
                results.add_fail("Get user ratings", "Invalid response format")
        else:
            results.add_fail("Get user ratings", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Get user ratings", str(e))
    return []

def test_get_rider_rides(rider_id):
    """Test getting rider's ride history"""
    try:
        response = make_request('GET', f'/rides/rider/{rider_id}')
        
        if response.status_code == 200:
            rides = response.json()
            if isinstance(rides, list):
                results.add_pass(f"Get rider rides (found {len(rides)})")
                return rides
            else:
                results.add_fail("Get rider rides", "Invalid response format")
        else:
            results.add_fail("Get rider rides", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Get rider rides", str(e))
    return []

def test_get_driver_rides(driver_id):
    """Test getting driver's ride history"""
    try:
        response = make_request('GET', f'/rides/driver/{driver_id}')
        
        if response.status_code == 200:
            rides = response.json()
            if isinstance(rides, list):
                results.add_pass(f"Get driver rides (found {len(rides)})")
                return rides
            else:
                results.add_fail("Get driver rides", "Invalid response format")
        else:
            results.add_fail("Get driver rides", f"Status code: {response.status_code}")
    except Exception as e:
        results.add_fail("Get driver rides", str(e))
    return []

def run_comprehensive_test():
    """Run the complete test suite following the expected Uber-like flow"""
    global rider_user, driver_user, test_ride
    
    print("🚀 Starting Comprehensive Backend API Testing")
    print("=" * 60)
    
    # 1. Health Check
    print("\n📋 Testing Health Check...")
    if not test_health_check():
        print("❌ Health check failed - stopping tests")
        return
    
    # 2. Authentication Flow
    print("\n🔐 Testing Authentication Flow...")
    
    # Send verification codes
    test_send_verification_code(TEST_RIDER_PHONE)
    test_send_verification_code(TEST_DRIVER_PHONE)
    
    # Verify codes and check if users exist
    rider_verify_result = test_verify_code(TEST_RIDER_PHONE, VERIFICATION_CODE)
    driver_verify_result = test_verify_code(TEST_DRIVER_PHONE, VERIFICATION_CODE)
    
    # Register users if they're new
    if rider_verify_result and rider_verify_result.get('isNewUser'):
        rider_user = test_register_user(TEST_RIDER_PHONE, "rider", "en")
    else:
        rider_user = test_get_user_by_phone(TEST_RIDER_PHONE)
    
    if driver_verify_result and driver_verify_result.get('isNewUser'):
        driver_user = test_register_user(TEST_DRIVER_PHONE, "driver", "en")
    else:
        driver_user = test_get_user_by_phone(TEST_DRIVER_PHONE)
    
    if not rider_user or not driver_user:
        print("❌ Failed to set up test users - stopping tests")
        return
    
    print(f"✅ Test users ready - Rider: {rider_user['id']}, Driver: {driver_user['id']}")
    
    # 3. Driver Operations
    print("\n🚗 Testing Driver Operations...")
    
    # Update driver location
    test_update_driver_location(driver_user['id'])
    
    # Set driver online
    test_update_driver_status(driver_user['id'], True)
    
    # Test nearby drivers search
    nearby_drivers = test_get_nearby_drivers()
    
    # 4. Ride Management
    print("\n🛣️ Testing Ride Management...")
    
    # Create a ride request
    test_ride = test_create_ride(rider_user['id'])
    
    if test_ride:
        # Get ride details
        test_get_ride(test_ride['id'])
        
        # Get available rides
        available_rides = test_get_available_rides()
        
        # Driver accepts the ride
        if test_accept_ride(driver_user['id'], test_ride['id']):
            # Update ride status through the flow
            test_update_ride_status(test_ride['id'], "driverArriving")
            test_update_ride_status(test_ride['id'], "inProgress")
            test_update_ride_status(test_ride['id'], "completed")
    
    # 5. Rating System
    print("\n⭐ Testing Rating System...")
    
    if test_ride:
        # Rider rates driver
        test_create_rating(
            rider_user['id'], 
            test_ride['id'], 
            driver_user['id'], 
            5, 
            "Excellent service!"
        )
        
        # Driver rates rider
        test_create_rating(
            driver_user['id'], 
            test_ride['id'], 
            rider_user['id'], 
            5, 
            "Great passenger!"
        )
        
        # Get ratings
        test_get_user_ratings(driver_user['id'])
        test_get_user_ratings(rider_user['id'])
    
    # 6. History and Data Retrieval
    print("\n📊 Testing History and Data Retrieval...")
    
    # Get ride histories
    test_get_rider_rides(rider_user['id'])
    test_get_driver_rides(driver_user['id'])
    
    # Set driver offline
    test_update_driver_status(driver_user['id'], False)
    
    # Final summary
    print("\n" + "=" * 60)
    results.summary()

if __name__ == "__main__":
    run_comprehensive_test()