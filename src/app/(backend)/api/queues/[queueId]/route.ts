import mongoose from "mongoose";
import queueModel from "@/models/queue.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/option";
import { connectdb } from "@/lib/connectdb";

export async function GET(req: Request, {
    params,
}: {
    params: Promise<{
        queueId: string;
    }>;
}) {
    await connectdb()
    const { queueId } = await params

    // const session = await getServerSession(authOptions)
    // if (!session) {
    //     return Response.json({
    //         success: false,
    //         message: "Login first then send request"
    //     })
    // }

    if (!mongoose.Types.ObjectId.isValid(queueId)) {
        return Response.json(
            {
                success: false,
                message: "Invalid queue id",
            },
            { status: 400 }
        );
    }

    const foundQueue = await queueModel.findById(queueId)

    if (!foundQueue) {
        return Response.json({
            success: false,
            message: "Queue not found/"
        })
    }

    // if (
    //     foundQueue.organizationId.toString() !==
    //     session.user.organizationId
    // )
    // if (!foundQueue.organizationId.equals(session.user.organizationId)) {
    //     return Response.json({
    //         success: false,
    //         message: "This queue does not belong to your organization"
    //     })
    // }

    return Response.json({
        success: true,
        data: foundQueue,
        message: "Queue is found"
    })
}

export async function DELETE({ params }: { params: { queueId: string } }) {
    await connectdb()
    const { queueId } = params

    if (!queueId) {
        return Response.json({
            success: false,
            message: "Queue Id is not received"
        })
    }

    const session = await getServerSession(authOptions)

    if (!session) {
        return Response.json({
            success: false,
            message: "Login first then send request"
        })
    }

    const foundqueue = await queueModel.findById(queueId)

    if (!foundqueue) {
        return Response.json({
            success: false,
            message: "Queue with the given queue Id is not found due to some error, retry"
        })
    }

    if (foundqueue.organizationId.toString() !== session.user.organizationId) {
        return Response.json({
            success: false,
            message: "This queue does not belong to your organization"
        })
    }

    const queue = await queueModel.findByIdAndDelete(foundqueue._id)

    if (!queue) {
        return Response.json({
            success: false,
            message: "Queue with given queue Id is not deleted due to some error, retry"
        })
    }

    return Response.json({
        success: true,
        data: queue,
        message: "Queue is deleted"
    })

}