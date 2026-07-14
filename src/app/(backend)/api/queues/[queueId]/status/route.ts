import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/option";

export async function PATCH(req: Request, { params }: { params: { queueId: string } }) {
    await connectdb()

    const { status } = await req.json()

    if (!status){
        return Response.json({
            success: false,
            message: "Status cannot be this"
        })
    }

    const { queueId } = params

    const foundQueue = await queueModel.findById(queueId)

    if (!foundQueue) {
        return Response.json({
            success: false,
            message: "Queue not found"
        })
    }

    const session = await getServerSession(authOptions)

    if (!session) {
        return Response.json({
            success: false,
            message: "Login first"
        })
    }

    if ((session?.user?.organizationId).toString() !== (foundQueue.organizationId).toString()) {
        return Response.json({
            success: false,
            message: "Queue is not of your organization"
        })
    }

    if (foundQueue.status == status) {
        return Response.json({
            success: false,
            message: "Status is already same"
        })
    }

    foundQueue.status = status
    await foundQueue.save()

    return Response.json({
        success: true,
        data: foundQueue,
        message: "Status successfully changed"
    })
}