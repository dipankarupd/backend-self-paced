//require('dotenv').config({path: "./env"})   
// load the .env as soon as possible
// inconsistent code with use of require and import in same file

import dotenv from "dotenv"
import connectDB from "./db/dbconn.js";


dotenv.config({path: "./env"})

// async function call, it returns a promise. so using .then and .catch
connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Listening and serving on port: ${process.env.PORT}`);
    })
})
.catch((e) => {
    console.log("MongoDB connection error ", e);
})














// import express from "express"
// func to connect to db
// use IFFE (immediately invoked function expression):
// ;(async () => {
//     try {

//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", () => {
//             console.log("application unable to talk to db")
//         })

//         app.listen(process.env.PORT)
//         console.log("Server running on port: ", process.env.PORT);

//     } catch (error){
//         console.error("ERROR", error)
//         throw error
//     }
// })() 