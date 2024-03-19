import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

// to connect to db, we use mongoose
// there may be problem which arise in db connection very frequently, so always wrap with try-catch or promise
// db is always in another continent, so it takes time, thus async await is a must


const connectDB = async () => {

    try {

        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected: DBHost: ${connectionInstance.connection.host}`);
    }

    catch (e) {
        console.log("ERROR connecting to db", e)
    }
}

export default connectDB