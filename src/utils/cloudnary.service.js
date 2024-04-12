import {v2 as cloudinary} from 'cloudinary';
import fs, { unlink } from "fs"


// cloudinary configuration:
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET_KEY,  
});


// file uploading:

const uploadOnCloud = async (localPath) => {
    try {

        if (!localPath) {
            return null
        }

        // upload on cloudinary
        const response = await cloudinary.uploader.upload(localPath, {
            resource_type: "auto"
        })
        // file uploaded successfully:
        // console.log("File uploaded successfully on cloud ", response.url);

        // remove the uploaded file from the local path on success
        fs.unlinkSync(localPath)

        return response

    }
    catch(e) {
        // if the upload failed, the local file should be removed from the server
        // to prevent load on the server and prevent the malicious file in there
        // to remove the file, we do not delete it, we will unlink the given file from our fs
        fs.unlinkSync(localPath)
        return null
    }
}

export {uploadOnCloud}