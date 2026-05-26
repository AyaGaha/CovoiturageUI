# Booking Integration - Quick Reference & Recommendations

## Current Status ✅

### What's Working
1. **Backend REST Endpoints** - All booking operations available
2. **Backend GraphQL Queries** - Fetching bookings with trip details
3. **Frontend AppContext** - Booking state management implemented
4. **HTTP Client** - JWT auth token handling with interceptors
5. **Services Layer** - bookingsService properly connected

### Architecture: Hybrid REST + GraphQL
- **Mutations** (CREATE, UPDATE, DELETE): REST endpoints
- **Queries** (READ): GraphQL queries
- This is a valid pattern and works well!

---

## Quick Setup Checklist

### ✅ Backend (No changes needed if working)
- [x] REST endpoints configured in `bookings.controller.ts`
- [x] GraphQL queries available in `bookings.resolver.ts`
- [x] Service layer with business logic
- [x] JWT authentication guards
- [x] Event emitters for real-time updates

### ✅ Frontend (Ready to use)
- [x] AppContext.tsx with booking state
- [x] bookingsService.ts with API calls
- [x] HTTP client with auth interceptors
- [x] Error handling and notifications
- [x] Loading states

---

## Optional Enhancements for Better Integration

### 1. **Add GraphQL Mutations for Bookings** (Recommended)

This would provide a unified GraphQL API and enable better real-time subscriptions.

**File:** `src/bookings/bookings.resolver.ts`

Add these mutations:

```typescript
@Mutation(() => BookingWithTripType)
createBooking(
  @Args('tripId', { type: () => Int }) tripId: number,
  @Context() context: any,
) {
  const passengerId = context.req.user.id;
  return this.bookingsService.bookTrip(passengerId, tripId);
}

@Mutation(() => BookingWithTripType)
cancelBooking(
  @Args('id', { type: () => Int }) id: number,
  @Context() context: any,
) {
  const passengerId = context.req.user.id;
  return this.bookingsService.cancelBooking(id, passengerId);
}

@Mutation(() => BookingWithTripType)
confirmBooking(
  @Args('id', { type: () => Int }) id: number,
  @Context() context: any,
) {
  const driverId = context.req.user.id;
  return this.bookingsService.confirmBooking(id, driverId);
}

@Mutation(() => BookingWithTripType)
rejectBooking(
  @Args('id', { type: () => Int }) id: number,
  @Context() context: any,
) {
  const driverId = context.req.user.id;
  return this.bookingsService.rejectBooking(id, driverId);
}

@Query(() => [BookingWithTripType])
pendingBookingsForTrip(
  @Args('tripId', { type: () => Int }) tripId: number,
  @Context() context: any,
) {
  const driverId = context.req.user.id;
  return this.bookingsService.getPendingBookingsForTrip(tripId, driverId);
}
```

### 2. **Add GraphQL Subscriptions for Real-Time Updates** (Advanced)

Enable real-time notifications for booking changes:

```typescript
@Subscription(() => BookingWithTripType)
bookingStatusChanged() {
  return this.eventEmitter.toRxJS('booking.confirmed', 'booking.rejected', 'booking.cancelled');
}
```

### 3. **Update Frontend to Use Full GraphQL** (Optional)

If you add GraphQL mutations, update `bookingsService.ts`:

```typescript
// New GraphQL-based methods
const createBookingGraphQL = async (tripId: number): Promise<Booking> => {
  const mutation = `
    mutation CreateBooking($tripId: Int!) {
      createBooking(tripId: $tripId) {
        id
        status
        trip { id departure destination price }
      }
    }
  `;
  return executeGraphQL({ query: mutation, variables: { tripId } });
};
```

### 4. **Add Optimistic UI Updates**

Update AppContext to show immediate UI feedback:

```typescript
const createBooking = useCallback(async (tripId: number) => {
  // Optimistically add booking to state
  const tempBooking: Booking = {
    id: -1, // temporary ID
    passengerId: userState?.id || 0,
    tripId,
    trip: trips.find(t => t.id === tripId)!,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  setBookings(prev => [tempBooking, ...prev]);

  try {
    const booking = await bookingsService.createBooking(tripId);
    // Replace temp booking with real one
    setBookings(prev =>
      prev.map(b => b.id === -1 ? { ...tempBooking, id: booking.id } : b)
    );
  } catch (error) {
    // Revert on error
    setBookings(prev => prev.filter(b => b.id !== -1));
    throw error;
  }
}, [trips, userState, addNotification]);
```

### 5. **Add Booking Polling/Refresh**

Add background refresh for pending bookings:

```typescript
// In AppContext, add periodic refresh for drivers
useEffect(() => {
  if (!isAuthenticated || userState?.role !== 'driver') return;

  const interval = setInterval(() => {
    // Refresh pending bookings for driver's trips
    driverTrips.forEach(trip => {
      bookingsService.getPendingBookings(trip.id)
        .then(pending => {
          // Update bookingRequests state
        });
    });
  }, 5000); // Every 5 seconds

  return () => clearInterval(interval);
}, [isAuthenticated, userState?.role, driverTrips]);
```

### 6. **Add Loading States per Booking**

Track which bookings are being acted on:

```typescript
const [bookingActionsLoading, setBookingActionsLoading] = useState<Set<number>>(new Set());

const cancelBooking = useCallback(async (bookingId: number) => {
  setBookingActionsLoading(prev => new Set([...prev, bookingId]));
  try {
    // ... cancellation logic
  } finally {
    setBookingActionsLoading(prev => {
      const next = new Set(prev);
      next.delete(bookingId);
      return next;
    });
  }
}, []);
```

