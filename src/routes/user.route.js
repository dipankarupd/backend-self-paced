import { registerUser } from "../controllers/user.controller.js";
import { Router } from "express";

const router = Router()

// control comes from app.js to here :

router.route("/register").post(registerUser)
// app url: http://localhost:8000/api/v1/users/register

export default router;  