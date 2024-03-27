import multer from "multer";

// from the doc:
// link: https://github.com/expressjs/multer

const storage = multer.diskStorage({
    destination: await function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })
  
  export const upload = multer({ storage: storage })


  /*
  In summary, when a file is uploaded through an HTTP request to the server, 
  Multer middleware stores it temporarily on the local server in the ./public/temp directory. 
  Then, the uploadOnCloud function from cloudinary.service.js is called with the path of the 
  temporarily stored file. This function attempts to upload the file to Cloudinary. If successful, 
  it returns the Cloudinary response; otherwise, it cleans up the local server by removing the 
  temporarily stored file and returns null.
  */