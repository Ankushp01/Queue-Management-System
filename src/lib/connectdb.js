import mongoose from "mongoose"

export async function connectdb() {
    try {
        if (mongoose.connection.readyState == 1) {
            console.log("Database is connected!")
            return
        }

        const db = await mongoose.connect(process.env.MONGO_URI)

        console.log(
            "Database connected successfully. Host:",
            db.connection.host
        );
    } catch (error) {
        console.log(error, "error in connecting the database");
    }
}