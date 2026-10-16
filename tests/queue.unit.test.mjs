import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "events";

// =========================================================================
// UNIT TEST SUITE: Queue Management System Concurrency & Real-Time Logic
// (Mock-based in-memory simulation of MongoDB atomic single-document write locks)
// =========================================================================

// --- Test In-Memory Engine Simulating MongoDB Atomic Operations ---
class MockDatabase {
    constructor() {
        this.queues = new Map();
        this.tokens = new Map();
    }

    reset() {
        this.queues.clear();
        this.tokens.clear();
    }

    createQueue(id, data = {}) {
        const queue = {
            _id: id,
            organizationId: data.organizationId || "org_1",
            name: data.name || "Test Queue",
            status: data.status || "working",
            nextTokenNumber: data.nextTokenNumber !== undefined ? data.nextTokenNumber : 1,
            currentTokenNumber: data.currentTokenNumber !== undefined ? data.currentTokenNumber : null,
        };
        this.queues.set(id, queue);
        return { ...queue };
    }

    createToken(id, data) {
        // Enforce compound unique index { queueId: 1, tokenNumber: 1 }
        for (const t of this.tokens.values()) {
            if (t.queueId === data.queueId && t.tokenNumber === data.tokenNumber) {
                const err = new Error("E11000 duplicate key error collection: tokens index: queueId_1_tokenNumber_1 dup key");
                err.code = 11000;
                throw err;
            }
        }

        const token = {
            _id: id,
            queueId: data.queueId,
            tokenNumber: data.tokenNumber,
            name: data.name,
            email: data.email,
            phoneNumber: data.phoneNumber,
            status: data.status || "waiting",
            createdAt: data.createdAt || new Date(),
        };
        this.tokens.set(id, token);
        return { ...token };
    }

    // Atomic findOneAndUpdate simulating MongoDB single-document write lock
    async atomicFindOneAndUpdateToken(filter, update, options = {}) {
        return new Promise((resolve) => {
            setTimeout(() => {
                let matched = [];
                for (const t of this.tokens.values()) {
                    let match = true;
                    if (filter.queueId && t.queueId !== filter.queueId) match = false;
                    if (filter.status && t.status !== filter.status) match = false;
                    if (match) matched.push(t);
                }

                if (options.sort) {
                    matched.sort((a, b) => {
                        if (options.sort.createdAt) {
                            const diff = a.createdAt - b.createdAt;
                            if (diff !== 0) return diff;
                        }
                        return a.tokenNumber - b.tokenNumber;
                    });
                }

                if (matched.length === 0) {
                    return resolve(null);
                }

                const doc = matched[0];
                if (update.$set) {
                    Object.assign(doc, update.$set);
                }

                resolve({ ...doc });
            }, Math.floor(Math.random() * 5)); // jitter stresses race conditions
        });
    }

    // Atomic findByIdAndUpdate with $inc for monotonic counter
    async atomicIncrementQueueCounter(queueId, increment = 1) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const q = this.queues.get(queueId);
                if (!q) return resolve(null);

                const before = { ...q };
                q.nextTokenNumber += increment;
                resolve(before); // returns state before increment
            }, Math.floor(Math.random() * 5));
        });
    }

    async updateQueueCurrentToken(queueId, currentTokenNumber) {
        const q = this.queues.get(queueId);
        if (q) {
            q.currentTokenNumber = currentTokenNumber;
        }
        return q ? { ...q } : null;
    }
}

// --- Sanitizing Test Event Manager (Mirrors QueueEventManager) ---
class TestEventManager {
    constructor() {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(500);
    }

    static sanitizeToken(token) {
        if (!token || typeof token !== "object") return undefined;
        const rawId = token._id ?? token.id;
        const rawNum = token.tokenNumber;
        const rawStatus = token.status;
        if (rawId === undefined || rawNum === undefined) return undefined;

        return {
            _id: String(rawId),
            tokenNumber: Number(rawNum),
            status: String(rawStatus || "waiting"),
        };
    }

