import mongoose, {Schema} from "mongoose"

// we need to write aggregation queries so for that use mongoose-aggregate-paginate-v2 package
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"


const videoSchema = new Schema(
    {
        videoFile: {
            type: String,
            required: true
        },
        thumbnail: {
            type: String, 
            required: true
        },

        title: {
            type: String, 
            required: true
        },

        description: {
            type: String, 
            required: true
        },

        duration: {
            type: Number,  // get from the third party site where you store video
            required: true
        },

        views: {
            type: Number,
            default: 0,
        },

        isPublished: {
            type: Boolean,
            default: true
        },

        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    },

    {
        timestamps: true
    }
)

// aggregation pipeline: 
videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video", videoSchema)