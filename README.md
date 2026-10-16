# Queue Management System

A real-time digital queue management system designed to replace physical waiting lines with a centralized, concurrency-safe token system.

Organizations can create and manage multiple service queues while customers obtain and track their tokens in real time on mobile devices without requiring registration.

---

## 1. System Architecture

```text
       Customer Mobile Devices                  Staff Dashboard
     (Join Queue / Track Token)             (Call Next / Serve / Skip)
                 │                                      │
                 ▼                                      ▼
           HTTP POST /join                     HTTP POST /next, /serve
                 │                                      │
                 └──────────────┬───────────────────────┘
                                │
                                ▼
                       Next.js API Handlers
                 (Atomic Conditional Mutations)
                                │
                                ▼
                        MongoDB Database
            (Compound Unique Indexes & Write Locks)
                                │
                                ▼
                     Shared Event Broadcaster
              (In-Process Event Bus + ChangeStream)
                                │
                                ▼
                       Server-Sent Events (SSE)
              (/api/queues/[queueId]/events Stream)
                                │
                                ▼
                    Connected Browser Clients
            (TanStack React Query Cache Invalidation)
```

---

## 2. Concurrency Control & Token Generation

### Concurrent Next-Token Claiming (`POST /api/queues/[queueId]/next`)
* **Problem:** In traditional read-then-write sequences (`findOne` followed by `save`), multiple staff members or receptionists clicking "Next" at the same millisecond can query the exact same waiting token, causing duplicate assignments.
* **Solution:** Uses MongoDB's atomic conditional mutation:
  ```typescript
  const nextToken = await tokenModel.findOneAndUpdate(
      { queueId: foundQueue._id, status: "waiting" },
      { $set: { status: "called" } },
      { sort: { createdAt: 1, tokenNumber: 1 }, new: true }
  );
  ```
* **Why this is 100% Concurrency-Safe:** MongoDB write operations on a single document are atomic. Even under high concurrency, MongoDB processes operations in strict serial order using document-level write locks. The first request matches the earliest waiting token and marks it `called`. The second concurrent request's query evaluates against the updated state; that token is no longer `waiting`, so it immediately matches the *next* token or returns `null` if no waiting tokens remain.

### Collision-Free Token Number Generation (`POST /api/queues/[queueId]/join`)
* **Problem:** Reading `queue.nextTokenNumber` into memory, creating the token, and saving the incremented counter leaves a critical race window where concurrent customers receive duplicate token numbers.
* **Solution:**
  1. **Atomic Counter Allocation:** Employs `queueModel.findByIdAndUpdate(queueId, { $inc: { nextTokenNumber: 1 } }, { new: false })`. Because `$inc` is atomic in MongoDB, every concurrent join request is guaranteed an exclusive, monotonically increasing token number.
  2. **Compound Unique Database Index:** The `tokens` collection enforces a compound unique index:
     ```typescript
     tokenSchema.index({ queueId: 1, tokenNumber: 1 }, { unique: true });
     ```
     This provides a database-enforced safety guarantee that no two tokens can ever share the same number within a queue.
  3. **Failure Compensation:** If token insertion fails (e.g. client validation error or network abort), the allocated counter is compensated (`$inc: { nextTokenNumber: -1 }`), preventing counter corruption.

---

## 3. Real-Time Updates (SSE & MongoDB Change Streams)

### Shared Event Architecture (`src/lib/queueEvents.ts`)
* **Connection Scalability:** Previously, opening a separate `queueModel.watch()` change stream per connected SSE client led to severe cursor and thread exhaustion on MongoDB. The system now uses a **shared event manager**:
  1. A central in-memory Pub/Sub event bus dispatches events directly when queue operations (`next`, `serve`, `skip`, `join`, `status`, `cancel`) execute.
  2. A single, shared MongoDB change stream is initialized across the entire application to detect out-of-band database mutations if a replica set is active.
