import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware"
import { createTweet, deleteTweet, getUserTweets, updateTweet } from "../controllers/tweet.controller"

const router = Router()

// apply verifyJWT to all the endpoints
router.use(verifyJWT, upload.none()); 

router.route("/").post(createTweet)
router.route("update/:tweetId").patch(updateTweet)
router.route("delete/:tweetId").delete(deleteTweet)
router.route("getTweets/:userId").get(getUserTweets)

export default router