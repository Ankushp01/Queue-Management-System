import mongoose from "mongoose";
import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";

export async function POST(req: Request, { params }: { params: { queueId: string } }) {
    await connectdb()
    // const { } = await req.json()

    const { queueId } = params

    const foundQueue = await queueModel.findById(queueId)

    if (!foundQueue) {
        return Response.json({
            success: false,
            message: "Queue not found with given queueId"
        })
    }

    const calledToken = await tokenModel.findOne({
        queueId,
        status: "called"
    })

    if (!calledToken) {
        return Response.json({
            success: false,
            message: "No token found with given queueId"
        })
    }

    calledToken.status = "skipped"
    await calledToken.save()

    return Response.json({
        success: true,
        data: calledToken,
        message: "Called token is served successfully"
    })
}