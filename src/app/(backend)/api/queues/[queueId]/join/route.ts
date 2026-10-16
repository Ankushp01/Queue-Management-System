import mongoose from "mongoose";
import { connectdb } from "@/lib/connectdb";
import queueModel from "@/models/queue.model";
import tokenModel from "@/models/token.model";
import { queueEvents } from "@/lib/queueEvents";

export async function POST(
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
            {
                status: 400,
            }
        );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
        return Response.json(
            {
                success: false,
                message: "Request body is required",
            },
            { status: 400 }
        );
    }

    const { name, email, phoneNumber } = body;

    if (
        !name?.trim() ||
        !email?.trim() ||
        !phoneNumber?.trim()
    ) {
        return Response.json(
            {
                success: false,
                message: "Name, email and phone number are required",
            },
            {
                status: 400,
            }
        );
    }

    const queue = await queueModel.findById(queueId);

    if (!queue) {
        return Response.json(
            {
                success: false,
                message: "Queue not found",
            },
            {
                status: 404,
            }
        );
    }

    if (queue.status !== "working") {
        return Response.json(
            {
                success: false,
                message: "Queue is currently unavailable",
            },
            {
                status: 400,
            }
        );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber.trim();

    // Check if customer already has an active token in this queue
    const existingToken = await tokenModel.findOne({
        queueId,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        status: {
            $in: ["waiting", "called"],
        },
    });

    if (existingToken) {
        return Response.json(
            {
                success: true,
                data: existingToken,
                message: "You already have an active token in this queue",
            },
            {
                status: 200,
            }
        );
    }

    // ATOMIC TOKEN NUMBER ALLOCATION:
    // Uses findByIdAndUpdate with $inc to atomically increment nextTokenNumber.
    // Setting new: false returns the queue document BEFORE the increment,
    // ensuring this request has an exclusive, monotonic tokenNumber.
    const updatedQueue = await queueModel.findByIdAndUpdate(
        queueId,
        {
            $inc: { nextTokenNumber: 1 },
        },
        { new: false }
    );

    if (!updatedQueue) {
        return Response.json(
            {
                success: false,
                message: "Queue not found during token allocation",
            },
            { status: 404 }
        );
    }

    const tokenNumber = updatedQueue.nextTokenNumber;

    try {
        const token = await tokenModel.create({
            queueId,
            tokenNumber,
            name: name.trim(),
            email: normalizedEmail,
            phoneNumber: normalizedPhone,
            status: "waiting",
        });

        // Broadcast join update to real-time subscribers
        queueEvents.emitQueueUpdate(queueId, {
            type: "queue-update",
            action: "join",
            currentToken: updatedQueue.currentTokenNumber,
            status: updatedQueue.status,
            token,
        });

        return Response.json(
            {
                success: true,
                data: token,
                message: "Queue joined successfully",
            },
            {
                status: 201,
            }
        );
    } catch (createError: any) {
        // Compensate the allocated counter if token creation fails
        await queueModel.findByIdAndUpdate(queueId, {
            $inc: { nextTokenNumber: -1 },
        });

        if (createError.code === 11000) {
            return Response.json(
                {
                    success: false,
                    message: "Token number conflict detected. Please retry.",
                },
                { status: 409 }
            );
        }

        return Response.json(
            {
                success: false,
                message: createError.message || "Failed to create token",
            },
            { status: 500 }
        );
    }
}