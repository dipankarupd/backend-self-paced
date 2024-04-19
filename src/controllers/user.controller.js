import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloud } from "../utils/cloudnary.service.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"


const generateAccessAndrefreshTokens = async (userId) => {
    try {
        
        // find the user:
        const user = await User.findById(userId)

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // add the refresh token to the user database
        user.refreshToken = refreshToken

        // only refresh token is added
        // if we save then validation will again go
        // we have not added passwords and other field here so may go wrong
        // to prevent that use validateBeforeSave 
        await user.save({
            validateBeforeSave: false
        })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong")
    }
}


const registerUser = asyncHandler( async (req, res) => {
   
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

    // -*-*-*-*--*-*-*-*--*-*-*-*-*-*-*-*--*-*-*-*--*-*-*-*--*-*-*-*-

    // get the data from frontend -> in body or url 
    // this case from body

    const { username, email, password } = req.body
    console.log(req.body);
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
    // talk with db, so use async

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
    // const avatarLocalPath = req.files?.avatar[0]?.path

    let avatarLocalPath;

    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0]?.path
    } 

    // doing this way we would not know if the req has a files property
    // and has an array named dp with elements in it. 
    // so do a simpler way 
    // const dpLocalPath = req.files?.dp[0]?.path

    let dpLocalPath;

    if (
        req.files 
        && Array.isArray(req.files.dp)
        && req.files.dp.length > 0
    ) {
        dpLocalPath = req.files.dp[0].path
    }
    

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
        dp: dp?.url || "" ,   // if no dp is given empty string is passed
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


// login user:
const loginUser = asyncHandler( async (req, res) => {
    // algorithms:
    // get the data from the body
    // username based or email based login?

    // check for user
    // if found, check the correctness of password  
    // if correct, generate access and refresh tokens
    // send these tokens as cookies 
    // give response


    // get the data from body:
    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is needed")
    }

    // find the user in the db:
    // use findOne -> returns the first entry found in the db
    const user = await User.findOne(
        {
            $or: [ { username } , { email }]
        }
    )

    if (!user) {
        throw new ApiError(404, "user do not exist")
    }

    // check for the password: 
    // user model -> func isPasswordCorrect -> call it
    // provide the pw gotten from body

    const isPasswordCorrect = user.isPasswordCorrect(password)

    // wrong password
    if(!isPasswordCorrect) { 
        throw new ApiError(401, "Incorrect password")
    }

    // generate access and refresh token:
    const { accessToken, refreshToken } = await generateAccessAndrefreshTokens(user._id);

    // the current user instance do not have refreshToken in it because
    // it was defined before the generate.... method call
    // so get the correct user again, run db query

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // cookie options config: 

    // bydefault cookie is modifiable by anybody in frontend
    // doing this it will only be modifiable from the server side
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(
        200
    ).cookie(
        "accessToken", accessToken, options
    ).cookie(
        "refreshToken", refreshToken, options
    ).json(
        new ApiResponse(
            200,
            // sending the access token and refresh token
            // because user may want to store it locally
            // depends on the requirement to whether send or not
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "Successfully logged in"
        )
    )

})


//logout user:
const logoutUser = asyncHandler(async (req, res) => {

    // remove the cookies
    // remove the values in accessToken and refreshToken field

    // where is the user detail for currently logged in user?
    // for that we write auth middleware:

    const userId = req.user._id

    // remove the refresh token from the db
    await User.findByIdAndUpdate(
        userId, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(
        200,
        {},
        "logged out successfully"
    ))
})

// relogin if session expires:
const renewToken = asyncHandler(async (req, res) => {

    const incomingToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingToken) {
        throw new ApiError(401, "unauthorized request")
    }

    // if there is token coming from the user via cookies, 
    // we must checck if that is same as the one saved in the db
    // the token coming from cookies is encrypted and the one saved in db is raw
    // we must verify that both are same

    try {
        const decodedTokekn = jwt.verify(
            incomingToken,
            process.env.REFRESH_TOKEN_SECRETS
        )
    
        const user = await User.findById(decodedTokekn?._id)
    
        if(!user) {
            throw new ApiError(401, "invalid refresh token")
        }
    
        // check if the incoming token is saved in the db:
    
        if(incomingToken !== user?.refreshToken) {
            throw new ApiError(401, "token expired")
        }
    
        // if all goes well, generate new access and refresh tokens
    
        const { accessToken, newRefreshToken } = await generateAccessAndrefreshTokens(user._id)
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, newRefreshToken},
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message)
    }

})


// reset password: 
const changePassword = asyncHandler(async(req, res) => {

    const {oldPassword, newPassword} = req.body

    const userId = req.user?.id

    const user = await User.findById(userId)

    // check for if the old password is correct: 
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "password changed successfully",
        {}
    ))
})

const getCurrentUser = asyncHandler(async(req, res) => {

    // if the user is logged in
    // we can get the current user from the middleware
    // which we created

    const currentUser = req.user
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "current user fetched successfully",
        currentUser
    ))
})
export {
    registerUser,
    loginUser,
    logoutUser,
    renewToken,
    changePassword,
    getCurrentUser,
}