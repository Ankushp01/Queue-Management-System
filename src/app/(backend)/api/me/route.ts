import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/option";

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session) {
        return Response.json(
            { success: false, message: "Not authenticated" },
            { status: 401 }
        );
    }

    return Response.json({
        success: true,
        data: session.user,
    });
}