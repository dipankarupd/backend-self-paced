import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudnary.service.js"
import { ApiResponse } from "../utils/apiResponse.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // todos: 
    // check if the title and description are present
    // get the local path for the video thumbnail and vid
    // upload the video on cloudinary
    // upload the details in the database
    // send success response

    if([title, description].some(
        (field) => field.trim() === ""
    )) {
        throw new ApiError(400, "field missing")
    }

    // get the local path:
    let videoFileLocalPath
    if(req.files && 
        Array.isArray(req.files.video) &&
        req.files.video.length > 0  
    ) {
        videoFileLocalPath = req.files?.video[0]?.path
    }

    let thumbnailLocalPath
    if(req.files && 
        Array.isArray(req.files.thumbnail) &&
        req.files.thumbnail.length > 0  
    ) {
        thumbnailLocalPath = req.files?.thumbnail[0]?.path
    }

    const video = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if([video, thumbnail].some(
        (field) => !field
    )) {
        throw new ApiError(
            400,
            "thumbnail and video is must"
        )
    }

    // add the details to the database:
    const videoDetail = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title: title,
        description: description,
        duration: video.duration,
        published: false,
        owner: req.user?._id
    })

    const uploadedVideo = await Video.findById(videoDetail._id)

    if(!uploadedVideo) {
        throw new ApiError(
            500,
            "Something went wrong while uploading a video"
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Video uploaded successfully",
            uploadedVideo
        )
    )
})


const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    
    if(!videoId) {
        throw new ApiError(400, "no context provided")
    }

    const video = await Video.aggregate([
        // pipeline 1: 
        // match the video with the id
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },

        // pipeline 2: 
        // get the likes count: 
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },

        // pipeline 3: 
        // get the comments: 
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments"
            }
        },

        // pipeline 4: 
        // get the user details: 
        {
            $lookup: {
                from: "users",
                localField: "owner", 
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    // sub-pipeline to get subscription detail
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    }, 

                    // sub pipeline to get counts:
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    $if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    $then: true,
                                    $else: false
                                }
                            }
                        }
                    },
                    // project the user details: 
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    },

                    // 
                ]
            }
        },

        // pipeline 5: 
        // get the likes and comments count: 
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                commentCount: {
                    $size: "$comments"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        $if: {
                            $in: [
                                req.user?._id,
                                "$likes.likedBy"
                            ]
                        },
                        $then: true,
                        $else: false
                    }
                }
            }
        },
    ])

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "successfully fetched video",
        video
    ))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { description, title } = req.body
    if(!videoId) {
        throw new ApiError(400, "no context provided")
    }

    if([title, description].some(
        (field) => field.trim() === ""
    )) {
        throw new ApiError(400, "description and title not there")
    }

    // find the video:
    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "no video found")
    }

    // check if the current user is the owner of the video:
    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400,"only owner can update")
    }

    // update the video:
    const newVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title: title,
                description: description
            }
        },
        { new: true }
    )
    
    if(!newVideo) {
        throw new ApiError(
            500, "Something went wrong while updating"
        )
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Successfully uploaded the video",
            newVideo
        )
    )
})

const updateThumbnail = asyncHandler(async(req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError(400, "no context provided")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "no such video exist")
    }

    // check if the current user is the owner of the video:
    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400,"only owner can update")
    }

    const thumbnailLocalPath = req.file?.path

    if(!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail path missing")
    }

    const thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnailFile?.url) {
        throw new ApiError(500, "failed to upload to cloud")
    } 

    const updatedThumbnail = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: thumbnailFile.url
            }
        },
        { new: true }
    )

    if(!updatedThumbnail) {
        throw new ApiError(500, "something went wrong")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Successfully updated thumbnail",
            updatedThumbnail
        )
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    
    if(!videoId) {
        throw new ApiError(400, "no context")
    }

    const video = await Video.findById(videoId)
    if(!video) {
        throw new ApiError(400, "no video found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "Only owner can delete"
        )
    }

    await Video.findByIdAndDelete(videoId)

    // delete the likes and comments of the video
    await Like.deleteMany({
        video: videoId
    })

    await Comment.deleteMany({
        video: videoId
    })

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "Successfully deleted the video",
        {
            message: "success"
        }
    ))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId) {
        throw new ApiError(400, "no video id provided")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "video missing")
    }

    // check if the current user is the owner of the video:
    if(video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400,"only owner can update")
    }

    const toggleVidoePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        }, 
        {
            new: true
        }
    )

    if (!toggleVidoePublish) {
        throw new ApiError(500, "something went wrong")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "Successfully toggled publish status",
            toggleVidoePublish
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    updateThumbnail
}