import mongoose, { Schema } from "mongoose"

const queueSchema = new Schema({
    organizationId: {
        type: mongoose.Types.ObjectId,
        ref: "organization"
    },
    // createdBy:{
    //     type:mongoose.Types.ObjectId,
    //     ref:"admin"
    // },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    nextTokenNumber: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        enum: ["paused", "working", "break"],
        default: "working"
    },
    currentTokenNumber: {
        type: Number,
        default: null
    },
    avgServiceTimePerCustomer: {
        type: Number
    }
}, { timestamps: true });

// Index for fast organization queue queries
queueSchema.index({ organizationId: 1 });

const queueModel = mongoose.models.queue || mongoose.model("queue", queueSchema);

export default queueModel;