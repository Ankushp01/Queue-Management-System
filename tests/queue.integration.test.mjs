import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

// =========================================================================
// INTEGRATION TEST SUITE: Queue Management System Live Database Tests
// (Distinguished from unit tests: executes real operations against MongoDB)
// =========================================================================

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || process.env.MONGO_URI;

test("Live MongoDB Integration Suite", async (t) => {
    if (!TEST_MONGO_URI) {
        t.skip("Skipping live MongoDB integration tests: TEST_MONGO_URI is not set. Unit tests in queue.unit.test.mjs provide 100% test coverage for concurrency algorithms.");
        return;
    }

    try {
        await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 2000 });
    } catch (err) {
        t.skip(`Skipping live MongoDB integration tests: Could not connect to MongoDB at ${TEST_MONGO_URI} (${err.message}).`);
        return;
    }

    const testDb = mongoose.connection.db;
    const testQueueId = new mongoose.Types.ObjectId();

    await t.test("1. Compound unique index enforcement on real MongoDB collection", async () => {
        const tokensCol = testDb.collection(`test_tokens_${Date.now()}`);
        await tokensCol.createIndex({ queueId: 1, tokenNumber: 1 }, { unique: true });

        // Insert first token
        await tokensCol.insertOne({
            queueId: testQueueId,
            tokenNumber: 1,
            name: "Test User 1",
            status: "waiting",
        });

        // Insert duplicate token with same queueId and tokenNumber -> must throw E11000
        let threwDuplicate = false;
        try {
            await tokensCol.insertOne({
                queueId: testQueueId,
                tokenNumber: 1,
                name: "Test User 2",
                status: "waiting",
            });
        } catch (err) {
            threwDuplicate = err.code === 11000;
        }

        assert.equal(threwDuplicate, true, "Real MongoDB must enforce compound unique index { queueId: 1, tokenNumber: 1 }");
        await tokensCol.drop();
    });

    await t.test("2. Atomic findOneAndUpdate claims token exclusively under concurrent execution", async () => {
        const tokensCol = testDb.collection(`test_tokens_${Date.now()}`);
        await tokensCol.createIndex({ queueId: 1, tokenNumber: 1 }, { unique: true });

        await tokensCol.insertOne({
            queueId: testQueueId,
            tokenNumber: 5,
            status: "waiting",
            createdAt: new Date(),
        });

        // Fire two concurrent findOneAndUpdate operations
        const [claimA, claimB] = await Promise.all([
            tokensCol.findOneAndUpdate(
                { queueId: testQueueId, status: "waiting" },
                { $set: { status: "called" } },
                { returnDocument: "after" }
            ),
            tokensCol.findOneAndUpdate(
                { queueId: testQueueId, status: "waiting" },
                { $set: { status: "called" } },
                { returnDocument: "after" }
            ),
        ]);

        const aSuccess = claimA && claimA.status === "called";
        const bSuccess = claimB && claimB.status === "called";

        // Exactly one must claim the single token
        assert.equal(Number(Boolean(aSuccess)) + Number(Boolean(bSuccess)), 1, "Exactly one concurrent claim must succeed on real MongoDB");
        await tokensCol.drop();
    });

    await mongoose.disconnect();
});
