import { connectdb } from "@/lib/connectdb";
import organizationModel from "@/models/organization.model";

export async function GET(req: Request) {
    await connectdb();

    const { searchParams } =
        new URL(req.url);

    const q = searchParams.get("q");

    if (!q) {
        return Response.json({
            success: false,
            message:
                "Search query required",
        });
    }

    const organizations =
        await organizationModel
            .find({
                name: {
                    $regex: q,
                    $options: "i",
                },
            })
            .lean();

    return Response.json({
        success: true,
        data: organizations,
        message:
            "Organizations fetched successfully",
    });
}