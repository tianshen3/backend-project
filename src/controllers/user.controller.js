import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";

const registerUser = asyncHandler( async(req, res) => {
   //get user details from the frontend or postman
   //validation -- not empty
   //check if your user already exists : username, email
   //check for images, check for avatar
   //upload them to cloudinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field form response
   // check for user creation
   // retrun response


   const {fullName, email, username, password} = req.body;
   console.log("email :", email);

   // beginner friendly for using multiple ifs to check for the condition
//    if( fullName === "") {
//     throw new ApiError(400, "fullName  is required")
//    }


    if(
        [fullName, email, username, password].some((field) =>
        field?.trim() === "" )
    ){
        throw new ApiError(400, "All fields are required")
    }

    //existed user /email checking
    const existedUser = User.findOne({
        $or:[{ username }, { email }]
    });
    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }



    //file handling from multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError("400", "Avatar file not found");
    }

    //uploading file on the cloudinary server
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const cover = await uploadOnCloudinary(coverImageLocalPath);

    // check whether avatar is uploaded
    if(!avatar){
        throw new ApiError("400", "Avatar not uploaded");
    }

    //creating object in db;

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email ,
        password,
        username : username.toLowerCase()
    });


} );

export {registerUser};