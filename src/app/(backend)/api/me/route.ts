import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/option";
import { log } from "console";

const session = getServerSession(authOptions)

log(session)