from fastapi import FastAPI, APIRouter, HTTPException, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import random
import string


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Location Model
class Location(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None

# Vehicle Model
class Vehicle(BaseModel):
    make: str
    model: str
    year: str
    plateNumber: str

# User Models
class UserProfile(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    userType: str  # 'rider' | 'driver'
    language: str = 'en'  # 'en' | 'am'
    profile: Optional[UserProfile] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    phone: str
    userType: str
    language: str = 'en'

class UserLogin(BaseModel):
    phone: str

class VerifyCode(BaseModel):
    phone: str
    code: str

# Driver Models
class Driver(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    phone: str
    location: Optional[Location] = None
    vehicle: Optional[Vehicle] = None
    rating: float = 5.0
    isOnline: bool = False
    totalRides: int = 0
    earnings: float = 0.0

class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float

class DriverStatusUpdate(BaseModel):
    isOnline: bool

# Ride Models
class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    riderId: str
    driverId: Optional[str] = None
    pickup: Location
    destination: Location
    status: str = 'requested'  # 'requested' | 'accepted' | 'driverArriving' | 'inProgress' | 'completed' | 'cancelled'
    fare: float = 0.0
    distance: float = 0.0
    duration: str = "0 min"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    completedAt: Optional[datetime] = None

class RideCreate(BaseModel):
    pickup: Location
    destination: Location

class RideUpdate(BaseModel):
    status: str
    driverId: Optional[str] = None

# Rating Model
class Rating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rideId: str
    raterId: str  # Who is giving the rating
    ratedId: str  # Who is being rated
    rating: int
    comment: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class RatingCreate(BaseModel):
    rideId: str
    ratedId: str
    rating: int
    comment: Optional[str] = None

# Mock SMS Service
def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

# Store verification codes in memory (in production, use Redis)
verification_codes = {}

# Helper function to calculate fare
def calculate_fare(distance: float) -> float:
    base_fare = 50.0  # Ethiopian Birr
    per_km = 15.0
    return base_fare + (distance * per_km)

# Helper function to calculate distance (simplified)
def calculate_distance(pickup: Location, destination: Location) -> float:
    # Simple distance calculation (in production, use proper geolocation)
    lat_diff = pickup.latitude - destination.latitude
    lon_diff = pickup.longitude - destination.longitude
    return ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111  # Rough conversion to km

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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
