# Booking Module Integration Guide

## Current State Analysis

### ✅ Backend (covoiturage_2) - Fully Implemented

**REST Endpoints** (Authentication: JWT)
- `POST /bookings` - Create booking (passenger reserves trip)
- `DELETE /bookings/:id` - Cancel booking (passenger cancels reservation)
- `PATCH /bookings/:id/confirm` - Confirm booking (driver accepts pending request)
- `PATCH /bookings/:id/reject` - Reject booking (driver refuses pending request)
- `GET /bookings/trip/:tripId/pending` - Get pending booking requests for a trip (driver only)

**GraphQL Queries** (Authentication: JWT)
- `myBookings` - Get all bookings for authenticated passenger
- `booking(id)` - Get specific booking by ID
- Includes `trip` nested object with driver info

**Business Logic**
- Pessimistic locking for concurrency control
- Seat availability validation
- User authorization checks
- Event emission for real-time updates

### ✅ Frontend (CovoiturageUI) - Mostly Integrated

**Services Layer** (`src/services/bookings.ts`)
- REST methods: createBooking, cancelBooking, confirmBooking, rejectBooking
- GraphQL methods: getMyBookings, getBookingById
- Proper error handling and response typing

**Context Layer** (`src/context/AppContext.tsx`)
- Booking state management
- Booking request state for drivers
- Actions: createBooking, cancelBooking, confirmBooking, rejectBooking
- Automatic notifications on success/failure
- Loading states tracking

**HTTP Client Setup**
- JWT token auto-injection in request headers
- Token refresh logic with queue handling
- Error interceptor with proper logging

---

## Integration Flow

### 1. **Passenger Books a Trip**

```
Frontend (Component) 
  ↓ calls createBooking(tripId)
Frontend (AppContext)
  ↓ calls bookingsService.createBooking(tripId)
Frontend (HTTP Client)
  ↓ POST /bookings with JWT token
Backend (REST Controller)
  ↓ Validates & extracts passengerId from JWT
Backend (Service)
  ↓ Transaction: Check trip, increment seats, save booking
Backend (Response)
  ↓ Returns booking with ID and status
Frontend (AppContext)
  ↓ Updates bookings state & shows notification
Frontend (Component)
  ↓ Displays updated booking list
```

### 2. **Passenger Cancels Booking**

```
Frontend (Component)
  ↓ calls cancelBooking(bookingId)
Frontend (AppContext)
  ↓ calls bookingsService.cancelBooking(bookingId)
Frontend (HTTP Client)
  ↓ DELETE /bookings/:id with JWT token
Backend (REST Controller)
  ↓ Validates ownership (JWT passengerId)
Backend (Service)
  ↓ Transaction: Mark cancelled, decrement seats, emit event
Backend (Response)
  ↓ Returns updated booking
Frontend (AppContext)
  ↓ Updates bookings state & shows notification
```

### 3. **Driver Confirms/Rejects Pending Booking**

```
Frontend (Driver Component)
  ↓ calls confirmBooking(bookingId) or rejectBooking(bookingId)
Frontend (AppContext)
  ↓ calls bookingsService.confirmBooking(bookingId)
Frontend (HTTP Client)
  ↓ PATCH /bookings/:id/confirm with JWT token
Backend (REST Controller)
  ↓ Validates ownership (JWT driverId)
Backend (Service)
  ↓ Updates booking status from pending to confirmed/rejected
Backend (Response)
  ↓ Returns updated booking
Frontend (AppContext)
  ↓ Updates bookingRequests state & shows notification
```

### 4. **Get Passenger's Bookings**

```
Frontend (Page Mount)
  ↓ AppContext useEffect triggers loadBookings()
Frontend (AppContext)
  ↓ calls bookingsService.getMyBookings()
Frontend (GraphQL Client)
  ↓ POST /graphql with query + JWT token
Backend (GraphQL Resolver)
  ↓ Validates JWT, extracts passengerId
Backend (Service)
  ↓ Queries bookings for passenger with trip relations
Backend (GraphQL Response)
  ↓ Returns bookings with trip details and driver info
Frontend (AppContext)
  ↓ Updates bookings state
Frontend (Component)
  ↓ Displays bookings list
```

---

## API Endpoint Reference

### Create Booking
```bash
POST /bookings
Headers: Authorization: Bearer <JWT_TOKEN>
Body: { tripId: number }
Response: 
{
  id: number,
  passengerId: number,
  tripId: number,
  status: "pending" | "confirmed" | "cancelled",
  createdAt: string,
  cancelReason?: string
}
```

