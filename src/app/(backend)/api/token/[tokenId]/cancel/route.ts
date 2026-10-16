import { NextRequest } from "next/server";
import tokenModel from "@/models/token.model";
import queueModel from "@/models/queue.model";
import { connectdb } from "@/lib/connectdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/(backend)/api/auth/[...nextauth]/option";
import { queueEvents } from "@/lib/queueEvents";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  await connectdb();

  const { phoneNumber } = await req.json();

  const { tokenId } = await params;

  const session = await getServerSession(authOptions);

  const foundToken = await tokenModel.findById(tokenId);

  if (!foundToken) {
    return Response.json({
      success: false,
      message: "Token not found with given tokenId",
    });
  }

  const foundQueue = await queueModel.findById(foundToken.queueId);

  if (!foundQueue) {
    return Response.json({
      success: false,
      message: "Queue not found with given token",
    });
  }

  const isOrganization =
    session &&
    session.user.organizationId.toString() ===
      foundQueue.organizationId.toString();

  const isOwner = phoneNumber === foundToken.phoneNumber;

  if (!isOrganization && !isOwner) {
    return Response.json({
      success: false,
      message: "You are not authorized to cancel this token.",
    });
  }

  if (
    foundToken.status === "served" ||
    foundToken.status === "cancelled"
  ) {
    return Response.json({
      success: false,
      message: "Token is already served or cancelled.",
    });
  }

  foundToken.status = "cancelled";
  await foundToken.save();

  queueEvents.emitQueueUpdate(foundToken.queueId.toString(), {
    type: "queue-update",
    action: "cancel",
    currentToken: foundQueue.currentTokenNumber,
    status: foundQueue.status,
    token: foundToken,
  });

  return Response.json({
    success: true,
    data: foundToken,
    message: "Token cancelled successfully.",
  });
}