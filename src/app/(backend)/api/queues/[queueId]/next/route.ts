import mongoose from "mongoose";
import queueModel from "@/models/queue.model";
import tokenModel from "@/models/token.model";
import { connectdb } from "@/lib/connectdb";
import { queueEvents } from "@/lib/queueEvents";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(backend)/api/auth/[...nextauth]/option";

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
            { status: 400 }
        );
    }

    const foundQueue = await queueModel.findById(queueId);

    if (!foundQueue) {
        return Response.json(
            {
                success: false,
                message: "Queue not found with given queueId",
            },
            { status: 404 }
        );
    }

    // Optional auth check: if authenticated as organization, verify queue ownership
    const session = await getServerSession(authOptions);
    if (
        session?.user?.organizationId &&
        foundQueue.organizationId &&
        session.user.organizationId.toString() !== foundQueue.organizationId.toString()
    ) {
        return Response.json(
            {
                success: false,
                message: "This queue does not belong to your organization",
            },
            { status: 403 }
        );
    }

    if (foundQueue.status !== "working") {
        return Response.json(
            {
                success: false,
                message: `Queue is currently ${foundQueue.status}. Please set status to working to call next token.`,
            },
            { status: 400 }
        );
    }

    // Strict state transition check (Finding F-05):
    // Prevent calling the next token if a token is currently being called.
    // The active token must first be served or skipped to prevent orphan called tokens.
    const activeCalledToken = await tokenModel.findOne({
        queueId: foundQueue._id,
        status: "called",
    });

    if (activeCalledToken) {
        return Response.json(
            {
                success: false,
                message: `Token #${activeCalledToken.tokenNumber} is currently called. Please serve or skip it before calling the next token.`,
            },
            { status: 409 }
        );
    }

    // ATOMIC CONCURRENCY-SAFE OPERATION:
    // Uses findOneAndUpdate with sort to atomically select the earliest waiting token
    // and transition its status from "waiting" to "called".
    // MongoDB's single-document write lock guarantees that two concurrent requests
    // can NEVER select or transition the same waiting token.
    const nextToken = await tokenModel.findOneAndUpdate(
        {
            queueId: foundQueue._id,
            status: "waiting",
        },
        {
            $set: { status: "called" },
        },
        {
            sort: { createdAt: 1, tokenNumber: 1 },
            new: true,
        }
    );

    if (!nextToken) {
        return Response.json(
            {
                success: false,
                message: "No next token found in given queueId",
            },
            { status: 200 }
        );
    }

    // Update queue's current token pointer
    foundQueue.currentTokenNumber = nextToken.tokenNumber;
    await foundQueue.save();

    // Broadcast sanitized update to real-time subscribers (SSE) - PII excluded
    queueEvents.emitQueueUpdate(queueId, {
        type: "queue-update",
        action: "next",
        currentToken: nextToken.tokenNumber,
        status: foundQueue.status,
        token: {
            _id: nextToken._id.toString(),
            tokenNumber: nextToken.tokenNumber,
            status: nextToken.status,
        },
    });

    return Response.json(
        {
            success: true,
            data: nextToken,
            message: "Next token is called successfully",
        },
        { status: 200 }
    );
}