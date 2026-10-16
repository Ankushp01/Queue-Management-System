import mongoose, { Schema } from "mongoose"

const tokenSchema = new Schema({
    queueId: {
        type: mongoose.Types.ObjectId,
        ref: "queue",
        required: true,
    },
    name: {
        type: String,
    },
    tokenNumber: {
        type: Number,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
    },
    status: {
        type: String,
        enum: ["waiting", "called", "served", "cancelled", "skipped"],
        default: "waiting",
    },
}, { timestamps: true });

// Compound unique index ensuring no duplicate token numbers exist within a queue
tokenSchema.index({ queueId: 1, tokenNumber: 1 }, { unique: true });

// Performance index for atomic next-token query and chronological ordering
tokenSchema.index({ queueId: 1, status: 1, createdAt: 1 });

// Index for active token prevention lookup
tokenSchema.index({ queueId: 1, email: 1, phoneNumber: 1 });

const tokenModel = mongoose.models.token || mongoose.model("token", tokenSchema);

export default tokenModel;