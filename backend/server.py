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

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone_number: str
    name: str
    email: Optional[str] = None
    role: UserRole
    is_verified: bool = False
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

class PhoneVerification(BaseModel):
    phone_number: str
    verification_code: str
    expires_at: datetime
    is_used: bool = False

# Request/Response Models
class PhoneVerificationRequest(BaseModel):
    phone_number: str

class VerifyPhoneRequest(BaseModel):
    phone_number: str
    verification_code: str

class RegisterRequest(BaseModel):
    phone_number: str
    name: str
    email: Optional[str] = None
    role: UserRole

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
def generate_verification_code():
    return str(secrets.randbelow(900000) + 100000)

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

async def send_sms_verification(phone_number: str, code: str):
    # TODO: Implement SMS sending using Twilio or similar service
    # For now, we'll just log it
    print(f"SMS Verification Code for {phone_number}: {code}")
    return True

# Authentication Routes
@api_router.post("/auth/send-verification")
async def send_verification_code(request: PhoneVerificationRequest):
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # Store verification code
    verification = PhoneVerification(
        phone_number=request.phone_number,
        verification_code=verification_code,
        expires_at=expires_at
    )
    
    await db.phone_verifications.delete_many({"phone_number": request.phone_number})
    await db.phone_verifications.insert_one(verification.dict())
    
    # Send SMS
    await send_sms_verification(request.phone_number, verification_code)
    
    return {"message": "Verification code sent successfully"}

@api_router.post("/auth/verify-phone")
async def verify_phone(request: VerifyPhoneRequest):
    verification = await db.phone_verifications.find_one({
        "phone_number": request.phone_number,
        "verification_code": request.verification_code,
        "is_used": False
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if datetime.utcnow() > verification["expires_at"]:
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Mark as used
    await db.phone_verifications.update_one(
        {"_id": verification["_id"]},
        {"$set": {"is_used": True}}
    )
    
    return {"message": "Phone verified successfully"}

@api_router.post("/auth/register")
async def register_user(request: RegisterRequest):
    # Check if phone is verified
    verification = await db.phone_verifications.find_one({
        "phone_number": request.phone_number,
        "is_used": True
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Phone number not verified")
    
    # Check if user already exists
    existing_user = await db.users.find_one({"phone_number": request.phone_number})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create user
    user = User(
        phone_number=request.phone_number,
        name=request.name,
        email=request.email,
        role=request.role,
        is_verified=True
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.post("/auth/login")
async def login(request: PhoneVerificationRequest):
    user = await db.users.find_one({"phone_number": request.phone_number})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # For simplicity, we'll send a verification code for login too
    verification_code = generate_verification_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    verification = PhoneVerification(
        phone_number=request.phone_number,
        verification_code=verification_code,
        expires_at=expires_at
    )
    
    await db.phone_verifications.delete_many({"phone_number": request.phone_number})
    await db.phone_verifications.insert_one(verification.dict())
    
    await send_sms_verification(request.phone_number, verification_code)
    
    return {"message": "Verification code sent for login"}

@api_router.post("/auth/login-verify")
async def login_verify(request: VerifyPhoneRequest):
    verification = await db.phone_verifications.find_one({
        "phone_number": request.phone_number,
        "verification_code": request.verification_code,
        "is_used": False
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    if datetime.utcnow() > verification["expires_at"]:
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    user = await db.users.find_one({"phone_number": request.phone_number})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark verification as used
    await db.phone_verifications.update_one(
        {"_id": verification["_id"]},
        {"$set": {"is_used": True}}
    )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user).dict()
    }

# User Routes
@api_router.get("/user/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/user/profile")
async def update_profile(name: str, email: Optional[str] = None, current_user: User = Depends(get_current_user)):
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"name": name, "email": email, "updated_at": datetime.utcnow()}}
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