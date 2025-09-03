from fastapi import FastAPI, APIRouter, HTTPException, Query
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


# =====================================
# Trips & Earnings
# =====================================
class TripCreate(BaseModel):
    fare: float
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    distance_km: Optional[float] = None

class TripOut(BaseModel):
    id: str
    driver_id: str
    fare: float
    created_at: datetime
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    distance_km: Optional[float] = None

class TripWithFee(BaseModel):
    id: str
    fare: float
    service_fee: float
    created_at: datetime

class EarningsSummary(BaseModel):
    driver_id: str
    start: datetime
    end: datetime
    trip_count: int
    total_fares: float
    total_service_fees: float
    net_amount: float
    trips: List[TripWithFee]

def compute_service_fee(fare: float) -> float:
    # Assumptions while waiting for clarification:
    # - fare <= 10: $1
    # - 10 < fare < 20: $2
    # - 20 <= fare <= 30: $2 (not specified; defaulting to $2)
    # - fare > 30: $3
    if fare <= 10:
        return 1.0
    if fare > 10 and fare < 20:
        return 2.0
    if fare > 30:
        return 3.0
    # covers 20..30 inclusive
    return 2.0

@api_router.post("/drivers/{driver_id}/trips", response_model=TripOut)
async def create_trip(driver_id: str, trip: TripCreate):
    _ = await _get_driver_or_404(driver_id)
    now = datetime.utcnow()
    doc = {
        "id": str(uuid.uuid4()),
        "driver_id": driver_id,
        "fare": float(trip.fare),
        "created_at": now,
        "started_at": trip.started_at,
        "ended_at": trip.ended_at,
        "distance_km": trip.distance_km,
    }
    await db.trips.insert_one(doc)
    return TripOut(**doc)

@api_router.get("/drivers/{driver_id}/trips", response_model=List[TripOut])
async def list_trips(
    driver_id: str,
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
):
    _ = await _get_driver_or_404(driver_id)
    q = {"driver_id": driver_id}
    if start or end:
        time_filter = {}
        if start:
            time_filter["$gte"] = start
        if end:
            time_filter["$lte"] = end
        q["created_at"] = time_filter
    trips = await db.trips.find(q).sort("created_at", -1).to_list(1000)
    return [TripOut(**t) for t in trips]

@api_router.get("/drivers/{driver_id}/earnings", response_model=EarningsSummary)
async def earnings(
    driver_id: str,
    start: datetime,
    end: datetime,
):
    _ = await _get_driver_or_404(driver_id)
    q = {"driver_id": driver_id, "created_at": {"$gte": start, "$lte": end}}
    trips = await db.trips.find(q).to_list(2000)
    trip_with_fees: List[TripWithFee] = []
    total_fares = 0.0
    total_fees = 0.0
    for t in trips:
        fare = float(t.get("fare", 0.0))
        fee = compute_service_fee(fare)
        total_fares += fare
        total_fees += fee
        trip_with_fees.append(
            TripWithFee(id=t["id"], fare=fare, service_fee=fee, created_at=t["created_at"])  # type: ignore
        )
    net = total_fares - total_fees
    return EarningsSummary(
        driver_id=driver_id,
        start=start,
        end=end,
        trip_count=len(trip_with_fees),
        total_fares=round(total_fares, 2),
        total_service_fees=round(total_fees, 2),
        net_amount=round(net, 2),
        trips=trip_with_fees,
    )


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