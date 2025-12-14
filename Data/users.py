from pymongo import MongoClient
from datetime import datetime
import bcrypt

client = MongoClient("mongodb://localhost:27017/")
db = client["rac"]

# Date: 15-11-2025
created_date = datetime(2025, 11, 15, 0, 0, 0)

# Function to hash passwords
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


# ==============================
# 1. TTE USERS (includes Admin)
# ==============================
tte_users_collection = db["tte_users"]

# Admin user
admin_doc = {
    "employeeId": "ADMIN_01",
    "passwordHash": hash_password("Prasanth@123"),
    "email": "prasanth@gmail.com",
    "name": "Prasanth Gannavarapu",
    "role": "ADMIN",
    "active": True,
    "trainAssigned": None,
    "phone": "9392629863",
    "createdAt": created_date,
    "lastLogin": None,
    "permissions": ["ALL"]
}

# Regular TTE
tte_doc = {
    "employeeId": "TTE_01",
    "passwordHash": hash_password("Prasanth@123"),
    "email": "tte@railway.com",
    "name": "TTE Staff",
    "role": "TTE",
    "active": True,
    "trainAssigned": 17225,
    "phone": "9999999999",
    "shift": "MORNING",
    "createdAt": created_date,
    "lastLogin": None,
    "permissions": ["MARK_BOARDING", "MARK_NO_SHOW"]
}

# Insert Admin + TTE
tte_users_collection.insert_many([admin_doc, tte_doc])
print("✅ Admin + TTE created in tte_users collection")


# ==============================
# 2. PASSENGER ACCOUNTS
# ==============================
passenger_accounts_collection = db["passenger_accounts"]

passenger_doc = {
    "email": "prasanthgannavarapu12@gmail.com",
    "IRCTC_ID": "IR_0001",
    "passwordHash": hash_password("Prasanth@123"),
    "name": "Prasanth Gannavarapu",
    "role": "PASSENGER",
    "phone": "9515796516",
    "active": True,
    "createdAt": created_date,
    "lastLogin": None,
    "emailVerified": True,
    "phoneVerified": False
}

passenger_accounts_collection.insert_one(passenger_doc)
print("✅ Passenger created in passenger_accounts collection")

print("\n🎉 Collections created successfully!")
print("\n📋 Login Credentials:")
print("=" * 60)
print("ADMIN (tte_users):")
print("  employeeId: 'ADMIN_01'")
print("  password: 'Prasanth@123'")

print("\nTTE (tte_users):")
print("  employeeId: 'TTE_01'")
print("  password: 'Prasanth@123'")

print("\nPASSENGER (passenger_accounts):")
print("  email: 'prasanthgannavarapu12@gmail.com'")
print("  password: 'Prasanth@123'")
