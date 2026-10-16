/**
 * Diagnostic Script: Audit Duplicate Tokens
 *
 * Scans the MongoDB `tokens` collection to detect any duplicate `(queueId, tokenNumber)`
 * pairs that may have been created prior to the introduction of the compound unique index.
 *
 * SAFETY GUARANTEES:
 * - Read-only operation: performs aggregations and index inspection without modifying records.
 * - Privacy protection: never logs customer PII (names, phone numbers, emails) or connection secrets.
 * - Safe exit: exits with status 0 on clean/success or 1 on detected duplicate conflicts.
 *
 * Usage:
 *   node scripts/audit-duplicates.mjs
 */

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function auditDuplicates() {
    if (!MONGO_URI) {
        console.error("[AUDIT] ERROR: Neither MONGO_URI nor MONGODB_URI environment variable is defined.");
        console.error("[AUDIT] Please provide connection string via environment variable, e.g.:");
        console.error("        MONGO_URI=\"mongodb://localhost:27017/queue_db\" node scripts/audit-duplicates.mjs");
        process.exit(1);
    }

    try {
        console.log("[AUDIT] Connecting to MongoDB database...");
        await mongoose.connect(MONGO_URI);
        console.log("[AUDIT] Connected successfully. Inspecting database schema and indexes...");

        const db = mongoose.connection.db;
        const tokensCollection = db.collection("tokens");

        // 1. Inspect existing indexes on 'tokens' collection
        const indexes = await tokensCollection.indexes();
        console.log(`[AUDIT] Found ${indexes.length} existing indexes on 'tokens' collection:`);
        let hasCompoundUniqueIndex = false;

        for (const idx of indexes) {
            const isCompound = idx.key && idx.key.queueId === 1 && idx.key.tokenNumber === 1;
            const isUnique = Boolean(idx.unique);
            console.log(`  - Index: "${idx.name}", key: ${JSON.stringify(idx.key)}, unique: ${isUnique}`);
            if (isCompound && isUnique) {
                hasCompoundUniqueIndex = true;
            }
        }

        if (hasCompoundUniqueIndex) {
            console.log("[AUDIT] ✔ Compound unique index { queueId: 1, tokenNumber: 1 } is ACTIVE.");
        } else {
            console.warn("[AUDIT] ⚠ Compound unique index { queueId: 1, tokenNumber: 1 } is NOT yet created or is non-unique.");
        }

        // 2. Aggregate to find any duplicate (queueId, tokenNumber) groupings
        console.log("[AUDIT] Scanning 'tokens' collection for duplicate (queueId, tokenNumber) records...");
        const duplicates = await tokensCollection.aggregate([
            {
                $group: {
                    _id: { queueId: "$queueId", tokenNumber: "$tokenNumber" },
                    count: { $sum: 1 },
                    tokenIds: { $push: "$_id" },
                },
            },
            {
                $match: {
                    count: { $gt: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]).toArray();

        const totalTokens = await tokensCollection.countDocuments();
        console.log(`[AUDIT] Total token documents in database: ${totalTokens}`);

        if (duplicates.length === 0) {
            console.log("[AUDIT] ✔ CLEAN: Zero duplicate (queueId, tokenNumber) pairs detected.");
            console.log("[AUDIT] The database is fully consistent with the compound unique index requirement.");
            await mongoose.disconnect();
            process.exit(0);
        } else {
            console.error(`[AUDIT] ✖ CONFLICT DETECTED: Found ${duplicates.length} duplicate token groups!`);
            let totalDuplicateRows = 0;

            duplicates.forEach((group, index) => {
                const dupCount = group.count;
                totalDuplicateRows += (dupCount - 1);
                console.log(`  [${index + 1}] Queue: ${group._id.queueId}, Token #: ${group._id.tokenNumber} (Occurrences: ${dupCount}, IDs: ${group.tokenIds.join(", ")})`);
            });

            console.error(`[AUDIT] Total redundant documents that must be resolved prior to index creation: ${totalDuplicateRows}`);
            console.log("[AUDIT] To resolve, deduplicate older rows retaining the latest document per (queueId, tokenNumber).");
            await mongoose.disconnect();
            process.exit(1);
        }
    } catch (err) {
        console.error("[AUDIT] Execution error during duplicate audit:", err instanceof Error ? err.message : String(err));
        try {
            await mongoose.disconnect();
        } catch {}
        process.exit(1);
    }
}

auditDuplicates();
