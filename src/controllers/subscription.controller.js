import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channel id")
    }

    // check if the current user is subscribed
    // to this channel:

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed?._id)
        return res
        .status(200)
        .json(new ApiResponse(
            200, 
            "Successfully unsubscribed",
            {
                subscribed: false
            }
        ))
    }

    // if not subscribed: 
    // subscribe:
    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })
    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            "Successfully subscribed",
            {
                subscribed: true
            }
        ))
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)) {
        throw new ApiError(400, "invalid channel id")
    }

    //pipeline creating: 
    const subscribers = await Subscription.aggregate([
        // pipeline 1: 
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        // pipeline 2: 
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    // pipeline for mutual sunscribers
                    {
                        // check who all subscribed to 
                        // the subscriber
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "mutualSubscribers"
                        }
                    },
                    {
                        $addFields: {
                            mutualSubscribers: {
                                $cond: {
                                    $if: {
                                        $in: [
                                            channelId,
                                            "$mutualSubscribers.subscriber"
                                        ]
                                    },
                                    $then: true,
                                    $else: false
                                }
                            },
                            // this is the subscriber count
                            // of the subscriber
                            $subscribersCount: {
                                $size: "$mutualSubscribers"
                            }
                        }
                    },
                ]
            }
        },
        // pipeline 3: 
        {
            $unwind: "$subscriber",
        },
        // pipeline 4: 
        {
            $project: {
                subscriber: {
                    username: 1,
                    avatar: 1,
                    mutualSubscribers: 1,
                    $subscribersCount: 1
                }
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "successfully fetched subscribers",
            subscribers
        )
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "invalid subscriber id")
    }

    const pipeline = [

        // pipeline 1: 
        // filter based on subscriber id: 
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },

        // pipeline 2: 
        // get the detail of the channel user
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
            }
        },

        {
            $unwind: "subscribedChannel"
        },

        {
            $project: {
                subscriber: 1,
                _id: 0,
                subscribedChannel: {
                    username: 1,
                    avatar: 1
                }
            }
        }

    ]
    const channels = await Subscription.aggregate(pipeline)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "successfully fetched channels",
            channels
        )
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}