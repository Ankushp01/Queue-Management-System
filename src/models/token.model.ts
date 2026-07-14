import mongoose, { Schema } from "mongoose"

const tokenSchema = new Schema({
    queueId: {
        type: mongoose.Types.ObjectId,
        ref:"queue"
    },
    name:{
        type:String,
    },
    tokenNumber: {
        type: Number,
        // unique: true,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        // unique: true
    },
    status: {
        type: String,
        enum:["waiting","called","served","cancelled","skipped"],
        default:"waiting"
    },
    // organization: {
    //     type: mongoose.Types.ObjectId,

    // }

}, { timestamps: true })

const tokenModel = mongoose.models.token || mongoose.model("token", tokenSchema)

export default tokenModel