
import mongoose from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Like} from "../models/like.model.js"
import {ApiResponse} from "../utils/apiResponse.js"


const addComment = asyncHandler(async(req, res) => {

    const { videoId } = req.params
    const { comment } = req.body

    if(!comment) {
        throw new ApiError(400, "no contents")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "no such video exist")
    }

    // video exists:
    const createdComment = await Comment.create({
        content: comment,
        video: videoId,
        owner: req.user?._id    
    })

    if(!createdComment) {
        throw new ApiError(500, "Something went wrong")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "successfully added comment",
        createdComment
    ))

})

const deleteComment = asyncHandler(async(req, res) => {

    // get the comment Id from the params
    const {commentId} = req.params
    
    if(!commentId) {
        throw new ApiError(400, "no context")
    }

    // get the comment from the database:
    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new ApiError(400, "no such comment exist")
    }

    // check if the current user is the owner 
    // of the comment
    if(comment?.owner.toString() !== req.user?._id.toString()) {

        throw new ApiError(
            400, "only owner can delete the comment"
        )
    }

    // owner tries to delete:
    await Comment.findByIdAndDelete(commentId)

    // delete the likes assossiated with this comment
    await Like.deleteMany({
        comment: commentId,
        owner: req.user?._id
    })

    return res
    .status(201)
    .json(new ApiResponse(
        201,
        "Successfully deleted the comment",
        {}
    ))
})

const updateComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if(!content && !commentId) {
        throw new ApiError(400, "No contents")
    }

    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new ApiError(400, "no such comment")
    }

    if(comment.owner.toString() !== req.user?._id.toString) {
        throw new ApiError(400, "only owner can update")
    }

    // owner want to update
    const newComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    )

    if(!newComment) {
        throw new ApiError(500, "Something went wrong")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        "Comment added successfully",
        newComment
    ))
})

const getAllVideoComment = asyncHandler(async(req, res) => {

    const {videoId} = req.params
    
    // pagination values:
    const {page = 1, limit = 10} = req.query;

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "no such video exist")
    }

    const videoComment = await Comment.aggregate([
        // pipeline 1: 
        // get all the video with the following id
        {
            $match: {
                video: mongoose.Types.ObjectId(videoId)
            }
        },

        // pipeline 2: 
        // owner details:
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },

        // pipeline 3: 
        // get the likes details: 
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },

        // pipeline 3: 
        // data cleanup
        {
            $addFields: {
                likeCounts: {
                    $size: "$likes"
                },

                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [
                                req.user?._id, 
                                "$likes.likedBy"
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            },
            
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseOnt(limit, 10)
    }

    // use aggregatePaginate
    // get only 10 documents per page
    // only little chunks of the documents from db

    // use Model.aggregatePaginate(aggr, options)
    const comments = await Comment.aggregatePaginate(
        videoComment,
        options
    )

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            "successfully fetched likes",
            comments
        )
    )
})

export {
    addComment,
    deleteComment,
    updateComment,
    getAllVideoComment
}