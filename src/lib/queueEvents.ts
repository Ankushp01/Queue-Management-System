import { EventEmitter } from "events";
import mongoose from "mongoose";
import queueModel from "@/models/queue.model";

export interface QueueEventPayload {
    type: "queue-update" | "connected";
    action?: "next" | "serve" | "skip" | "join" | "status" | "cancel" | "initial";
    currentToken?: number | null;
    status?: string;
    token?: any;
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
     */
    public emitQueueUpdate(queueId: string, payload: QueueEventPayload): void {
        const channel = `queue:${queueId}`;
        const enrichedPayload: QueueEventPayload = {
            ...payload,
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
                } catch (err: any) {
                    console.error("Error processing shared change stream event:", err.message);
                }
            });

            changeStream.on("error", (err: any) => {
                console.warn(
                    "MongoDB ChangeStream warning (replica set oplog may be unavailable):",
                    err.message
                );
            });

            this.changeStreamInitialized = true;
            globalRef.__sharedChangeStreamInit = true;
        } catch (err: any) {
            console.warn(
                "MongoDB ChangeStream initialization skipped (requires replica set). Operating with in-process event bus:",
                err.message
            );
        }
    }
}

export const queueEvents = new QueueEventManager();
