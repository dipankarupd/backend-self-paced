import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        const decodedToken = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRETS
        )
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken" )
    
        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }
    
        // user exists:
        // add this user access to the request:
        // this user access we will get for the logout 
        req.user = user
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token")
    }
})