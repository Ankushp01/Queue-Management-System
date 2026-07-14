import mongoose, { Schema } from "mongoose"

const adminSchema = new Schema({
    name: {
        type: String,
        required:true
    },
    age: Number,
    // role: {},
    // tokens: {

    // },
    organizationId:{
        type: mongoose.Types.ObjectId,
        ref:"organization"
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password:{
        type:String,
        required:true,
    }

}, { timestamps: true })

const adminModel = mongoose.models.admin || mongoose.model("admin",adminSchema)

export default adminModel