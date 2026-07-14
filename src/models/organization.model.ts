import mongoose, { Schema } from "mongoose"

const organizationSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    address: {
        type: String,
    },
    contactNumber: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true,
    }
    // queues:{
    //     type:[mongoose.Types.ObjectId],
    //     ref:"queue"
    // }

}, { timestamps: true })

const organizationModel = mongoose.models.organization || mongoose.model("organization", organizationSchema)

export default organizationModel