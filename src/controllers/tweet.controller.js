import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"


// create new tweet
const createTweet = asyncHandler(async(req, res) => {

    // get the content
    // add the tweet in the database
    // check if the tweet is added successfully
    // if added successfully -> response
    const {tweetContent} = req.body

    if(!tweetContent) {
        throw new ApiError(
            400,
            "no content to tweet"
        )
    }

    const tweet = await Tweet.create({
        content: tweetContent,
        owner: req.user?._id    
    })

    if(!tweet) {
        throw new ApiError(500, "Error adding tweet to db")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "successfully created tweet",
        tweet
    ))

})

// delete a tweet
const deleteTweet = asyncHandler(async(req, res) => {

    const { tweetId } = req.params

    console.log(`tweet id: ${tweetId}`);
    

    // check for availability of tweetId
    if(!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet Id missing")
    }

    // check if the tweet exist or not:
    const tweet = await Tweet.findById(tweetId)

    if(!tweet) {
        throw new ApiError(400, "No such tweet exist")
    }

    // check if the current user is the owner of the tweet
    if(tweet?.owner.toString() !== req.user?._id.toString()) {
        
        // user does not match
        // other user cannot delete the tweet
        throw new ApiError(400, "Only owner can delete")
    }

    // owner deletes the tweet
    await Tweet.findByIdAndDelete(tweetId)

    // return the response
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "Successfully deleted the tweet",
        {}
    ))
    
})

// update a tweet
const updateTweet = asyncHandler(async(req, res) => {
    // get the tweet id from params
    const {tweetId} = req.params
    const {content} = req.body

    if(!tweetId) {
        throw new ApiError(400, "missing params")
    }

    const tweet = await Tweet.findById(tweetId)

    // check if the tweet exist:
    if(!tweet) {
        throw new ApiError(400, "no such tweet exist")
    }

    // check if the current user is owner of the tweet
    // can only be updated by the owner
    if(tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only owner can update")
    }

    // update the tweet
    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId, 
        {
            $set: {
                content: content, 
                owner: req.user?._id
            }
        },
        {
            new: true
        }
    )

    return res 
    .status(200)
    .json(new ApiResponse(
        200,
        "Updated tweet successfully",
        newTweet
    ))
})

const getUserTweets = asyncHandler(async(req, res) => {

    const {userId} = req.params

    if(!userId) {
        throw new ApiError(400, "no params passed")
    }
    // pipeline 1:
    const tweets = await Tweet.aggregate([

        // pipeline 1:
        // find the tweets of the user:
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },

        // pipeline 2: 
        // look for the user detail for the tweet
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

        // pipeline 3: 
        // get the details of the likes:
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1
                        }
                    }
                ]
            }
        },

        // pipeline 3: 
        // cleanup the final result 
        {
            $addFields: {

                // add like counts: 
                likeCount: {
                    $size: "$likeDetails"
                },

                ownerDetail: {
                    $first: "$ownerDetail"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likeDetails.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "tweets fetched successfully",
        tweets
    ))
})

export {
    createTweet,
    deleteTweet,
    updateTweet,
    getUserTweets,
}