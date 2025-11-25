# Authentication API Testing Guide

## Base URL
```
http://localhost:4000/api
```

## 1. Admin Login
### Endpoint
```http
POST /auth/staff/login
```

### Request Body
```json
{
  "employeeId": "ADMIN_01",
  "password": "Prasanth@123"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "employeeId": "ADMIN_01",
    "name": "Prasanth Gannavarapu",
    "email": "prasanth@gmail.com",
    "role": "ADMIN",
    "trainAssigned": null,
    "permissions": ["ALL"]
  }
}
```

---

## 2. TTE Login
### Endpoint
```http
POST /auth/staff/login
```

### Request Body
```json
{
  "employeeId": "TTE_01",
  "password": "Prasanth@123"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "employeeId": "TTE_01",
    "name": "TTE Staff",
    "email": "tte@railway.com",
    "role": "TTE",
    "trainAssigned": 17225,
    "permissions": ["MARK_BOARDING", "MARK_NO_SHOW"]
  }
}
```

---

## 3. Passenger Login (with IRCTC ID)
### Endpoint
```http
POST /auth/passenger/login
```

### Request Body
```json
{
  "irctcId": "IR_8001",
  "password": "Prasanth@123"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "irctcId": "IR_8001",
    "name": "Prasanth Gannavarapu",
    "email": "prasanthgannavarapu12@gmail.com",
    "phone": "9515796516",
    "role": "PASSENGER"
  },
  "tickets": [
    {
      "pnr": "1880800001",
      "trainNumber": "17225",
      "trainName": "Amaravati Express",
      "from": "BZA",
      "to": "VSKP",
      "journeyDate": "15-11-2025",
      "status": "RAC",
      "racStatus": "1",
      "coach": "S1",
      "berth": "7",
      "class": "Sleeper"
    }
  ]
}
```

---

## 4. Passenger Login (with Email)
### Endpoint
```http
POST /auth/passenger/login
```

### Request Body
```json
{
  "email": "prasanthgannavarapu12@gmail.com",
  "password": "Prasanth@123"
}
```

### Response
Same as IRCTC ID login above.

---

## 5. Verify Token
### Endpoint
```http
GET /auth/verify
```

### Headers
```
Authorization: Bearer <your_jwt_token>
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "user": {
    "userId": "ADMIN_01",
    "role": "ADMIN",
    "trainAssigned": null,
    "permissions": ["ALL"]
  }
}
```

---

## 6. Logout
### Endpoint
```http
POST /auth/logout
```

###Headers
```
Authorization: Bearer <your_jwt_token>
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Error Responses

### Invalid Credentials (401)
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Missing Fields (400)
```json
{
  "success": false,
  "message": "Employee ID and password are required"
}
```

### Deactivated Account (403)
```json
{
  "success": false,
  "message": "Account is deactivated. Please contact administrator."
}
```

### Expired Token (401)
```json
{
  "success": false,
  "message": "Token has expired. Please login again."
}
```

### No Token (401)
```json
{
  "success": false,
  "message": "No authorization token provided"
}
```

---

## Testing with Postman

1. **Create a new request**
2. **Set method** to `POST`
3. **Enter URL**: `http://localhost:4000/api/auth/staff/login`
4. **Go to Body tab** → Select `raw` → Choose `JSON`
5. **Paste request body** (see examples above)
6. **Click Send**

7. **Copy the token** from the response
8. **Test protected routes**:
   - Create new GET request to `/api/auth/verify`
   - Go to **Headers** tab
   - Add: `Authorization` = `Bearer <paste_token_here>`
   - Click Send

---

## Testing with cURL

### Admin Login
```bash
curl -X POST http://localhost:4000/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"ADMIN_01","password":"Prasanth@123"}'
```

### Verify Token
```bash
curl -X GET http://localhost:4000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Next Steps

After testing backend authentication:
1. Create Login pages for frontend (Admin, TTE, Passenger)
2. Implement token storage in localStorage
3. Create protected routes
4. Add logout functionality
