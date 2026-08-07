import { NextRequest } from "next/server";
import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/option";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ queueId: string }> }
) {
  await connectdb();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const { queueId } = await params;

  const foundQueue = await queueModel.findById(queueId);

  if (!foundQueue) {
    return Response.json({
      success: false,
      message: "Queue not found",
    });
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({
      success: false,
      message: "Login first",
    });
  }

  if (
    session.user.organizationId.toString() !==
    foundQueue.organizationId.toString()
  ) {
    return Response.json({
      success: false,
      message: "Queue is not of your organization",
    });
  }

  const query: any = {
    queueId,
  };

  if (status) {
    query.status = status;
  }

  const tokens = await tokenModel
    .find(query)
    .sort({ createdAt: 1 });

  return Response.json({
    success: true,
    data: tokens,
    message: "Here are all tokens",
  });
}