import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";

export async function GET(
    req: Request,
    {
        params,
    }: {
        params: Promise<{
            tokenId: string;
        }>;
    }
) {
    await connectdb();

    const { tokenId } = await params;

    const foundToken =
        await tokenModel.findById(tokenId);

    if (!foundToken) {
        return Response.json(
            {
                success: false,
                message:
                    "Token not found with given tokenId",
            },
            {
                status: 404,
            }
        );
    }

    const foundQueue =
        await queueModel.findById(
            foundToken.queueId
        );

    if (!foundQueue) {
        return Response.json(
            {
                success: false,
                message:
                    "Queue not found with given token",
            },
            {
                status: 404,
            }
        );
    }


    const peopleAhead =
        await tokenModel.countDocuments({
            queueId: foundToken.queueId,
            status: "waiting",
            tokenNumber: {
                $lt: foundToken.tokenNumber,
            },
        });

    const waitingTime =
        foundQueue.avgServiceTimePerCustomer *
        peopleAhead;

    const token = {
        ...foundToken.toObject(),
        waitingTime,
        peopleAhead,
    };

    return Response.json({
        success: true,
        data: token,
        message:
            "Token found successfully",
    });
}