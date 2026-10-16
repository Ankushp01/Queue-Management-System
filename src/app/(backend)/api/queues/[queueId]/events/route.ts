import mongoose from "mongoose";
import { connectdb } from "@/lib/connectdb";
import queueModel from "@/models/queue.model";
import { queueEvents, QueueEventPayload } from "@/lib/queueEvents";

export async function GET(
    req: Request,
    {
        params,
    }: {
        params: Promise<{
            queueId: string;
        }>;
    }
) {
    await connectdb();

    const { queueId } = await params;

    if (!mongoose.Types.ObjectId.isValid(queueId)) {
        return Response.json(
            {
                success: false,
                message: "Invalid queue id",
            },
            { status: 400 }
        );
    }

    const foundQueue = await queueModel.findById(queueId);

    if (!foundQueue) {
        return Response.json(
            {
                success: false,
                message: "Queue not found/event",
            },
            {
                status: 404,
            }
        );
    }

    // Attempt to initialize shared MongoDB ChangeStream singleton if supported by MongoDB cluster
    queueEvents.initSharedChangeStream();

    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let unsubscribe: (() => void) | null = null;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            console.log(`[SSE] Client connected to queue: ${queueId}`);

            // SYNCHRONIZATION GUARANTEE (Finding F-03 fix):
            // 1. Subscribe FIRST so no concurrent events emitted during connection setup are dropped.
            // 2. Buffer any incoming events while reading the authoritative database snapshot.
            // 3. Emit the snapshot, then drain the buffer in exact arrival order.
            const inFlightBuffer: QueueEventPayload[] = [];
            let snapshotDelivered = false;

            unsubscribe = queueEvents.subscribe(queueId, (payload) => {
                if (!snapshotDelivered) {
                    inFlightBuffer.push(payload);
                } else {
                    try {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                        );
                    } catch {
                        // Controller closed
                    }
                }
            });

            try {
                // Fetch fresh authoritative state after subscription is in place
                const currentDoc = await queueModel.findById(queueId).lean();
                if (!currentDoc) {
                    controller.close();
                    return;
                }

                // Send authoritative current queue state
                const initialPayload: QueueEventPayload = {
                    type: "connected",
                    action: "initial",
                    currentToken: currentDoc.currentTokenNumber,
                    status: currentDoc.status,
                    timestamp: new Date().toISOString(),
                };
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`)
                );
                snapshotDelivered = true;

                // Drain any events that arrived during the snapshot read
                for (const bufferedPayload of inFlightBuffer) {
                    try {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(bufferedPayload)}\n\n`)
                        );
                    } catch {
                        break;
                    }
                }
                inFlightBuffer.length = 0;
            } catch (err: unknown) {
                console.error("[SSE] Failed to load initial snapshot:", err);
                controller.error(err);
                return;
            }

            // Keep-alive heartbeat every 15 seconds to prevent reverse proxy timeouts
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch {
                    // Controller already closed
                }
            }, 15000);
        },

        cancel() {
            console.log(`[SSE] Client disconnected from queue: ${queueId}`);

            if (heartbeat) {
                clearInterval(heartbeat);
                heartbeat = null;
            }

            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}