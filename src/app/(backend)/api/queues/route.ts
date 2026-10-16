// import organizationModel from "@/models/organization.model";
import queueModel from "@/models/queue.model";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/option";
import { connectdb } from "@/lib/connectdb";

export async function POST(req: Request) {
    await connectdb()
    const session = await getServerSession(authOptions)
    const { name, description, avgServiceTimePerCustomer } = await req.json()

    if (!name) {
        return Response.json({
            success: false,
            message: "Queue name is required"
        });
    }

    if (!session) {
        return Response.json({
            success: false,
            message: "Please login first using your Organization Email"
        })
    }
    const queue = await queueModel.create({
        organizationId: session?.user?.organizationId,
        name,
        description,
        avgServiceTimePerCustomer
    })
    return Response.json({
        success: true,
        data:queue,
        message: "Queue is successfully created"
    })
}

export async function GET() {
    await connectdb()
    const session = await getServerSession(authOptions)
    if (!session) {
        return Response.json({
            success: false,
            message: "Please login first using your Organization Email"
        })
    }
    const queues = await queueModel.find({ organizationId: session?.user?.organizationId }).lean()

    return Response.json({
        success: true,
        data: queues,
        message: "List of queues are here"
    })
}