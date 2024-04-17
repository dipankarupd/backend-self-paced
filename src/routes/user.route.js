import { loginUser, logoutUser, registerUser, renewToken } from "../controllers/user.controller.js";
import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

// control comes from app.js to here :

// for file handling, we need middleware of multer
router.route("/register").post(

    // we need to get the avatar file and cover image file so we use fields
    // otherwise we could have used upload.single

    // fields take an array as param
    upload.fields([
        {
            name: "avatar", 
            maxCount: 1
        },
        {
            name: "dp",
            maxCount: 1
        }
    ]),
    registerUser
)

// login route: 
router.route("/login").post(loginUser)


// secured routes: 
// inject the middleware here before the controller method
// inside verifyJWT there is a next() 
// -> next means verifyJWT is done and now run logoutUser
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refreshtoken").post(renewToken)
// app url: http://localhost:8000/api/v1/users/register

export default router;  