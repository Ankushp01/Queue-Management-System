import mongoose from "mongoose";

import queueModel from "@/models/queue.model";

import { connectdb } from "@/lib/connectdb";

export async function GET(
    req: Request,
    {
        params,
    }: {
        params: Promise<{
            organizationId: string;
        }>;
    }
) {
    // console.log("🔥 QUEUES ROUTE HIT");
    await connectdb();

    const { organizationId } =
        await params;

    if (
        !mongoose.Types.ObjectId.isValid(
            organizationId
        )
    ) {
        return Response.json(
            {
                success: false,
                message:
                    "Invalid organization id",
            },
            { status: 400 }
        );
    }

    const queues =
        await queueModel
            .find({
                organizationId,
            })
            .select(
                "name description status currentTokenNumber avgServiceTimePerCustomer"
            )
            .lean();

    return Response.json({
        success: true,
        data: queues,
    });
}