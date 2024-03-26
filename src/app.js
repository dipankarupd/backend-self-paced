import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

// use method is mostly used for configuration purpose or in the middlewares
//make some setups for cors by passing the object.. learn more from doc
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// configure the json input:
// these data come when you fill some form in the frontend
app.use(express.json({
    limit: "16kb"
}))

// configure data coming from url:
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

// configure data like file, images which I need to store in my server -> in folder public

app.use(express.static("public"))

// cookie config:
app.use(cookieParser())

export {app}