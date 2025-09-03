from fastapi import FastAPI, APIRouter, HTTPException
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


# =====================================
# Existing Demo Models & Routes
# =====================================
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]


# =====================================
# Driver & Vehicle Models
# =====================================
class Vehicle(BaseModel):
    make: str
    model: str
    plate: str
    color: Optional[str] = None
    year: Optional[int] = None

class DriverCreate(BaseModel):
    name: str
    phone: str
    vehicle: Vehicle

class DriverOut(BaseModel):
    id: str
    name: str
    phone: str
    vehicle: Vehicle
    online: bool = False
    created_at: datetime
    updated_at: datetime
    latest_location: Optional[dict] = None  # {lat, lng, timestamp, speed?, heading?}

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = None
    heading: Optional[float] = None

async def _get_driver_or_404(driver_id: str) -> dict:
    driver = await db.drivers.find_one({"id": driver_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return driver

@api_router.post("/drivers/register", response_model=DriverOut)
async def register_driver(body: DriverCreate):
    now = datetime.utcnow()
    driver_doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "phone": body.phone,
        "vehicle": body.vehicle.dict(),
        "online": False,
        "created_at": now,
        "updated_at": now,
        "latest_location": None,
    }
    await db.drivers.insert_one(driver_doc)
    return DriverOut(**driver_doc)

@api_router.get("/drivers/{driver_id}", response_model=DriverOut)
async def get_driver(driver_id: str):
    driver = await _get_driver_or_404(driver_id)
    return DriverOut(**driver)

@api_router.post("/drivers/{driver_id}/online", response_model=DriverOut)
async def go_online(driver_id: str):
    _ = await _get_driver_or_404(driver_id)
    now = datetime.utcnow()
    await db.drivers.update_one({"id": driver_id}, {"$set": {"online": True, "updated_at": now}})
    driver = await db.drivers.find_one({"id": driver_id})
    return DriverOut(**driver)

@api_router.post("/drivers/{driver_id}/offline", response_model=DriverOut)
async def go_offline(driver_id: str):
    _ = await _get_driver_or_404(driver_id)
    now = datetime.utcnow()
    await db.drivers.update_one({"id": driver_id}, {"$set": {"online": False, "updated_at": now}})
    driver = await db.drivers.find_one({"id": driver_id})
    return DriverOut(**driver)

@api_router.post("/drivers/{driver_id}/location", response_model=DriverOut)
async def update_location(driver_id: str, loc: LocationUpdate):
    driver = await _get_driver_or_404(driver_id)
    now = datetime.utcnow()
    location_doc = {
        "id": str(uuid.uuid4()),
        "driver_id": driver_id,
        "lat": loc.lat,
        "lng": loc.lng,
        "speed": loc.speed,
        "heading": loc.heading,
        "timestamp": now,
    }
    # Append to history collection
    await db.driver_locations.insert_one(location_doc)
    # Update latest on driver
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"latest_location": location_doc, "updated_at": now}},
    )
    driver = await db.drivers.find_one({"id": driver_id})
    return DriverOut(**driver)


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