* **Queue-Specific Client Subscriptions:** Connected clients subscribe to `/api/queues/[queueId]/events`. The event bus routes events strictly by channel (`queue:${queueId}`), ensuring clients only receive updates relevant to their queue.
* **Serving and Skipping Coverage:** Operations on tokens (`/serve` and `/skip`) emit real-time events through the shared event bus, ensuring waiting room displays and customer mobile screens immediately reflect when a token is completed or skipped.
* **Heartbeat & Disconnection Cleanup:** Sends an SSE comment heartbeat (`: heartbeat\n\n`) every 15 seconds to prevent intermediate proxy timeouts. When a client closes their tab or disconnects, the stream's `cancel()` callback unregisters the listener immediately, preventing memory leaks.

---

## 4. Reconnection & State Recovery

* **Immediate Authoritative Synchronization:** When an SSE client connects or reconnects after a network drop, the server immediately sends an initial state packet containing the current `currentToken` and queue `status`.
* **Client-Side Cache Invalidation:** The frontend React Query client listens for incoming SSE events and triggers `queryClient.invalidateQueries`. Rather than trusting out-of-order event streams, it immediately refetches the authoritative current queue state from the REST API.

---

## 5. Deployment Requirements

* **MongoDB:**
  * **Standalone MongoDB:** Supported. The system relies on atomic conditional queries (`findOneAndUpdate`, `$inc`, and compound unique indexes) and the in-process event bus.
  * **MongoDB Replica Set:** Recommended for production to enable MongoDB Change Streams (`queueModel.watch()`) and multi-document transactions.
* **Multi-Instance / Clustered Scale:** In horizontally scaled deployments across multiple server containers, process memory is not shared. To broadcast SSE updates across multiple Next.js container instances, integrate a Redis Pub/Sub backplane into `queueEvents.ts`.

---

## 6. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/queue_management

# Authentication
NEXTAUTH_SECRET=your_super_secret_jwt_key
NEXTAUTH_URL=http://localhost:3000

# Optional Email / Notification Service
RESEND_API_KEY=
```

*(Never commit `.env` or secret keys to version control).*

---

## 7. Installation & Scripts

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Regression Tests
Runs the built-in Node.js concurrency and real-time test suite (11 test cases covering race conditions, token number allocation, and SSE subscription isolation):
```bash
npm test
```

### 3. Run Type Checking
```bash
npx tsc --noEmit
```

### 4. Build for Production
```bash
npm run build
```

### 5. Start Development Server
```bash
npm run dev
```

---

## 8. Data Models Summary

### Queue Model (`src/models/queue.model.ts`)
* `organizationId`: ObjectId referencing `organization` (Indexed).
* `name`: String (Required).
* `description`: String.
* `nextTokenNumber`: Number (Monotonic counter, default: 1).
* `status`: Enum `["working", "paused", "break"]` (Default: "working").
* `currentTokenNumber`: Number (Token currently called).
* `avgServiceTimePerCustomer`: Number.

### Token Model (`src/models/token.model.ts`)
* `queueId`: ObjectId referencing `queue` (Required).
* `tokenNumber`: Number (Required).
* `name`: String.
* `email`: String (Required).
* `phoneNumber`: String.
* `status`: Enum `["waiting", "called", "served", "cancelled", "skipped"]` (Default: "waiting").
* **Indexes:**
  * Compound Unique: `{ queueId: 1, tokenNumber: 1 }`
  * Chronological Search: `{ queueId: 1, status: 1, createdAt: 1 }`
  * Active Token Lookup: `{ queueId: 1, email: 1, phoneNumber: 1 }`

---

## 9. Known Limitations

* **Durable Event Replay:** The system prioritizes authoritative state refetching on reconnection rather than persisting change stream event logs. If durable message replay is required, an external event store (e.g. Kafka or Redis Streams) can be added.
* **Single-Process Event Bus:** Without an external broker like Redis Pub/Sub, real-time SSE broadcasts occur within the running Node.js process. For multi-node cluster deployments, Redis Pub/Sub should back the `queueEvents` emitter.
