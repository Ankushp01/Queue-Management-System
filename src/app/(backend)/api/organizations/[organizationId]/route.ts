import mongoose from "mongoose";
import organizationModel from "@/models/organization.model";
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

    const organization =
        await organizationModel
            .findById(organizationId)
            .select(
                "name email phone address"
            )
            .lean();

    if (!organization) {
        return Response.json(
            {
                success: false,
                message:
                    "Organization not found",
            },
            { status: 404 }
        );
    }

    return Response.json({
        success: true,
        data: organization,
    });
}