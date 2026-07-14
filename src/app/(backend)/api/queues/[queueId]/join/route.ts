import mongoose from "mongoose";

import { connectdb } from "@/lib/connectdb";

import queueModel from "@/models/queue.model";
import tokenModel from "@/models/token.model";

export async function POST(
    req: Request,
    {
        params,
    }: {
        params: Promise<{
            queueId: string;
        }>;
    }
) {
    await connectdb();

    const { queueId } = await params;

    if (
        !mongoose.Types.ObjectId.isValid(queueId)
    ) {
        return Response.json(
            {
                success: false,
                message: "Invalid queue id",
            },
            {
                status: 400,
            }
        );
    }

    const {
        name,
        email,
        phoneNumber,
    } = await req.json();

    if (
        !name?.trim() ||
        !email?.trim() ||
        !phoneNumber?.trim()
    ) {
        return Response.json(
            {
                success: false,
                message:
                    "Name, email and phone number are required",
            },
            {
                status: 400,
            }
        );
    }

    const queue = await queueModel.findById(
        queueId
    );

    if (!queue) {
        return Response.json(
            {
                success: false,
                message: "Queue not found",
            },
            {
                status: 404,
            }
        );
    }

    if (queue.status !== "working") {
        return Response.json(
            {
                success: false,
                message:
                    "Queue is currently unavailable",
            },
            {
                status: 400,
            }
        );
    }

    const existingToken =
        await tokenModel.findOne({
            queueId,
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            status: {
                $in: ["waiting", "called"],
            },
        });

    if (existingToken) {
        return Response.json(
            {
                success: true,
                data: existingToken,
                message:
                    "You already have an active token in this queue",
            },
            {
                status: 200,
            }
        );
    }

    const tokenNumber =
        queue.nextTokenNumber;

    const token = await tokenModel.create({
        queueId,
        tokenNumber,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        status: "waiting",
    });

    queue.nextTokenNumber += 1;

    await queue.save();

    return Response.json(
        {
            success: true,
            data: token,
            message:
                "Queue joined successfully",
        },
        {
            status: 201,
        }
    );
}

//     const foundQueue = await queueModel.findById(queueId)

//     if (!foundQueue) {
//         return Response.json({
//             success: false,
//             message: "Queue is not found"
//         })
//     }

//     const token = await tokenModel.create({
//         queueId,
//         name,
//         phoneNumber,
//         tokenNumber: foundQueue.nextTokenNumber
//     })

//     if (!token) {
//         return Response.json({
//             success: false,
//             message: "Token creation failed try again"
//         })
//     }

//     const updatedQueue = await queueModel.findByIdAndUpdate(queueId, {
//         $inc: {
//             nextTokenNumber: 1
//         }
//     })

//     // foundQueue.nextTokenNumber+=1
//     // await foundQueue.save()

//     return Response.json({
//         success: true,
//         data: token,
//         message: "Token is succefully created"
//     })
// }