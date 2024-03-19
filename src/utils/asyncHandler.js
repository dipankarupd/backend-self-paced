
const asyncHandler = (reqHandler) => 
    (req, res, next) => {
        Promise.resolve(reqHandler(req,res,next))
        .catch((err) => next(err))
    }




// another method to handle using try and catch:

// asyncHandler is a function which takes a func as arg and returns an async func
// used as kind of middleware
// const asyncHandler = (func) => async (req, res, next) => {
    
//     try {
//         await func(req, res, next)
//     }
    
//     catch(e) {
//         res.status(e.code || 500).json({
//             success: false,
//             message: e.message
//         })  
//     }
// }