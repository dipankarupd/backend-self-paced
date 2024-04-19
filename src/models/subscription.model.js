import mongoose, {Schema} from "mongoose"

const subscriptionSchema = new Schema(

    {
        subscriber: {
            // one who subscribes
            type: Schema.Types.ObjectId,
            ref: "User"
        },

        channel: {
            // subscribing to whom
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        

    }, 
    
    {
        timestamps: true
    }
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)