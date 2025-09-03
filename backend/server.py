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
    # Convert distance from km to miles (1 km = 0.621371 miles)
    distance_in_miles = distance * 0.621371
    
    # Calculate fare: $1.00 per mile
    calculated_fare = distance_in_miles * 1.00
    
    # Apply minimum fare of $7.00
    final_fare = max(7.00, calculated_fare)
    
    return round(final_fare, 2)

# Helper function to calculate distance (simplified)
def calculate_distance(pickup: Location, destination: Location) -> float:
    # Simple distance calculation (in production, use proper geolocation)
    lat_diff = pickup.latitude - destination.latitude
    lon_diff = pickup.longitude - destination.longitude
    return ((lat_diff ** 2 + lon_diff ** 2) ** 0.5) * 111  # Rough conversion to km

# Authentication Routes
@api_router.post("/auth/send-code")
async def send_verification_code(user_data: UserLogin):
    """Send verification code (mocked)"""
    code = "123456"  # Mock code for testing
    verification_codes[user_data.phone] = code
    print(f"Verification code for {user_data.phone}: {code}")  # In production, send SMS
    return {"message": "Verification code sent", "success": True}

@api_router.post("/auth/verify-code")
async def verify_code(verify_data: VerifyCode):
    """Verify code and return user if exists"""
    stored_code = verification_codes.get(verify_data.phone)
    if not stored_code or stored_code != verify_data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Remove used code
    del verification_codes[verify_data.phone]
    
    # Check if user exists
    existing_user = await db.users.find_one({"phone": verify_data.phone})
    if existing_user:
        return {"user": User(**existing_user), "isNewUser": False}
    
    return {"user": None, "isNewUser": True}

@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    """Register new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"phone": user_data.phone})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user = User(**user_data.dict())
    await db.users.insert_one(user.dict())
    
    # If driver, create driver profile
    if user_data.userType == 'driver':
        driver = Driver(id=user.id, phone=user.phone)
        await db.drivers.insert_one(driver.dict())
    
    return user

@api_router.get("/auth/user/{phone}")
async def get_user_by_phone(phone: str):
    """Get user by phone number"""
    user = await db.users.find_one({"phone": phone})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Ride Routes
@api_router.post("/rides", response_model=Ride)
async def create_ride(ride_data: RideCreate, rider_id: str):
    """Create a new ride request"""
    # Calculate distance and fare
    distance = calculate_distance(ride_data.pickup, ride_data.destination)
    fare = calculate_fare(distance)
    
    ride = Ride(
        riderId=rider_id,
        pickup=ride_data.pickup,
        destination=ride_data.destination,
        distance=distance,
        fare=fare,
        duration=f"{int(distance * 2)} min"  # Rough estimate
    )
    
    await db.rides.insert_one(ride.dict())
    return ride

@api_router.get("/rides/available")
async def get_available_rides():
    """Get rides waiting for drivers"""
    rides = await db.rides.find({"status": "requested"}).to_list(50)
    return [Ride(**ride) for ride in rides]

@api_router.get("/rides/rider/{rider_id}")
async def get_rider_rides(rider_id: str):
    """Get all rides for a rider"""
    rides = await db.rides.find({"riderId": rider_id}).sort("createdAt", -1).to_list(50)
    return [Ride(**ride) for ride in rides]

@api_router.get("/rides/driver/{driver_id}")
async def get_driver_rides(driver_id: str):
    """Get all rides for a driver"""
    rides = await db.rides.find({"driverId": driver_id}).sort("createdAt", -1).to_list(50)
    return [Ride(**ride) for ride in rides]

@api_router.get("/rides/{ride_id}", response_model=Ride)
async def get_ride(ride_id: str):
    """Get ride by ID"""
    ride = await db.rides.find_one({"id": ride_id})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    return Ride(**ride)

@api_router.put("/rides/{ride_id}")
async def update_ride(ride_id: str, update_data: RideUpdate):
    """Update ride status"""
    await db.rides.update_one(
        {"id": ride_id},
        {"$set": update_data.dict(exclude_unset=True)}
    )
    return {"message": "Ride updated successfully"}

# Driver Routes
@api_router.put("/drivers/{driver_id}/location")
async def update_driver_location(driver_id: str, location_data: DriverLocationUpdate):
    """Update driver location"""
    location = Location(
        latitude=location_data.latitude,
        longitude=location_data.longitude
    )
    
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"location": location.dict()}}
    )
    return {"message": "Location updated successfully"}

@api_router.put("/drivers/{driver_id}/status")
async def update_driver_status(driver_id: str, status_data: DriverStatusUpdate):
    """Update driver online/offline status"""
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"isOnline": status_data.isOnline}}
    )
    return {"message": "Status updated successfully"}

@api_router.get("/drivers/nearby")
async def get_nearby_drivers(latitude: float, longitude: float, radius: float = 5.0):
    """Get nearby online drivers"""
    # Simple proximity search (in production, use geospatial queries)
    all_drivers = await db.drivers.find({"isOnline": True}).to_list(100)
    nearby_drivers = []
    
    user_location = Location(latitude=latitude, longitude=longitude)
    
    for driver_data in all_drivers:
        if driver_data.get('location'):
            driver_location = Location(**driver_data['location'])
            distance = calculate_distance(user_location, driver_location)
            if distance <= radius:
                nearby_drivers.append(Driver(**driver_data))
    
    return nearby_drivers

@api_router.get("/drivers/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str):
    """Get driver by ID"""
    driver = await db.drivers.find_one({"id": driver_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return Driver(**driver)

@api_router.put("/drivers/{driver_id}/accept-ride")
async def accept_ride(driver_id: str, ride_id: str):
    """Driver accepts a ride"""
    # Update ride status
    await db.rides.update_one(
        {"id": ride_id, "status": "requested"},
        {"$set": {"driverId": driver_id, "status": "accepted"}}
    )
    
    # Check if update was successful
    updated_ride = await db.rides.find_one({"id": ride_id})
    if not updated_ride or updated_ride.get("driverId") != driver_id:
        raise HTTPException(status_code=400, detail="Could not accept ride")
    
    return {"message": "Ride accepted successfully"}

# Rating Routes
@api_router.post("/ratings", response_model=Rating)
async def create_rating(rating_data: RatingCreate, rater_id: str):
    """Create a rating"""
    rating = Rating(
        raterId=rater_id,
        **rating_data.dict()
    )
    
    await db.ratings.insert_one(rating.dict())
    
    # Update average rating for the rated user
    user_ratings = await db.ratings.find({"ratedId": rating_data.ratedId}).to_list(1000)
    if user_ratings:
        avg_rating = sum(r["rating"] for r in user_ratings) / len(user_ratings)
        
        # Update driver rating if it's a driver
        await db.drivers.update_one(
            {"id": rating_data.ratedId},
            {"$set": {"rating": round(avg_rating, 1)}}
        )
    
    return rating

@api_router.get("/ratings/{user_id}")
async def get_user_ratings(user_id: str):
    """Get ratings for a user"""
    ratings = await db.ratings.find({"ratedId": user_id}).sort("createdAt", -1).to_list(100)
    return [Rating(**rating) for rating in ratings]

# Test Routes
@api_router.get("/")
async def root():
    return {"message": "RideApp API v1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

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
