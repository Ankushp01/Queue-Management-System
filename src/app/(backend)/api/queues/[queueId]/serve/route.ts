import mongoose from "mongoose";
import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";
import { queueEvents } from "@/lib/queueEvents";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(backend)/api/auth/[...nextauth]/option";

async function handleServe(
    request: Request,
    { params }: { params: Promise<{ queueId: string }> }
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

    // Atomic update: transition called token to "served" with deterministic order
    const calledToken = await tokenModel.findOneAndUpdate(
        {
            queueId: foundQueue._id,
            status: "called",
        },
        {
            $set: { status: "served" },
        },
        {
            sort: { tokenNumber: 1 },
            new: true,
        }
    );

    if (!calledToken) {
        return Response.json(
            {
                success: false,
                message: "No called token found with given queueId",
            },
            { status: 200 }
        );
    }

    // Clear active token on queue once served
    foundQueue.currentTokenNumber = null;
    await foundQueue.save();

    // Broadcast sanitized serve event to SSE clients (PII excluded)
    queueEvents.emitQueueUpdate(queueId, {
        type: "queue-update",
        action: "serve",
        currentToken: null,
        status: foundQueue.status,
        token: {
            _id: calledToken._id.toString(),
            tokenNumber: calledToken.tokenNumber,
            status: calledToken.status,
        },
    });

    return Response.json(
        {
            success: true,
            data: calledToken,
            message: "Called token is served successfully",
        },
        { status: 200 }
    );
}

export { handleServe as DELETE, handleServe as POST };