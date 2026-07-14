import { connectdb } from "@/lib/connectdb";
import queueModel from "@/models/queue.model";

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

    const foundQueue =
        await queueModel.findById(queueId);

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

    let changeStream: ReturnType<
        typeof queueModel.watch
    > | null = null;

    // let heartbeat:
    //     | ReturnType<typeof setInterval>
    //     | null = null;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            console.log("SSE Connected");

            const pipeline = [
                {
                    $match: {
                        "fullDocument._id":
                            foundQueue._id,
                    },
                },
            ];

            changeStream = queueModel.watch(
                pipeline,
                {
                    fullDocument: "updateLookup",
                }
            );

            changeStream.on(
                "change",
                (change) => {
                    const queue =
                        change.fullDocument;

                    if (!queue) return;

                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                type: "queue-update",
                                currentToken:
                                    queue.currentTokenNumber,
                                status: queue.status,
                            })}\n\n`
                        )
                    );
                }
            );

            // heartbeat = setInterval(() => {
            //     controller.enqueue(
            //         encoder.encode(
            //             `: heartbeat\n\n`
            //         )
            //     );
            // }, 15000);
        },

        async cancel() {
            console.log("SSE Disconnected");

            if (heartbeat) {
                clearInterval(heartbeat);
            }

            if (changeStream) {
                await changeStream.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type":
                "text/event-stream",
            "Cache-Control":
                "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}