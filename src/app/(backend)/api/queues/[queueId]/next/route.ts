import queueModel from "@/models/queue.model"
import tokenModel from "@/models/token.model"
import { connectdb } from "@/lib/connectdb"

export async function POST(req: Request,  {
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
            message: "Queue not found with given queueId"
        })
    }

    const nextToken = await tokenModel.findOne({
        queueId,
        status: "waiting",
    }).sort({ createdAt: 1 })

    if (!nextToken) {
        return Response.json({
            success: false,
            message: "No next token found in given queueId"
        })
    }

    foundQueue.currentTokenNumber = nextToken.tokenNumber

    await foundQueue.save();

    nextToken.status = "called"

    await nextToken.save();

    return Response.json({
        success: true,
        data: nextToken,
        message: "Next token is called successfully"
    })
}