
import mongoose, {Schema} from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true     // this will make the searching in db easier
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    avatar: {
        type: String,
        required: true
    },

    dp: {
        type: String,
    },

    watchHistorty: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],

    password: {
        type: String,
        required: [true, 'password is required'],
    },

    refreshToken: {
        type: String
    }


}, {timestamps: true})

// use of mongoose pre hooks 
// this hook performs tha action written inside it just before saving to the db
// after you write the controller function and then you want to save something to db, 
// just before saving this code executes and hence we can encrypt the passwords here

// pre("functionality", callback)
// functionality -> when you want to use this pre eg: validate, save, remove, ...
// do not use arrow func in callback because arrow func do not have 'this' and we need it
// because we need to access the items in the userSchema
// encryption take time so async func
// this is a middleware job... in between  entering value and saving to database 
// so we need access to next-> so we can call it after finished so we can pass this flag forward
userSchema.pre("save", async function (next) {
    // pre hook runs everytime any changes happen to User field.
    // that means password will be encrypted everytime
    // we do not want that so use isModified function 

    // if password is not modified, dont do anything 
    if(!this.isModified("password")) return next()

    // otherwise: 

    // encrypt the current password and hashing is done for 10 rounds/iterations
    // asynchronus func so use await
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// check if the password entered by the user in frontend is correct or not
// use a custom method from the mongoose hooks for that

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
}

// generate access token:
userSchema.methods.generateAccessToken = function () {

    // use jwt.sign function 
    // jwt.sign(payload object, secret access token key, expiry in object)

    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRETS,

        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            // refresh token payload refreshes in quick succession so have less payload
            _id: this._id,
           
        },
        process.env.REFRESH_TOKEN_SECRETS,

        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)