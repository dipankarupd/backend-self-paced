import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloud } from "../utils/cloudnary.service.js"
import { ApiResponse } from "../utils/apiResponse.js"


// steps to register:
    // get the credentials from the form frontend
    // validation   -> not null
    // already exist? -> email and username uniqueness
    // check if avatar exist -> images and files check..
    // upload the image to cloudinary -> check if properly uploaded 
    // create user object -> for mongodb -> create entry in db calls
    // check for user creation
    // remove the password and refresh token field from the response
    // return the user response
const registerUser = asyncHandler( async (req, res) => {
   
    
    // get the data from frontend -> in body or url 
    // this case from body

    const { username, email, password } = req.body
    console.log(`email: ${email}`);

    // validation check if these fileds are empty or not
    // 2 ways -> use if else in all the 3 fields

    // advanced way:

    if([username, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All the fields are needed")
    }


    // check if user already exists

    // import User field, it directly communiicate with the mongodb
    // we check if username or email already exist
    // query -> .findOne 
    // to check if email already exist or uname already exist -> use '$' sign -> operator


    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already exist")
    }

    // check for avatar
    // avatar data does not come in the body, we get it through multer and middleware
    // so multer gives an option of req.files() method

    // get the path which is there locally from the multer

    console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path

    const dpLocalPath = req.files?.dp[0]?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is must")
    }

    // upload on cloudnary
    const avatar = await uploadOnCloud(avatarLocalPath)
    const dp = await uploadOnCloud(dpLocalPath)

    //check for avatar .. avatar is must so make perfect checking for it
    if(!avatar) {
        throw new ApiError(400, "Avatar is must")
    }


    // create user object for database uploading:
    // talking with db -> async await and try catch(or if)
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        avatar: avatar.url,
        dp: dp.url || "" ,   // if no dp is given empty string is passed
        password,
    })

    // check if the new user is created : 
    // one way is using if else
    // better approach, find for that user in the database -> if found put that in new var
    // we do so because we need to remove the pw and refresh token field from the response so easy

    // .select method will help to tell which fields WE DON't NEED
    // '-' mean we do not need
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        // this is the error from the server
        // because createdUser not existing means that db fatteko
        // so give server side error status code for this
        throw new ApiError(500, "Something went wrong while registering")
    }


    // send the response: 
    return res.status(201).json(
        new ApiResponse(201, "User registered successfully", createdUser)
    )
})

export {registerUser}