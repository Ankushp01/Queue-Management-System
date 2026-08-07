import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(backend)/api/auth/[...nextauth]/option";

export async function PATCH(req: Request, { params }: { params: { tokenId: string } }) {
    await connectdb()
    const { phoneNumber } = await req.json()

    const tokenId = params.tokenId

    const session = await getServerSession(authOptions) || null

    const foundToken = await tokenModel.findById(tokenId)

    if (!foundToken) {
        return Response.json({
            success: false,
            message: "Token not found with given called TokenId"
        })
    }

    const foundQueue = await queueModel.findById(foundToken.queueId)

    if (!foundQueue) {
        return Response.json({
            success: false,
            message: "Queue not found with given token"
        })
    }

    const isOrganization = session && (session?.user?.organizationId).toString() === (foundQueue.organizationId).toString()

    const isOwner = phoneNumber === foundToken.phoneNumber

    if (!isOrganization && !isOwner) {
        return Response.json({
            success: false,
            message: "You are not authorized to any action to this token bcz this token doesnt belong to ur organization"
        })
    }

    if (foundToken.status == "served" || foundToken.status == "cancelled") {
        return Response.json({
            success: false,
            message: "Token cannot be cancelled as its or already cancelled or served"
        })
    }

    foundToken.status = "cancelled"
    await foundToken.save()

    return Response.json({
        success: true,
        data: foundToken,
        message: "Called token is cancelled successfully"
    })
}