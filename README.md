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

### Strict Queue State Machine Transitions (`/next`, `/serve`, `/skip`)
* **State Invariants:** Tokens transition strictly through `waiting` -> `called` -> `served` or `skipped`.
* **Single Active Token Guarantee:** `/next` checks whether an active token is currently in `"called"` status. If so, it returns `409 Conflict`, requiring the staff member to complete or skip the current customer before advancing.
* **Deterministic Serving:** `/serve` and `/skip` use atomic `findOneAndUpdate` with `{ sort: { tokenNumber: 1 } }` and reset `foundQueue.currentTokenNumber = null` upon completion.

### Collision-Free Token Number Generation (`POST /api/queues/[queueId]/join`)
* **Problem:** Reading `queue.nextTokenNumber` into memory, creating the token, and saving the incremented counter leaves a critical race window where concurrent customers receive duplicate token numbers.
* **Solution:**
  1. **Atomic Counter Allocation:** Employs `queueModel.findByIdAndUpdate(queueId, { $inc: { nextTokenNumber: 1 } }, { new: false })`. Because `$inc` is atomic in MongoDB, every concurrent join request is guaranteed an exclusive, monotonically increasing token number.
  2. **Compound Unique Database Index:** The `tokens` collection enforces a compound unique index:
     ```typescript
     tokenSchema.index({ queueId: 1, tokenNumber: 1 }, { unique: true });
     ```
     This provides a database-enforced safety guarantee that no two tokens can ever share the same number within a queue.
  3. **Monotonic Sequences Without Counter Rewinds:** Unlike arbitrary counters, ticketing sequences are strictly monotonic. If a token insert fails (e.g. database disconnect), the counter is **not** decremented. Attempting to decrement the counter under concurrency causes race conditions and collision cascades with concurrent requests. Gaps in sequence numbers on failure are standard, safe, and preserve unique monotonic allocation.

---

## 3. Real-Time Updates & Customer Privacy

### Customer PII Stripping on Public SSE Channels
* **Zero PII Exposure:** Public SSE streams (`/api/queues/[queueId]/events`) NEVER broadcast customer personal identifiable information. Customer names, email addresses, phone numbers, password hashes, and internal Mongoose fields (`__v`) are strictly stripped.
* **Sanitized Event Payload Contract:**
  ```typescript
  export interface SanitizedTokenSummary {
      _id: string;
      tokenNumber: number;
      status: string;
  }
  ```
  Both the route handlers and `QueueEventManager.emitQueueUpdate` enforce defensive sanitization before broadcasting.

### Shared Event Architecture (`src/lib/queueEvents.ts`)
* **Connection Scalability:** Previously, opening a separate `queueModel.watch()` change stream per connected SSE client led to severe cursor and thread exhaustion on MongoDB. The system now uses a **shared event manager**:
  1. A central in-memory Pub/Sub event bus dispatches events directly when queue operations (`next`, `serve`, `skip`, `join`, `status`, `cancel`) execute.
  2. A single, shared MongoDB change stream is initialized across the entire application to detect out-of-band database mutations if a replica set is active.
* **Queue-Specific Client Subscriptions:** Connected clients subscribe to `/api/queues/[queueId]/events`. The event bus routes events strictly by channel (`queue:${queueId}`), ensuring clients only receive updates relevant to their queue.
* **Heartbeat & Disconnection Cleanup:** Sends an SSE comment heartbeat (`: heartbeat\n\n`) every 15 seconds to prevent intermediate proxy timeouts. When a client closes their tab or disconnects, the stream's `cancel()` callback unregisters the listener immediately, preventing memory leaks.

---

## 4. Connection Handshake Synchronization & Recovery

* **Elimination of Handshake Race Conditions:** When a client opens an SSE connection:
  1. The server subscribes to `queueEvents` **first**, buffering any in-flight events that arrive while loading the database snapshot.
  2. The server performs an authoritative query for the current queue state and delivers the initial snapshot (`action: "initial"`).
  3. The server immediately drains and delivers all buffered events in exact sequence order.
  This prevents clients from missing updates that occur during connection negotiation.
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

# Optional Integration Test Database (Must support replica sets for change streams)
TEST_MONGO_URI=

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

### 2. Run Automated Regression & Concurrency Tests
Runs the built-in Node.js concurrency and real-time test suites (covering race conditions, monotonic allocation, PII sanitization, handshake buffering, and state transitions):
```bash
npm test
```

### 3. Run Historical Duplicate Token Diagnostic
Before deploying the compound unique index to existing production databases, audit legacy data for duplicate numbers:
```bash
node scripts/audit-duplicates.mjs
```

### 4. Run Linting and Type Checking
```bash
npm run lint
npx tsc --noEmit
```

### 5. Build for Production
```bash
npm run build
```

---

## 8. Data Models Summary

### Queue Model (`src/models/queue.model.ts`)
* `organizationId`: ObjectId referencing `organization` (Indexed).
* `name`: String (Required).
* `description`: String.
* `nextTokenNumber`: Number (Monotonic counter, default: 1).
* `status`: Enum `["working", "paused", "break"]` (Default: "working").
* `currentTokenNumber`: Number (Token currently called, null when idle).
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
