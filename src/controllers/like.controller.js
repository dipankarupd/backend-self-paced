import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {Video} from "../models/video.model.js"
import { ApiResponse } from "../utils/apiResponse.js";

const toggleVideoLike = asyncHandler(async(req, res) => {

    // get the video id from parameter
    // check if the video is already liked
    // if liked -> unlike
    // else add to liked db

    const {videoId} = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid video ID",
        )
    }

    const likeExist = await Video.findOne(
        {
            video: videoId,
            likedBy: req.user?._id  
        }
    );

    if (likeExist) {
        // already somebody liked it:
        await Video.findByIdAndDelete(likeExist._id)

        // return a response -> toggled the likes
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            "Unliked successfully",
            {
                liked: false
            }
        ))
    }
    // not liked previously
    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "Liked successfully",
        {
            liked: true
        }
    ))
})

const toggleCommentLike = asyncHandler(async(req, res) => {

    // get the comment ID from param
    const {commentID} = req.params

    // check validity:
    if(!isValidObjectId(commentID)) {
        throw new ApiError(
            400,
            "Invalid param"
        )
    } 

    // find for the comment in like database:
    const likedComment = await Like.findOne({
        comment: commentID,
        likedBy: req.user?._id
    })

    // comment is already liked:
    // unlike and delete from the databse:
    if (likedComment) {
        await Like.findByIdAndDelete(likedComment._id)

        // return a response
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            "unliked comment",
            {
                liked: false
            }
        ))
    }

    // comment is not liked
    await Like.create({
        comment: commentID,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "liked successfully",
        {
            liked: true
        }
    ))
})

const toggleTweetLike = asyncHandler(async(req, res) => {

   
    const {tweetId} = req.params

    // check validity:
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(
            400,
            "Invalid param"
        )
    } 

    // find for the comment in like database:
    const likedTweet = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (likedTweet) {
        await Like.findByIdAndDelete(likedTweet._id)

        // return a response
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            "unliked tweet",
            {
                liked: false
            }
        ))
    }

   
    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "liked successfully",
        {
            liked: true
        }
    ))

})

const getLikedVideos = asyncHandler(async(req, res) => {

    
    const videos = await Like.aggregate([

        // pipeline 1: 
        // get the current user
        {
            $match: {
                likedBy: new mongoose
                .Types
                .ObjectId(req.user._id)
            }
        },

        // pipeline 2: 
        // find in the database videos liked by this user
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetail",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        },
                        
                    },
                    {
                        $addFields: {
                            ownerDetail: {
                                $first: "$ownerDetail"
                            }
                        }
                    }
                ]
            }
        }

       
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "successfully fetched liked videos",
        videos
    ))
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}