#!/usr/bin/env python3
"""
Backend API Testing Script
Tests FastAPI endpoints for the status check application
"""

import requests
import json
import sys
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://java-spring-core.preview.emergentagent.com')
API_BASE_URL = f"{BACKEND_URL}/api"

def test_root_endpoint():
    """Test GET /api/ endpoint"""
    print("=" * 60)
    print("Testing GET /api/ endpoint")
    print("=" * 60)
    
    try:
        url = f"{API_BASE_URL}/"
        print(f"Making request to: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ ROOT ENDPOINT TEST PASSED")
                return True
            else:
                print(f"❌ ROOT ENDPOINT TEST FAILED: Expected message 'Hello World', got {data}")
                return False
        else:
            print(f"❌ ROOT ENDPOINT TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ ROOT ENDPOINT TEST FAILED: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ ROOT ENDPOINT TEST FAILED: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ ROOT ENDPOINT TEST FAILED: Unexpected error - {e}")
        return False

def test_post_status_endpoint():
    """Test POST /api/status endpoint"""
    print("\n" + "=" * 60)
    print("Testing POST /api/status endpoint")
    print("=" * 60)
    
    try:
        url = f"{API_BASE_URL}/status"
        payload = {"client_name": "Tester"}
        headers = {"Content-Type": "application/json"}
        
        print(f"Making request to: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response structure
            required_fields = ["id", "client_name", "timestamp"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ POST STATUS TEST FAILED: Missing fields {missing_fields}")
                return False, None
                
            # Validate field values
            if data["client_name"] != "Tester":
                print(f"❌ POST STATUS TEST FAILED: Expected client_name 'Tester', got {data['client_name']}")
                return False, None
                
            # Validate UUID format (basic check)
            if not isinstance(data["id"], str) or len(data["id"]) < 30:
                print(f"❌ POST STATUS TEST FAILED: Invalid ID format {data['id']}")
                return False, None
                
            # Validate timestamp format
            try:
                datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
            except ValueError:
                print(f"❌ POST STATUS TEST FAILED: Invalid timestamp format {data['timestamp']}")
                return False, None
                
            print("✅ POST STATUS TEST PASSED")
            return True, data
        else:
            print(f"❌ POST STATUS TEST FAILED: Expected status 200, got {response.status_code}")
            return False, None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ POST STATUS TEST FAILED: Request error - {e}")
        return False, None
    except json.JSONDecodeError as e:
        print(f"❌ POST STATUS TEST FAILED: JSON decode error - {e}")
        return False, None
    except Exception as e:
        print(f"❌ POST STATUS TEST FAILED: Unexpected error - {e}")
        return False, None

def test_get_status_endpoint(expected_item=None):
    """Test GET /api/status endpoint"""
    print("\n" + "=" * 60)
    print("Testing GET /api/status endpoint")
    print("=" * 60)
    
    try:
        url = f"{API_BASE_URL}/status"
        print(f"Making request to: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate it's an array
            if not isinstance(data, list):
                print(f"❌ GET STATUS TEST FAILED: Expected array, got {type(data)}")
                return False
                
            print(f"Found {len(data)} status check items")
            
            # If we have an expected item from POST test, verify it exists
            if expected_item:
                found_item = False
                for item in data:
                    if (item.get("id") == expected_item["id"] and 
                        item.get("client_name") == expected_item["client_name"]):
                        found_item = True
                        print(f"✅ Found expected item: {item}")
                        break
                        
                if not found_item:
                    print(f"❌ GET STATUS TEST FAILED: Expected item not found in response")
                    return False
            
            # Validate structure of items
            for i, item in enumerate(data):
                required_fields = ["id", "client_name", "timestamp"]
                missing_fields = [field for field in required_fields if field not in item]
                
                if missing_fields:
                    print(f"❌ GET STATUS TEST FAILED: Item {i} missing fields {missing_fields}")
                    return False
                    
            print("✅ GET STATUS TEST PASSED")
            return True
        else:
            print(f"❌ GET STATUS TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ GET STATUS TEST FAILED: Request error - {e}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ GET STATUS TEST FAILED: JSON decode error - {e}")
        return False
    except Exception as e:
        print(f"❌ GET STATUS TEST FAILED: Unexpected error - {e}")
        return False

def test_driver_registration():
    """Test POST /api/drivers/register endpoint"""
    print("\n" + "=" * 60)
    print("Testing POST /api/drivers/register endpoint")
    print("=" * 60)
    
    try:
        url = f"{API_BASE_URL}/drivers/register"
        payload = {
            "name": "John Driver",
            "phone": "+1234567890",
            "vehicle": {
                "make": "Toyota",
                "model": "Camry",
                "plate": "ABC123",
                "color": "Blue",
                "year": 2020
            }
        }
        headers = {"Content-Type": "application/json"}
        
        print(f"Making request to: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response structure
            required_fields = ["id", "name", "phone", "vehicle", "online", "created_at", "updated_at"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ DRIVER REGISTRATION TEST FAILED: Missing fields {missing_fields}")
                return False, None
                
            # Validate field values
            if data["name"] != "John Driver" or data["phone"] != "+1234567890":
                print(f"❌ DRIVER REGISTRATION TEST FAILED: Name or phone mismatch")
                return False, None
                
            if data["online"] != False:
                print(f"❌ DRIVER REGISTRATION TEST FAILED: Expected online=False, got {data['online']}")
                return False, None
                
            print("✅ DRIVER REGISTRATION TEST PASSED")
            return True, data["id"]
        else:
            print(f"❌ DRIVER REGISTRATION TEST FAILED: Expected status 200, got {response.status_code}")
            return False, None
            
    except Exception as e:
        print(f"❌ DRIVER REGISTRATION TEST FAILED: {e}")
        return False, None

def test_driver_online_offline(driver_id):
    """Test POST /api/drivers/{id}/online and /offline endpoints"""
    print("\n" + "=" * 60)
    print("Testing Driver Online/Offline Toggle")
    print("=" * 60)
    
    try:
        # Test going online
        online_url = f"{API_BASE_URL}/drivers/{driver_id}/online"
        print(f"Making request to: {online_url}")
        
        response = requests.post(online_url, timeout=10)
        print(f"Online Status Code: {response.status_code}")
        print(f"Online Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ ONLINE TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        if data.get("online") != True:
            print(f"❌ ONLINE TEST FAILED: Expected online=True, got {data.get('online')}")
            return False
            
        # Test going offline
        offline_url = f"{API_BASE_URL}/drivers/{driver_id}/offline"
        print(f"Making request to: {offline_url}")
        
        response = requests.post(offline_url, timeout=10)
        print(f"Offline Status Code: {response.status_code}")
        print(f"Offline Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ OFFLINE TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        if data.get("online") != False:
            print(f"❌ OFFLINE TEST FAILED: Expected online=False, got {data.get('online')}")
            return False
            
        print("✅ ONLINE/OFFLINE TOGGLE TEST PASSED")
        return True
        
    except Exception as e:
        print(f"❌ ONLINE/OFFLINE TEST FAILED: {e}")
        return False

def test_location_update(driver_id):
    """Test POST /api/drivers/{id}/location endpoint"""
    print("\n" + "=" * 60)
    print("Testing Location Update")
    print("=" * 60)
    
    try:
        url = f"{API_BASE_URL}/drivers/{driver_id}/location"
        payload = {
            "lat": 40.7128,
            "lng": -74.0060,
            "speed": 25.5,
            "heading": 180.0
        }
        headers = {"Content-Type": "application/json"}
        
        print(f"Making request to: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ LOCATION UPDATE TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        if not data.get("latest_location"):
            print(f"❌ LOCATION UPDATE TEST FAILED: No latest_location in response")
            return False
            
        location = data["latest_location"]
        if location.get("lat") != 40.7128 or location.get("lng") != -74.0060:
            print(f"❌ LOCATION UPDATE TEST FAILED: Location coordinates mismatch")
            return False
            
        print("✅ LOCATION UPDATE TEST PASSED")
        return True
        
    except Exception as e:
        print(f"❌ LOCATION UPDATE TEST FAILED: {e}")
        return False

def test_create_trips(driver_id):
    """Test POST /api/drivers/{id}/trips endpoint with various fares"""
    print("\n" + "=" * 60)
    print("Testing Trip Creation")
    print("=" * 60)
    
    fares = [8.5, 12, 25, 31]
    trip_ids = []
    
    try:
        for fare in fares:
            url = f"{API_BASE_URL}/drivers/{driver_id}/trips"
            payload = {
                "fare": fare,
                "distance_km": 5.2
            }
            headers = {"Content-Type": "application/json"}
            
            print(f"Creating trip with fare ${fare}")
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ TRIP CREATION TEST FAILED: Expected status 200, got {response.status_code}")
                return False, []
                
            data = response.json()
            if data.get("fare") != fare:
                print(f"❌ TRIP CREATION TEST FAILED: Fare mismatch for ${fare}")
                return False, []
                
            trip_ids.append(data["id"])
            
        print("✅ TRIP CREATION TEST PASSED")
        return True, trip_ids
        
    except Exception as e:
        print(f"❌ TRIP CREATION TEST FAILED: {e}")
        return False, []

def test_earnings_summary(driver_id):
    """Test GET /api/drivers/{id}/earnings endpoint"""
    print("\n" + "=" * 60)
    print("Testing Earnings Summary")
    print("=" * 60)
    
    try:
        # Use a wide date range to capture all trips
        from datetime import datetime, timezone
        start_date = "2024-01-01T00:00:00Z"
        end_date = "2024-12-31T23:59:59Z"
        
        url = f"{API_BASE_URL}/drivers/{driver_id}/earnings"
        params = {
            "start": start_date,
            "end": end_date
        }
        
        print(f"Making request to: {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ EARNINGS SUMMARY TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        
        # Validate response structure
        required_fields = ["driver_id", "trip_count", "total_fares", "total_service_fees", "net_amount", "trips"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            print(f"❌ EARNINGS SUMMARY TEST FAILED: Missing fields {missing_fields}")
            return False
            
        # Validate service fee calculation
        expected_fees = {8.5: 1.0, 12: 2.0, 25: 2.0, 31: 3.0}
        total_expected_fees = sum(expected_fees.values())  # 1 + 2 + 2 + 3 = 8
        total_expected_fares = sum(expected_fees.keys())   # 8.5 + 12 + 25 + 31 = 76.5
        
        if data["trip_count"] != 4:
            print(f"❌ EARNINGS SUMMARY TEST FAILED: Expected 4 trips, got {data['trip_count']}")
            return False
            
        if abs(data["total_fares"] - total_expected_fares) > 0.01:
            print(f"❌ EARNINGS SUMMARY TEST FAILED: Expected total_fares {total_expected_fares}, got {data['total_fares']}")
            return False
            
        if abs(data["total_service_fees"] - total_expected_fees) > 0.01:
            print(f"❌ EARNINGS SUMMARY TEST FAILED: Expected total_service_fees {total_expected_fees}, got {data['total_service_fees']}")
            return False
            
        expected_net = total_expected_fares - total_expected_fees
        if abs(data["net_amount"] - expected_net) > 0.01:
            print(f"❌ EARNINGS SUMMARY TEST FAILED: Expected net_amount {expected_net}, got {data['net_amount']}")
            return False
            
        # Validate individual trip fees
        for trip in data["trips"]:
            fare = trip["fare"]
            service_fee = trip["service_fee"]
            expected_fee = expected_fees.get(fare)
            if expected_fee and abs(service_fee - expected_fee) > 0.01:
                print(f"❌ EARNINGS SUMMARY TEST FAILED: Wrong service fee for fare ${fare}: expected ${expected_fee}, got ${service_fee}")
                return False
                
        print("✅ EARNINGS SUMMARY TEST PASSED")
        return True
        
    except Exception as e:
        print(f"❌ EARNINGS SUMMARY TEST FAILED: {e}")
        return False

def test_trips_listing(driver_id):
    """Test GET /api/drivers/{id}/trips endpoint"""
    print("\n" + "=" * 60)
    print("Testing Trips Listing")
    print("=" * 60)
    
    try:
        # Use a wide date range to capture all trips
        start_date = "2024-01-01T00:00:00Z"
        end_date = "2024-12-31T23:59:59Z"
        
        url = f"{API_BASE_URL}/drivers/{driver_id}/trips"
        params = {
            "start": start_date,
            "end": end_date
        }
        
        print(f"Making request to: {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 200:
            print(f"❌ TRIPS LISTING TEST FAILED: Expected status 200, got {response.status_code}")
            return False
            
        data = response.json()
        
        if not isinstance(data, list):
            print(f"❌ TRIPS LISTING TEST FAILED: Expected array, got {type(data)}")
            return False
            
        if len(data) != 4:
            print(f"❌ TRIPS LISTING TEST FAILED: Expected 4 trips, got {len(data)}")
            return False
            
        # Validate that we have the expected fares
        fares = [trip["fare"] for trip in data]
        expected_fares = [8.5, 12, 25, 31]
        
        for expected_fare in expected_fares:
            if expected_fare not in fares:
                print(f"❌ TRIPS LISTING TEST FAILED: Missing trip with fare ${expected_fare}")
                return False
                
        print("✅ TRIPS LISTING TEST PASSED")
        return True
        
    except Exception as e:
        print(f"❌ TRIPS LISTING TEST FAILED: {e}")
        return False

def main():
    """Run all backend tests"""
    print("Starting Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base URL: {API_BASE_URL}")
    
    results = {}
    driver_id = None
    
    # Test 1: Root endpoint
    results['root'] = test_root_endpoint()
    
    # Test 2: POST status endpoint
    post_success, created_item = test_post_status_endpoint()
    results['post_status'] = post_success
    
    # Test 3: GET status endpoint
    results['get_status'] = test_get_status_endpoint(created_item)
    
    # Test 4: Driver registration
    reg_success, driver_id = test_driver_registration()
    results['driver_registration'] = reg_success
    
    if driver_id:
        # Test 5: Online/Offline toggle
        results['online_offline'] = test_driver_online_offline(driver_id)
        
        # Test 6: Location update
        results['location_update'] = test_location_update(driver_id)
        
        # Test 7: Create trips
        trips_success, trip_ids = test_create_trips(driver_id)
        results['create_trips'] = trips_success
        
        # Test 8: Earnings summary
        results['earnings_summary'] = test_earnings_summary(driver_id)
        
        # Test 9: Trips listing
        results['trips_listing'] = test_trips_listing(driver_id)
    else:
        print("⚠️ Skipping driver-dependent tests due to registration failure")
        results.update({
            'online_offline': False,
            'location_update': False,
            'create_trips': False,
            'earnings_summary': False,
            'trips_listing': False
        })
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name.upper()}: {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("⚠️  SOME TESTS FAILED!")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)