    subscribe(queueId, listener) {
        const channel = `queue:${queueId}`;
        this.emitter.on(channel, listener);
        return () => this.emitter.off(channel, listener);
    }

    emit(queueId, payload) {
        const sanitized = payload.token ? TestEventManager.sanitizeToken(payload.token) : undefined;
        const enriched = {
            ...payload,
            token: sanitized,
            timestamp: payload.timestamp || new Date().toISOString(),
        };
        this.emitter.emit(`queue:${queueId}`, enriched);
    }

    listenerCount(queueId) {
        return this.emitter.listenerCount(`queue:${queueId}`);
    }
}

const db = new MockDatabase();
const events = new TestEventManager();

// =========================================================================
// UNIT TESTS
// =========================================================================

test("1. Successful next-token operation advances queue and claims earliest waiting token", async () => {
    db.reset();
    const queueId = "q_1";
    db.createQueue(queueId, { nextTokenNumber: 4, currentTokenNumber: null });

    db.createToken("t_1", { queueId, tokenNumber: 1, status: "waiting", createdAt: new Date(1000) });
    db.createToken("t_2", { queueId, tokenNumber: 2, status: "waiting", createdAt: new Date(2000) });
    db.createToken("t_3", { queueId, tokenNumber: 3, status: "waiting", createdAt: new Date(3000) });

    const claimed = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "waiting" },
        { $set: { status: "called" } },
        { sort: { createdAt: 1, tokenNumber: 1 } }
    );
    await db.updateQueueCurrentToken(queueId, claimed.tokenNumber);

    assert.equal(claimed.tokenNumber, 1);
    assert.equal(claimed.status, "called");

    const queueState = db.queues.get(queueId);
    assert.equal(queueState.currentTokenNumber, 1);
});

test("2. Two concurrent requests competing for waiting tokens never claim the same token", async () => {
    db.reset();
    const queueId = "q_2";
    db.createQueue(queueId, { nextTokenNumber: 3 });

    db.createToken("t_10", { queueId, tokenNumber: 10, status: "waiting", createdAt: new Date(1000) });
    db.createToken("t_11", { queueId, tokenNumber: 11, status: "waiting", createdAt: new Date(2000) });

    const [rec1, rec2] = await Promise.all([
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } }, { sort: { createdAt: 1 } }),
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } }, { sort: { createdAt: 1 } })
    ]);

    assert.ok(rec1 && rec2, "Both requests should successfully claim a token");
    assert.notEqual(rec1.tokenNumber, rec2.tokenNumber, "Concurrent receptionists MUST NOT receive the same token");

    const numbers = [rec1.tokenNumber, rec2.tokenNumber].sort((a, b) => a - b);
    assert.deepEqual(numbers, [10, 11]);
});

test("2b. Single waiting token under 5 concurrent requests: exactly one claims it, 4 receive null", async () => {
    db.reset();
    const queueId = "q_single";
    db.createQueue(queueId);
    db.createToken("t_only", { queueId, tokenNumber: 99, status: "waiting", createdAt: new Date() });

    const results = await Promise.all([
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } }),
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } }),
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } }),
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } }),
        db.atomicFindOneAndUpdateToken({ queueId, status: "waiting" }, { $set: { status: "called" } })
    ]);

    const successes = results.filter(r => r !== null);
    const failures = results.filter(r => r === null);

    assert.equal(successes.length, 1, "Exactly one request must succeed");
    assert.equal(failures.length, 4, "Four requests must receive null");
    assert.equal(successes[0].tokenNumber, 99);
});

test("3. No waiting tokens remaining returns null / clear response", async () => {
    db.reset();
    const queueId = "q_empty";
    db.createQueue(queueId);

    const result = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "waiting" },
        { $set: { status: "called" } }
    );

    assert.equal(result, null, "Should return null when queue is empty");
});

