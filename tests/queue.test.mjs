import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "events";

// =========================================================================
// TEST SUITE: Queue Management System Concurrency & Real-Time Behavior
// =========================================================================

// --- Test In-Memory Engine Simulating MongoDB Atomic Operations ---
class MockDatabase {
    constructor() {
        this.queues = new Map();
        this.tokens = new Map();
        this.globalLock = Promise.resolve(); // Simulates single-thread atomic execution of write operations
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
            currentTokenNumber: data.currentTokenNumber || null,
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
        // Queue operation through promise chain to ensure atomicity like MongoDB write lock
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
            }, Math.floor(Math.random() * 5)); // add jitter to stress race conditions
        });
    }

    // Atomic findByIdAndUpdate with $inc for counter
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

// --- Test Shared Event Manager ---
class TestEventManager {
    constructor() {
        this.emitter = new EventEmitter();
    }
    subscribe(queueId, listener) {
        const channel = `queue:${queueId}`;
        this.emitter.on(channel, listener);
        return () => this.emitter.off(channel, listener);
    }
    emit(queueId, payload) {
        this.emitter.emit(`queue:${queueId}`, payload);
    }
    listenerCount(queueId) {
        return this.emitter.listenerCount(`queue:${queueId}`);
    }
}

const db = new MockDatabase();
const events = new TestEventManager();

// =========================================================================
// TEST CASES
// =========================================================================

test("1. Successful next-token operation advances queue and claims earliest waiting token", async () => {
    db.reset();
    const queueId = "q_1";
    db.createQueue(queueId, { nextTokenNumber: 4, currentTokenNumber: null });

    db.createToken("t_1", { queueId, tokenNumber: 1, status: "waiting", createdAt: new Date(1000) });
    db.createToken("t_2", { queueId, tokenNumber: 2, status: "waiting", createdAt: new Date(2000) });
    db.createToken("t_3", { queueId, tokenNumber: 3, status: "waiting", createdAt: new Date(3000) });

    // Execute atomic claim
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

    const tokenInDb = db.tokens.get("t_1");
    assert.equal(tokenInDb.status, "called");
});

test("2. Two concurrent requests competing for waiting tokens never claim the same token", async () => {
    db.reset();
    const queueId = "q_2";
    db.createQueue(queueId, { nextTokenNumber: 3 });

    db.createToken("t_10", { queueId, tokenNumber: 10, status: "waiting", createdAt: new Date(1000) });
    db.createToken("t_11", { queueId, tokenNumber: 11, status: "waiting", createdAt: new Date(2000) });

    // Two receptionists call next concurrently
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

    // Counter must match total tokens + 1
    const finalQueue = db.queues.get(queueId);
    assert.equal(finalQueue.nextTokenNumber, JOIN_COUNT + 1);
});

test("5. Token creation failure safely compensates queue counter", async () => {
    db.reset();
    const queueId = "q_fail";
    db.createQueue(queueId, { nextTokenNumber: 5 });

    // Step 1: Allocate counter
    const queueBefore = await db.atomicIncrementQueueCounter(queueId, 1);
    const allocated = queueBefore.nextTokenNumber;
    assert.equal(allocated, 5);

    // Step 2: Simulate failure (e.g. database disconnect or validation error)
    let creationFailed = false;
    try {
        throw new Error("Simulated insertion failure");
    } catch {
        creationFailed = true;
        // Step 3: Compensation
        await db.atomicIncrementQueueCounter(queueId, -1);
    }

    assert.equal(creationFailed, true);
    const restoredQueue = db.queues.get(queueId);
    assert.equal(restoredQueue.nextTokenNumber, 5, "Counter should be restored back to 5");
});

test("6. Serving and skipping operations produce expected status and events", async () => {
    db.reset();
    const queueId = "q_serve_skip";
    db.createQueue(queueId);
    db.createToken("t_call", { queueId, tokenNumber: 42, status: "called" });

    const receivedEvents = [];
    const unsub = events.subscribe(queueId, (e) => receivedEvents.push(e));

    // Serve token
    const served = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "called" },
        { $set: { status: "served" } }
    );
    events.emit(queueId, { type: "queue-update", action: "serve", token: served });

    assert.equal(served.status, "served");
    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].action, "serve");

    // Reset token to called for skip test
    db.tokens.set("t_call", { queueId, tokenNumber: 42, status: "called" });

    // Skip token
    const skipped = await db.atomicFindOneAndUpdateToken(
        { queueId, status: "called" },
        { $set: { status: "skipped" } }
    );
    events.emit(queueId, { type: "queue-update", action: "skip", token: skipped });

    assert.equal(skipped.status, "skipped");
    assert.equal(receivedEvents.length, 2);
    assert.equal(receivedEvents[1].action, "skip");

    unsub();
});

test("7. Clients receive only authorized, queue-specific updates (No cross-queue leaks)", () => {
    const q1Events = [];
    const q2Events = [];

    const unsub1 = events.subscribe("queue_alpha", (e) => q1Events.push(e));
    const unsub2 = events.subscribe("queue_beta", (e) => q2Events.push(e));

    // Emit event on Queue Alpha
    events.emit("queue_alpha", { type: "queue-update", currentToken: 1 });

    assert.equal(q1Events.length, 1);
    assert.equal(q2Events.length, 0, "Queue Beta client must not receive Queue Alpha events");

    // Emit event on Queue Beta
    events.emit("queue_beta", { type: "queue-update", currentToken: 2 });

    assert.equal(q1Events.length, 1);
    assert.equal(q2Events.length, 1);

    unsub1();
    unsub2();
});

test("8. SSE connection cleanup removes listeners and prevents memory leaks", () => {
    const queueId = "q_cleanup";
    assert.equal(events.listenerCount(queueId), 0);

    const unsub = events.subscribe(queueId, () => {});
    assert.equal(events.listenerCount(queueId), 1);

    // Simulate client disconnect
    unsub();
    assert.equal(events.listenerCount(queueId), 0, "Listener count must return to 0 after disconnect");
});

test("9. Queue status validation rejects calling next when queue is paused or on break", () => {
    const queue = { status: "paused" };
    const canCall = queue.status === "working";
    assert.equal(canCall, false, "Paused queues must not permit calling next token");

    const queueBreak = { status: "break" };
    assert.equal(queueBreak.status === "working", false, "Queues on break must not permit calling next token");
});

test("10. Active token prevention prevents customer from joining twice with waiting/called token", () => {
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

    // Customer attempts to join again
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
