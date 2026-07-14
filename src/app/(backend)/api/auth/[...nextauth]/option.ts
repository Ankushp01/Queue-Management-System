import { NextAuthOptions } from "next-auth";
import { connectdb } from "@/lib/connectdb";
// import adminModel from "@/models/admin.model";
import organizationModel from "@/models/organization.model";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // id:'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<any> {
        await connectdb()

        const org = await organizationModel.findOne({ email: credentials?.email })

        if (!org) {
          return null
          throw new Error("No email found")
        }

        const isPasswordCorrect = await bcrypt.compare(credentials?.password, org.password)

        if (!isPasswordCorrect) {
          return null
          throw new Error("Incorrect Password so some error occured during authentication using next-auth")
        }
        return org
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.organizationId = user._id
        token.name = user.name
        token.contactNumber = user.contactNumber
        token.address = user.address
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.organizationId = token.organizationId
        session.user.name = token.name
        session.user.address = token.address
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/sign-in'
  },
  session: {
    strategy: 'jwt'
  }
}