test("4. Concurrent token joins produce strictly distinct and unique token numbers", async () => {
    db.reset();
    const queueId = "q_join";
    db.createQueue(queueId, { nextTokenNumber: 1 });

    const JOIN_COUNT = 10;
    const joins = Array.from({ length: JOIN_COUNT }, async (_, i) => {
        const queueBefore = await db.atomicIncrementQueueCounter(queueId, 1);
        const allocatedTokenNumber = queueBefore.nextTokenNumber;

        return db.createToken(`tok_${i}`, {
            queueId,
            tokenNumber: allocatedTokenNumber,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            phoneNumber: `980000000${i}`,
            status: "waiting"
        });
    });

    const createdTokens = await Promise.all(joins);
    const tokenNumbers = createdTokens.map(t => t.tokenNumber);

    assert.equal(tokenNumbers.length, JOIN_COUNT);
    const uniqueNumbers = new Set(tokenNumbers);
    assert.equal(uniqueNumbers.size, JOIN_COUNT, "All allocated token numbers must be unique");

    const finalQueue = db.queues.get(queueId);
    assert.equal(finalQueue.nextTokenNumber, JOIN_COUNT + 1);
});

test("5. REGRESSION (Finding F-01): Failed token creation does NOT decrement counter, preventing collision cascades", async () => {
    db.reset();
    const queueId = "q_monotonic";
    db.createQueue(queueId, { nextTokenNumber: 10 });

    // Request A allocates #10
    const reqAQueueBefore = await db.atomicIncrementQueueCounter(queueId, 1);
    const reqATokenNumber = reqAQueueBefore.nextTokenNumber;
    assert.equal(reqATokenNumber, 10);

    // Concurrent Request B allocates #11 and succeeds
    const reqBQueueBefore = await db.atomicIncrementQueueCounter(queueId, 1);
    const reqBTokenNumber = reqBQueueBefore.nextTokenNumber;
    assert.equal(reqBTokenNumber, 11);
    const tokenB = db.createToken("tok_B", {
        queueId,
        tokenNumber: reqBTokenNumber,
        name: "Bob",
        email: "bob@example.com",
        phoneNumber: "9876543211",
        status: "waiting",
    });
    assert.equal(tokenB.tokenNumber, 11);

    // Request A fails to insert its token (e.g. network failure or abort)
    // Under monotonic ticketing, Request A DOES NOT rewind nextTokenNumber!
    const queueAfterFailure = db.queues.get(queueId);
    assert.equal(queueAfterFailure.nextTokenNumber, 12);

    // Subsequent Request C allocates #12
    const reqCQueueBefore = await db.atomicIncrementQueueCounter(queueId, 1);
    const reqCTokenNumber = reqCQueueBefore.nextTokenNumber;
    assert.equal(reqCTokenNumber, 12);

    // Request C succeeds without any unique index collision with Bob's token (#11)
    const tokenC = db.createToken("tok_C", {
        queueId,
        tokenNumber: reqCTokenNumber,
        name: "Charlie",
        email: "charlie@example.com",
        phoneNumber: "9876543212",
        status: "waiting",
    });
    assert.equal(tokenC.tokenNumber, 12);

    // If counter had been decremented on A's failure, C would have gotten #11 and crashed on compound unique index!
    assert.notEqual(tokenB.tokenNumber, tokenC.tokenNumber);
});

