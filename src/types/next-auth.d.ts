import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      organizationId: string;
      contactNumber: string;
      address: string;
    };
  }

  interface User {
    _id: string;
    contactNumber: string;
    address: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    organizationId: string;
    contactNumber: string;
    address: string;
  }
}