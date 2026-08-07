import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/option";

export async function GET(req: Request, {
    params,
}: {
    params: Promise<{
        queueId: string;
    }>;
}) {
    await connectdb()
    const { queueId } = await params

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

    const tokens = await tokenModel.aggregate([
        {
            $match: {
                queueId: foundQueue._id
            },
        },
        {
            $group: {
                _id: "$status",
                count: {
                    $sum: 1
                }
            }
        }
    ])

    const stats:any = {
        waiting: 0,
        called: 0,
        served: 0,
        skipped: 0,
        cancelled: 0
    }

    tokens.forEach((token) => {
        stats[token._id] = token.count
    })

    return Response.json({
        success: true,
        data: tokens,
        message: "Stats is successfully returned"
    })
}