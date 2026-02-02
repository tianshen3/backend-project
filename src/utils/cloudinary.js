import {v2 as cloudinary} from "cloudinary";
import fs from "fs"; 


cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        // if local file path not found then in that case just simply return
        if(!localFilePath) return null;

        //uploadig the file
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"
        });

        //if file is uploaded successfully
        console.log("File is uploaded on Cloudinary", response.url);

        // this is returned to the user
        return response;

    } catch (error) {
        console.error("Cloudinary upload failed:", error.message);
        return null;
    } finally {
        // ✅ ALWAYS clean up safely
        if (localFilePath && fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
    }
};

export {uploadOnCloudinary};