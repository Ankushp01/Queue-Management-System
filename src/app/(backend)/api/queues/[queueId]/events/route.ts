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
        start(controller) {
            console.log(`[SSE] Client connected to queue: ${queueId}`);

            // 1. Immediately send authoritative current queue state upon connection/reconnection
            const initialPayload: QueueEventPayload = {
                type: "connected",
                action: "initial",
                currentToken: foundQueue.currentTokenNumber,
                status: foundQueue.status,
            };
            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`)
            );

            // 2. Subscribe to shared in-process event bus for this specific queue
            unsubscribe = queueEvents.subscribe(queueId, (payload) => {
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
                    );
                } catch {
                    // Controller already closed
                }
            });

            // 3. Keep-alive heartbeat every 15 seconds to prevent reverse proxy timeouts
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