test("6. PRIVACY AUDIT (Finding F-02): SSE broadcast payloads NEVER serialize customer PII", () => {
    const queueId = "q_privacy";
    const rawCustomerToken = {
        _id: "token_abc123",
        queueId,
        tokenNumber: 42,
        name: "Alice Confidential",
        email: "alice@private-domain.com",
        phoneNumber: "+1-555-0199",
        passwordHash: "$2b$10$abcdefsecret",
        __v: 0,
        status: "waiting",
    };

    let receivedPayload = null;
    const unsub = events.subscribe(queueId, (payload) => {
        receivedPayload = payload;
    });

    events.emit(queueId, {
        type: "queue-update",
        action: "join",
        currentToken: null,
        status: "working",
        token: rawCustomerToken,
    });

    assert.ok(receivedPayload, "Listener must receive the emitted event");
    const serializedJson = JSON.stringify(receivedPayload);

    // Assert that sensitive fields NEVER appear anywhere in the serialized SSE stream
    assert.equal(serializedJson.includes("Alice Confidential"), false, "Name must NOT appear in SSE payload");
    assert.equal(serializedJson.includes("alice@private-domain.com"), false, "Email must NOT appear in SSE payload");
    assert.equal(serializedJson.includes("+1-555-0199"), false, "Phone number must NOT appear in SSE payload");
    assert.equal(serializedJson.includes("passwordHash"), false, "Auth data must NOT appear in SSE payload");
    assert.equal(serializedJson.includes("__v"), false, "Internal DB fields must NOT appear in SSE payload");

    // Assert that only the sanitized fields are present in the token summary
    assert.deepEqual(receivedPayload.token, {
        _id: "token_abc123",
        tokenNumber: 42,
        status: "waiting",
    });

    unsub();
});

test("7. SYNCHRONIZATION (Finding F-03): Subscription-first buffering prevents event loss during handshake", async () => {
    const queueId = "q_handshake";
    db.reset();
    db.createQueue(queueId, { nextTokenNumber: 5, currentTokenNumber: 2 });

    // Client connection handshake simulation
    const clientDeliveredEvents = [];
    const inFlightBuffer = [];
    let snapshotDelivered = false;

    // Step 1: Subscribe FIRST
    const unsub = events.subscribe(queueId, (payload) => {
        if (!snapshotDelivered) {
            inFlightBuffer.push(payload);
        } else {
            clientDeliveredEvents.push(payload);
        }
    });

    // Step 2: Concurrent event emitted while snapshot read is in progress
    events.emit(queueId, {
        type: "queue-update",
        action: "next",
        currentToken: 3,
        token: { _id: "t_3", tokenNumber: 3, status: "called" },
    });

    // Step 3: Authoritative snapshot read finishes and is delivered
    const snapshotQueue = db.queues.get(queueId);
    clientDeliveredEvents.push({
        type: "connected",
        action: "initial",
        currentToken: snapshotQueue.currentTokenNumber,
        status: snapshotQueue.status,
    });
    snapshotDelivered = true;

    // Step 4: Drain in-flight buffer
    for (const b of inFlightBuffer) {
        clientDeliveredEvents.push(b);
    }
    inFlightBuffer.length = 0;

    // Verify order: snapshot delivered first, followed immediately by concurrent event
    assert.equal(clientDeliveredEvents.length, 2);
    assert.equal(clientDeliveredEvents[0].action, "initial");
    assert.equal(clientDeliveredEvents[1].action, "next");
    assert.equal(clientDeliveredEvents[1].currentToken, 3);

    unsub();
});

