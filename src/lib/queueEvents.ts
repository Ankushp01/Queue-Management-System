import { EventEmitter } from "events";
import mongoose from "mongoose";
import queueModel from "@/models/queue.model";

export interface SanitizedTokenSummary {
    _id: string;
    tokenNumber: number;
    status: string;
}

export interface QueueEventPayload {
    type: "queue-update" | "connected";
    action?: "next" | "serve" | "skip" | "join" | "status" | "cancel" | "initial";
    currentToken?: number | null;
    status?: string;
    token?: SanitizedTokenSummary;
    timestamp?: string;
}

type QueueListener = (payload: QueueEventPayload) => void;

class QueueEventManager {
    private emitter: EventEmitter;
    private changeStreamInitialized: boolean = false;

    constructor() {
        // Use globalThis to preserve EventEmitter across Next.js dev reloads
        const globalRef = globalThis as unknown as {
            __queueEventEmitter?: EventEmitter;
            __sharedChangeStreamInit?: boolean;
        };

        if (!globalRef.__queueEventEmitter) {
            globalRef.__queueEventEmitter = new EventEmitter();
            // Allow high subscriber counts for busy queues
            globalRef.__queueEventEmitter.setMaxListeners(500);
        }

        this.emitter = globalRef.__queueEventEmitter;
        this.changeStreamInitialized = Boolean(globalRef.__sharedChangeStreamInit);
    }

    /**
     * Defensively sanitize token objects to strictly exclude customer PII
     * (name, email, phoneNumber, internal mongoose metadata) from public SSE streams.
     */
    public static sanitizeToken(token: unknown): SanitizedTokenSummary | undefined {
        if (!token || typeof token !== "object") return undefined;
        const raw = token as Record<string, unknown>;
        const rawId = raw._id ?? raw.id;
        const rawNum = raw.tokenNumber;
        const rawStatus = raw.status;

        if (rawId === undefined || rawNum === undefined) return undefined;

        return {
            _id: String(rawId),
            tokenNumber: Number(rawNum),
            status: String(rawStatus || "waiting"),
        };
    }

    /**
     * Subscribe a client connection to updates for a specific queueId.
     * Returns an unsubscribe function for clean disconnection.
     */
    public subscribe(queueId: string, listener: QueueListener): () => void {
        const channel = `queue:${queueId}`;
        this.emitter.on(channel, listener);

        return () => {
            this.emitter.off(channel, listener);
        };
    }

    /**
     * Emit a real-time event to all clients subscribed to queueId.
     * Guarantees that any attached token payload is defensively sanitized.
     */
    public emitQueueUpdate(queueId: string, payload: QueueEventPayload): void {
        const channel = `queue:${queueId}`;
        const sanitizedToken = payload.token
            ? QueueEventManager.sanitizeToken(payload.token)
            : undefined;

        const enrichedPayload: QueueEventPayload = {
            ...payload,
            token: sanitizedToken,
            timestamp: payload.timestamp || new Date().toISOString(),
        };

        this.emitter.emit(channel, enrichedPayload);
    }

    /**
     * Initializes a single, shared MongoDB change stream for the entire application.
     * If MongoDB is not a replica set or change streams are unsupported, fails gracefully
     * and relies on the direct in-process emitter.
     */
    public initSharedChangeStream(): void {
        if (this.changeStreamInitialized) return;

        const globalRef = globalThis as unknown as {
            __sharedChangeStreamInit?: boolean;
        };

        try {
            if (mongoose.connection.readyState !== 1) {
                return;
            }

            const changeStream = queueModel.watch([], {
                fullDocument: "updateLookup",
            });

            changeStream.on("change", (change) => {
                try {
                    if ("fullDocument" in change && change.fullDocument) {
                        const doc = change.fullDocument;
                        const queueId = doc._id?.toString();
                        if (queueId) {
                            this.emitQueueUpdate(queueId, {
                                type: "queue-update",
                                currentToken: doc.currentTokenNumber,
                                status: doc.status,
                            });
                        }
                    }
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error("Error processing shared change stream event:", message);
                }
            });

            changeStream.on("error", (err: unknown) => {
                const message = err instanceof Error ? err.message : String(err);
                console.warn(
                    "MongoDB ChangeStream warning (replica set oplog may be unavailable):",
                    message
                );
            });

            this.changeStreamInitialized = true;
            globalRef.__sharedChangeStreamInit = true;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            console.warn(
                "MongoDB ChangeStream initialization skipped (requires replica set). Operating with in-process event bus:",
                message
            );
        }
    }
}

export const queueEvents = new QueueEventManager();
