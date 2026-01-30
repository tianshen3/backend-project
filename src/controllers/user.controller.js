import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiRespone.js";

//Creating a method for generating access and refrest tokens
const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        // when you are try to use user.save it is method of moongoose therfore it checks for all the required object in the user model but 
        // yu have created these token only by userid there are no other parameters therefore it can cause errror 
        // therefore wer go for validatebeforesave as false; 
        await user.save({ validateBeforeSave : false});

        return {accessToken, refreshToken};
    } catch (error){
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}



//This is for creating user
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

    const createdUser = await User.findBYId(user._id).select(
        "-password -refreshToken"
    );


    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while creating a user")
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Regiestered Successfully")
    )
} );


//login of user
const loginUser = asyncHandler(async (req, res) =>{
    //req body -> data
    // username or email
    // find the user
    // password check ? accesstoken and refrestoken : user not found
    // send cookies  and response in succesfull completion
    const {email,  username, password } = req.body;
    
    // checking for username or email
    if(!username || !email) {
        throw new ApiError(400, "Username or Email is required");
    }

    const user =  User.findOne({
        $or: [{username}, {email}]
    });

    if(!user){
        throw new ApiError(400, "User does not exist");
    }

    //checking password
    const isPasswordValid = await user.isPasswordCorrect(password);
    
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials");
    }

    //calling method of generating of refresh and access token
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    //creating new user instance which has the access and refresh tokens and whose password field is off
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // sending these tokens in cookies
    const options = {
        httpOnly : true,
        secure : true
    }
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refresToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "User logged in Successfully"
        )
    )

});


//logout of user
const logout = asyncHandler(async(req, res) => {
    //req.user._id is available due to auth middleware
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});


export {
    registerUser,
    loginUser,
    logout
};