---

## Integration Checklist for Your Use Cases

### Use Case: Passenger Books a Trip
- [x] Frontend displays trip details
- [x] User clicks "Réserver"
- [x] AppContext.createBooking() called
- [x] API sends POST /bookings with JWT
- [x] Backend validates and creates booking
- [x] UI shows success notification
- [x] Booking appears in Réservations page

**Status:** ✅ Ready

---

### Use Case: Passenger Cancels Booking
- [x] User clicks cancel on booking card
- [x] AppContext.cancelBooking() called
- [x] API sends DELETE /bookings/:id
- [x] Backend validates ownership and cancels
- [x] UI updates booking status to cancelled
- [x] Notification shown to user

**Status:** ✅ Ready

---

### Use Case: Driver Sees Pending Requests
- [x] Driver logs in and goes to Mes Trajets
- [ ] System fetches pending bookings for each trip
- [ ] Pending requests displayed on trip cards
- [ ] Driver can accept/reject requests

**Status:** ⚠️ Partially Ready - Need to wire up loadBookingRequests

**Required Update to AppContext:**
```typescript
const loadBookingRequests = async () => {
  if (!isAuthenticated || userState?.role !== 'driver') return;
  
  try {
    setBookingsLoading(true);
    const allRequests = [];
    
    for (const trip of driverTrips) {
      const pending = await bookingsService.getPendingBookings(trip.id);
      allRequests.push(...pending);
    }
    
    setBookingRequests(allRequests);
  } catch (error) {
    console.error('Failed to load booking requests:', error);
  } finally {
    setBookingsLoading(false);
  }
};

// Call in useEffect after loading driverTrips
useEffect(() => {
  if (driverTrips.length > 0) {
    loadBookingRequests();
  }
}, [driverTrips, isAuthenticated]);
```

---

### Use Case: Driver Confirms/Rejects Booking
- [x] Driver sees pending request
- [x] Driver clicks confirm/reject
- [x] AppContext.confirmBooking() or rejectBooking() called
- [x] API sends PATCH /bookings/:id/confirm or /reject
- [x] Backend updates booking status
- [x] UI removes request from pending list
- [x] Notification shown to driver

**Status:** ✅ Ready

---

## Testing Commands

### Test Backend Endpoints with cURL

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger@test.com","password":"password"}' \
  | jq -r '.accessToken')

# 2. Create booking
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tripId":1}'

# 3. Get pending bookings (as driver)
curl -X GET http://localhost:3000/bookings/trip/1/pending \
  -H "Authorization: Bearer $TOKEN"

# 4. Confirm booking
curl -X PATCH http://localhost:3000/bookings/1/confirm \
  -H "Authorization: Bearer $TOKEN"

# 5. Test GraphQL query
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{myBookings{id status trip{id departure destination}}}"}'
```

---

## Frontend Component Integration

### Reservations Page (`pages/Reservations.tsx`)
```typescript
import { useAppContext } from '@/context/AppContext';

export function Reservations() {
  const { bookings, bookingsLoading, cancelBooking } = useAppContext();

  return (
    <div>
      {bookingsLoading && <LoadingSpinner />}
      {bookings.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          onCancel={() => cancelBooking(booking.id)}
        />
      ))}
    </div>
  );
}
```

### Trips Page - Driver View (`pages/Trips.tsx`)
```typescript
import { useAppContext } from '@/context/AppContext';

export function Trips() {
  const { driverTrips, bookingRequests, confirmBooking, rejectBooking } = useAppContext();

  return (
    <div>
      {driverTrips.map(trip => (
        <TripCard
          key={trip.id}
          trip={trip}
          pendingRequests={bookingRequests.filter(r => r.tripId === trip.id)}
          onConfirm={confirmBooking}
          onReject={rejectBooking}
        />
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### Issue: Bookings not loading after login
**Solution:** Check that `loadBookings()` is called in the `initializeApp` useEffect
```typescript
// In AppContext.tsx, ensure this exists:
useEffect(() => {
  if (isAuthenticated) {
    loadBookings();
  }
}, [isAuthenticated]);
```

### Issue: "No token in localStorage"
**Solution:** Verify JWT token is being saved correctly after login
```javascript
// In browser console
localStorage.getItem('accessToken')
localStorage.getItem('user')
```

### Issue: 401 Unauthorized errors
**Solution:** Token might be expired. Check token refresh logic in http-client.ts

### Issue: Pending bookings not showing for driver
**Solution:** Need to add the missing `loadBookingRequests()` function (see above)

---

## Next Steps

1. **Verify current integration works** - Test the flows described above
2. **Optional:** Add GraphQL mutations for unified API
3. **Optional:** Implement real-time subscriptions
4. **Recommended:** Add optimistic UI updates for better UX
5. **Recommended:** Add background polling for pending bookings (driver)
6. **Nice-to-have:** Add offline support with service workers

---

## File References

**Backend:**
- Main service: `src/bookings/bookings.service.ts`
- REST controller: `src/bookings/bookings.controller.ts`
- GraphQL resolver: `src/bookings/bookings.resolver.ts`
- GraphQL types: `src/bookings/graphql/`

**Frontend:**
- Context: `app/src/context/AppContext.tsx`
- Service: `app/src/services/bookings.ts`
- Pages: `app/src/pages/Reservations.tsx`, `app/src/pages/Trips.tsx`
- HTTP Client: `app/src/lib/http-client.ts`
