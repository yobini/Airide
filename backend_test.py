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

def main():
    """Run all backend tests"""
    print("Starting Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base URL: {API_BASE_URL}")
    
    results = {}
    
    # Test 1: Root endpoint
    results['root'] = test_root_endpoint()
    
    # Test 2: POST status endpoint
    post_success, created_item = test_post_status_endpoint()
    results['post_status'] = post_success
    
    # Test 3: GET status endpoint
    results['get_status'] = test_get_status_endpoint(created_item)
    
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