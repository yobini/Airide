from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets
from enum import Enum
import asyncio
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DELTA = timedelta(days=30)

# Create the main app without a prefix
app = FastAPI(title="Airide API", description="Ride-sharing platform API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    PASSENGER = "passenger"
    DRIVER = "driver"
    ADMIN = "admin"

class RideStatus(str, Enum):
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    PICKED_UP = "picked_up"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class DriverStatus(str, Enum):
    OFFLINE = "offline"
    ONLINE = "online"
    BUSY = "busy"

class AuthProvider(str, Enum):
    GOOGLE = "google"
    FACEBOOK = "facebook"
    EMAIL = "email"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    picture: Optional[str] = None
    auth_provider: AuthProvider
    provider_id: Optional[str] = None  # Google/Facebook user ID
    role: UserRole
    is_verified: bool = True  # Social accounts are pre-verified
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Driver(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    license_number: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vehicle_color: str
    vehicle_plate: str
    status: DriverStatus = DriverStatus.OFFLINE
    current_location: Optional[Dict[str, float]] = None  # {"lat": 0.0, "lng": 0.0}
    rating: float = 5.0
    total_rides: int = 0
    is_approved: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    passenger_id: str
    driver_id: Optional[str] = None
    pickup_location: Dict[str, Any]  # {"lat": 0.0, "lng": 0.0, "address": ""}
    destination: Dict[str, Any]
    status: RideStatus = RideStatus.REQUESTED
    fare: Optional[float] = None
    distance: Optional[float] = None
    duration: Optional[int] = None  # in minutes
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    passenger_rating: Optional[int] = None
    driver_rating: Optional[int] = None

# Request/Response Models
class SocialAuthRequest(BaseModel):
    access_token: str
    provider: AuthProvider
    role: UserRole

class EmailRegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    role: UserRole

class EmailLoginRequest(BaseModel):
    email: str
    password: str

class DriverRegistrationRequest(BaseModel):
    license_number: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: int
    vehicle_color: str
    vehicle_plate: str

class RideRequest(BaseModel):
    pickup_location: Dict[str, Any]
    destination: Dict[str, Any]

class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float

class DriverStatusUpdate(BaseModel):
    status: DriverStatus

# Utility Functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + JWT_EXPIRATION_DELTA
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def verify_google_token(token: str):
    """Verify Google OAuth token and get user info"""
    try:
        # For demo/testing purposes, handle mock tokens
        if token.startswith("mock-google-token"):
            return {
                "provider_id": "google_demo_user_123",
                "email": "demo@google.com",
                "name": "Demo Google User",
                "picture": "https://via.placeholder.com/100",
                "verified_email": True
            }
            
        # Verify token with Google
        response = requests.get(
            f"https://www.googleapis.com/oauth2/v1/userinfo?access_token={token}",
            timeout=10
        )
        
        if response.status_code != 200:
            return None
            
        user_info = response.json()
        return {
            "provider_id": user_info.get("id"),
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "verified_email": user_info.get("verified_email", False)
        }
    except Exception as e:
        print(f"Error verifying Google token: {e}")
        return None

async def verify_facebook_token(token: str):
    """Verify Facebook OAuth token and get user info"""
    try:
        # Verify token with Facebook
        response = requests.get(
            f"https://graph.facebook.com/me?access_token={token}&fields=id,name,email,picture",
            timeout=10
        )
        
        if response.status_code != 200:
            return None
            
        user_info = response.json()
        return {
            "provider_id": user_info.get("id"),
            "email": user_info.get("email"),
            "name": user_info.get("name"),
            "picture": user_info.get("picture", {}).get("data", {}).get("url")
        }
    except Exception as e:
        print(f"Error verifying Facebook token: {e}")
        return None

# Authentication Routes
@api_router.post("/auth/social")
async def social_auth(request: SocialAuthRequest):
    """Handle social media authentication (Google/Facebook)"""
    user_info = None
    
    if request.provider == AuthProvider.GOOGLE:
        user_info = await verify_google_token(request.access_token)
    elif request.provider == AuthProvider.FACEBOOK:
        user_info = await verify_facebook_token(request.access_token)
    
    if not user_info:
        raise HTTPException(status_code=400, detail="Invalid social media token")
    
    if not user_info.get("email"):
        raise HTTPException(status_code=400, detail="Email is required from social provider")
    
    # Check if user already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"email": user_info["email"]},
            {"provider_id": user_info["provider_id"], "auth_provider": request.provider}
        ]
    })
    
    if existing_user:
        # Update existing user
        await db.users.update_one(
            {"id": existing_user["id"]},
            {"$set": {
                "name": user_info["name"],
                "picture": user_info.get("picture"),
                "updated_at": datetime.utcnow()
            }}
        )
        user = User(**existing_user)
        access_token = create_access_token(data={"sub": user.id})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user.dict()
        }
    
    # Create new user
    user = User(
        email=user_info["email"],
        name=user_info["name"],
        picture=user_info.get("picture"),
        auth_provider=request.provider,
        provider_id=user_info["provider_id"],
        role=request.role
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.post("/auth/email/register")
async def email_register(request: EmailRegisterRequest):
    """Handle email/password registration"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Hash password (simplified - in production use proper hashing)
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    # Create user
    user = User(
        email=request.email,
        name=request.name,
        auth_provider=AuthProvider.EMAIL,
        role=request.role
    )
    
    # Store user with password hash
    user_data = user.dict()
    user_data["password_hash"] = password_hash
    
    await db.users.insert_one(user_data)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.post("/auth/email/login")
async def email_login(request: EmailLoginRequest):
    """Handle email/password login"""
    # Find user
    user_data = await db.users.find_one({"email": request.email, "auth_provider": "email"})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify password
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    if user_data.get("password_hash") != password_hash:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    user = User(**user_data)
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

# User Routes
@api_router.get("/user/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/user/profile")
async def update_profile(name: str, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"name": name, "updated_at": datetime.utcnow()}}
    )
    return {"message": "Profile updated successfully"}

# Driver Routes
@api_router.post("/driver/register")
async def register_driver(request: DriverRegistrationRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can register as drivers")
    
    existing_driver = await db.drivers.find_one({"user_id": current_user.id})
    if existing_driver:
        raise HTTPException(status_code=400, detail="Driver profile already exists")
    
    driver = Driver(
        user_id=current_user.id,
        license_number=request.license_number,
        vehicle_make=request.vehicle_make,
        vehicle_model=request.vehicle_model,
        vehicle_year=request.vehicle_year,
        vehicle_color=request.vehicle_color,
        vehicle_plate=request.vehicle_plate
    )
    
    await db.drivers.insert_one(driver.dict())
    return {"message": "Driver registered successfully", "driver": driver.dict()}

@api_router.get("/driver/profile")
async def get_driver_profile(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    driver = await db.drivers.find_one({"user_id": current_user.id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    return Driver(**driver)

@api_router.put("/driver/status")
async def update_driver_status(request: DriverStatusUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$set": {"status": request.status, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Driver status updated successfully"}

@api_router.put("/driver/location")
async def update_driver_location(request: DriverLocationUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    location = {"lat": request.latitude, "lng": request.longitude}
    
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$set": {"current_location": location, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Location updated successfully"}

# Ride Routes
@api_router.post("/rides/request")
async def request_ride(request: RideRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PASSENGER:
        raise HTTPException(status_code=403, detail="Only passengers can request rides")
    
    # Check if user has any active rides
    active_ride = await db.rides.find_one({
        "passenger_id": current_user.id,
        "status": {"$in": [RideStatus.REQUESTED, RideStatus.ACCEPTED, RideStatus.PICKED_UP]}
    })
    
    if active_ride:
        raise HTTPException(status_code=400, detail="You already have an active ride")
    
    ride = Ride(
        passenger_id=current_user.id,
        pickup_location=request.pickup_location,
        destination=request.destination
    )
    
    await db.rides.insert_one(ride.dict())
    return {"message": "Ride requested successfully", "ride": ride.dict()}

@api_router.get("/rides/passenger")
async def get_passenger_rides(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PASSENGER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    rides = await db.rides.find({"passenger_id": current_user.id}).sort("requested_at", -1).to_list(100)
    return [Ride(**ride).dict() for ride in rides]

@api_router.get("/rides/driver")
async def get_driver_rides(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    rides = await db.rides.find({"driver_id": current_user.id}).sort("requested_at", -1).to_list(100)
    return [Ride(**ride).dict() for ride in rides]

@api_router.get("/rides/available")
async def get_available_rides(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get available rides (not accepted yet)
    rides = await db.rides.find({"status": RideStatus.REQUESTED}).sort("requested_at", 1).to_list(50)
    return [Ride(**ride).dict() for ride in rides]

@api_router.put("/rides/{ride_id}/accept")
async def accept_ride(ride_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ride = await db.rides.find_one({"id": ride_id, "status": RideStatus.REQUESTED})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found or already accepted")
    
    # Check if driver is online
    driver = await db.drivers.find_one({"user_id": current_user.id})
    if not driver or driver["status"] != DriverStatus.ONLINE:
        raise HTTPException(status_code=400, detail="Driver must be online to accept rides")
    
    # Update ride
    await db.rides.update_one(
        {"id": ride_id},
        {"$set": {
            "driver_id": current_user.id,
            "status": RideStatus.ACCEPTED,
            "accepted_at": datetime.utcnow()
        }}
    )
    
    # Update driver status to busy
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$set": {"status": DriverStatus.BUSY}}
    )
    
    return {"message": "Ride accepted successfully"}

@api_router.put("/rides/{ride_id}/pickup")
async def pickup_passenger(ride_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ride = await db.rides.find_one({"id": ride_id, "driver_id": current_user.id, "status": RideStatus.ACCEPTED})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    await db.rides.update_one(
        {"id": ride_id},
        {"$set": {
            "status": RideStatus.PICKED_UP,
            "picked_up_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Passenger picked up successfully"}

@api_router.put("/rides/{ride_id}/complete")
async def complete_ride(ride_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    ride = await db.rides.find_one({"id": ride_id, "driver_id": current_user.id, "status": RideStatus.PICKED_UP})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    await db.rides.update_one(
        {"id": ride_id},
        {"$set": {
            "status": RideStatus.COMPLETED,
            "completed_at": datetime.utcnow()
        }}
    )
    
    # Update driver status back to online
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$set": {"status": DriverStatus.ONLINE}}
    )
    
    # Update driver total rides
    await db.drivers.update_one(
        {"user_id": current_user.id},
        {"$inc": {"total_rides": 1}}
    )
    
    return {"message": "Ride completed successfully"}

# Health check
@api_router.get("/")
async def root():
    return {"message": "Airide API is running", "status": "healthy"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()