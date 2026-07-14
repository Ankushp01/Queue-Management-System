// import mongoose from "mongoose";
import organizationModel from "@/models/organization.model";
import { connectdb } from "@/lib/connectdb";
import bcrypt from "bcryptjs";

export async function POST(req:Request) {
    try {
        await connectdb()
        const { name, description, address, contactNumber, email, password } = await req.json()
        const isEmail = await organizationModel.findOne({
            $or: [{email},
                {contactNumber}]
        })
        if (isEmail) {
            return Response.json({
                success: false,
                message: "Email or contact number already exists"
            })
        }

        const hashedpassword = await bcrypt.hash(password, 6)

        const organization = await organizationModel.create({
            name,
            description,
            address,
            contactNumber,
            email,
            password: hashedpassword
        })

        // const org = organization.remove("password")

        return Response.json({
            success: true,
            message: "Organization is successfully created",
        })

    } catch (error) {
        console.log(error,"Some error occured while registering")
        return Response.json({
            success: false,
            message: "Some error occured while registering",
        })
    }
}