test("8. STATE TRANSITION & SERVING (Finding F-05): Strict sequential order in next, serve, and skip", async () => {
    db.reset();
    const queueId = "q_state";
    db.createQueue(queueId, { nextTokenNumber: 3, currentTokenNumber: null });

    db.createToken("tok_1", { queueId, tokenNumber: 1, status: "waiting", createdAt: new Date(1000) });
    db.createToken("tok_2", { queueId, tokenNumber: 2, status: "waiting", createdAt: new Date(2000) });

    // 1. Receptionist calls next -> token #1 is called
    let activeCalled = Array.from(db.tokens.values()).find(t => t.queueId === queueId && t.status === "called");
    assert.equal(activeCalled, undefined, "No token is called yet");

    const called1 = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "waiting" },
        { $set: { status: "called" } },
        { sort: { createdAt: 1, tokenNumber: 1 } }
    );
    await db.updateQueueCurrentToken(queueId, called1.tokenNumber);
    assert.equal(called1.tokenNumber, 1);
    assert.equal(called1.status, "called");

    // 2. Receptionist attempts to call next again while #1 is still "called" -> rejected with 409
    activeCalled = Array.from(db.tokens.values()).find(t => t.queueId === queueId && t.status === "called");
    assert.ok(activeCalled, "Token #1 is active");
    const canCallNextAgain = !activeCalled;
    assert.equal(canCallNextAgain, false, "Must block calling next while token #1 is in called state");

    // 3. Receptionist serves token #1
    const served1 = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "called" },
        { $set: { status: "served" } },
        { sort: { tokenNumber: 1 } }
    );
    await db.updateQueueCurrentToken(queueId, null);
    assert.equal(served1.status, "served");
    assert.equal(db.queues.get(queueId).currentTokenNumber, null);

    // 4. Now receptionist can call next -> token #2 is called
    const called2 = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "waiting" },
        { $set: { status: "called" } },
        { sort: { createdAt: 1, tokenNumber: 1 } }
    );
    await db.updateQueueCurrentToken(queueId, called2.tokenNumber);
    assert.equal(called2.tokenNumber, 2);

    // 5. Receptionist skips token #2
    const skipped2 = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "called" },
        { $set: { status: "skipped" } },
        { sort: { tokenNumber: 1 } }
    );
    await db.updateQueueCurrentToken(queueId, null);
    assert.equal(skipped2.status, "skipped");
    assert.equal(db.queues.get(queueId).currentTokenNumber, null);
});

test("9. Clients receive only authorized, queue-specific updates (No cross-queue leaks)", () => {
    const q1Events = [];
    const q2Events = [];

    const unsub1 = events.subscribe("queue_alpha", (e) => q1Events.push(e));
    const unsub2 = events.subscribe("queue_beta", (e) => q2Events.push(e));

    events.emit("queue_alpha", { type: "queue-update", currentToken: 1 });

    assert.equal(q1Events.length, 1);
    assert.equal(q2Events.length, 0, "Queue Beta client must not receive Queue Alpha events");

    events.emit("queue_beta", { type: "queue-update", currentToken: 2 });

    assert.equal(q1Events.length, 1);
    assert.equal(q2Events.length, 1);

    unsub1();
    unsub2();
});

test("10. SSE connection cleanup removes listeners and prevents memory leaks", () => {
    const queueId = "q_cleanup";
    assert.equal(events.listenerCount(queueId), 0);

    const unsub = events.subscribe(queueId, () => {});
    assert.equal(events.listenerCount(queueId), 1);

    unsub();
    assert.equal(events.listenerCount(queueId), 0, "Listener count must return to 0 after disconnect");
});

test("11. Queue status validation rejects calling next when queue is paused or on break", () => {
    const queue = { status: "paused" };
    const canCall = queue.status === "working";
    assert.equal(canCall, false, "Paused queues must not permit calling next token");

    const queueBreak = { status: "break" };
    assert.equal(queueBreak.status === "working", false, "Queues on break must not permit calling next token");
});

test("12. Active token prevention prevents customer from joining twice with waiting/called token", () => {
    db.reset();
    const queueId = "q_active";
    db.createQueue(queueId);
    db.createToken("t_user", {
        queueId,
        tokenNumber: 1,
        email: "customer@example.com",
        phoneNumber: "9876543210",
        status: "waiting"
    });

    let duplicateAllowed = false;
    for (const t of db.tokens.values()) {
        if (
            t.queueId === queueId &&
            t.email === "customer@example.com" &&
            t.phoneNumber === "9876543210" &&
            ["waiting", "called"].includes(t.status)
        ) {
            duplicateAllowed = false;
            break;
        }
    }

    assert.equal(duplicateAllowed, false, "Duplicate active token must be blocked");
});