### Cancel Booking
```bash
DELETE /bookings/:id
Headers: Authorization: Bearer <JWT_TOKEN>
Response: { ...booking, status: "cancelled", cancelReason: "..." }
```

### Confirm Booking (Driver)
```bash
PATCH /bookings/:id/confirm
Headers: Authorization: Bearer <JWT_TOKEN>
Response: { ...booking, status: "confirmed" }
```

### Reject Booking (Driver)
```bash
PATCH /bookings/:id/reject
Headers: Authorization: Bearer <JWT_TOKEN>
Response: { ...booking, status: "rejected" }
```

### Get Pending Bookings for Trip (Driver)
```bash
GET /bookings/trip/:tripId/pending
Headers: Authorization: Bearer <JWT_TOKEN>
Response: BookingRequest[]
```

### Get My Bookings (GraphQL)
```graphql
query {
  myBookings {
    id
    status
    cancelReason
    createdAt
    trip {
      id
      departure
      destination
      date
      price
      driver {
        id
        name
        rating
      }
    }
  }
}
```

---

## Frontend Components Using Bookings

### Pages
- **Reservations.tsx** - Displays passenger's bookings
- **Trips.tsx** - Driver's trip management with pending requests

### Services
- **services/bookings.ts** - API communication layer
- **context/AppContext.tsx** - State management

### Data Types (`src/types`)
```typescript
type Booking = {
  id: number;
  passengerId: number;
  tripId: number;
  trip: Trip;
  status: BookingStatus;
  createdAt: string;
  cancelReason?: string;
};

type BookingRequest = {
  id: number;
  passengerId: number;
  tripId: number;
  status: string;
  passenger: User;
};

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected';
```

---

## Authentication & Security

✅ **JWT Token Handling**
- Token stored in localStorage
- Automatically added to all requests via HTTP client interceptor
- Auto-refresh on 401 responses with request queue handling
- User ID extracted from JWT on backend

✅ **Authorization**
- Passengers can only cancel their own bookings
- Drivers can only manage bookings for their trips
- Backend validates all operations

---

## Error Handling

### Frontend Error Responses
All errors trigger notifications:
```typescript
{
  type: 'error',
  message: 'Erreur de réservation',
  details: 'Error message from backend'
}
```

### Common Backend Errors
- `400 Bad Request` - Trip not available, seats full, duplicate booking
- `403 Forbidden` - Not authorized (wrong user or driver)
- `404 Not Found` - Trip or booking not found
- `500 Internal Server Error` - Server error

---

## Testing the Integration

### 1. Test Passenger Booking
```
1. Login as passenger
2. Go to Accueil (Home) page
3. Search for trips
4. Click "Réserver" on a trip
5. Should see success notification
6. Go to Réservations - booking should appear
```

### 2. Test Booking Cancellation
```
1. Go to Réservations page
2. Find a confirmed booking
3. Click cancel
4. Should see success notification
5. Booking status should change to cancelled
```

### 3. Test Driver Accepting/Rejecting
```
1. Login as driver
2. Go to Mes trajets page
3. Find trip with pending bookings
4. Click confirm/reject on a booking
5. Should see success notification
6. Booking requests list should update
```

---

## Real-Time Updates

The system uses:
- **Event Emitter** on backend for state changes
- **Server-Sent Events (SSE)** hook in frontend (`use-sse.ts`)
- **WebSocket subscriptions** for real-time notifications

When a booking is created/cancelled, events are emitted and can trigger real-time updates via SSE/WebSocket.

---

## Known Limitations & Future Improvements

### Current
- Bookings are loaded once on app initialization
- Manual refresh needed to see driver's pending requests
- No real-time synchronization between multiple windows

### Recommended Future Improvements
1. Add real-time booking updates via WebSocket
2. Implement infinite scroll for large booking lists
3. Add booking history/archive
4. Email notifications for booking changes
5. Add booking cancellation reasons
6. Implement automatic confirmation timeout
7. Add passenger rating after completed trip

---

## Debugging

### Enable Debug Logging
Check browser console for:
- `🔐 [HttpClient]` - HTTP request/response logs
- `🚀 [AuthContext]` - Auth state changes
- `📝 [AppContext]` - Booking operations

### Check Token
```javascript
localStorage.getItem('accessToken')
localStorage.getItem('user')
```

### Test GraphQL Directly
Use browser DevTools to call GraphQL endpoint:
```javascript
fetch('http://localhost:3000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  },
  body: JSON.stringify({
    query: '{ myBookings { id status } }'
  })
}).then(r => r.json()).then(console.log)
```
