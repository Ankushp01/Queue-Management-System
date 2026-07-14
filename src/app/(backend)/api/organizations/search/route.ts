import { connectdb } from "@/lib/connectdb";
import organizationModel from "@/models/organization.model";

export async function GET(req: Request) {
    await connectdb();

    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q");

    console.log("SEARCH QUERY:", query);

    if (!query?.trim()) {
        return Response.json(
            {
                success: false,
                message: "Search query is required",
            },
            {
                status: 400,
            }
        );
    }

    const organizations =
        await organizationModel
            .find({
                name: {
                    $regex: query.trim(),
                    $options: "i",
                },
            })
            .select("_id name")
            .lean();

    console.log(
        "ORGANIZATIONS:",
        organizations
    );

    return Response.json({
        success: true,
        data: organizations,
        message: "Organizations found",
    });
}