import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiRespone.js";
import jwt from "jsonwebtoken";

//Creating a method for generating access and refresh tokens
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
};





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
    const existedUser = await User.findOne({
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
        coverImage : cover?.url || "",
        email,
        password,
        username : username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select(
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
    if(!username && !email) {
        throw new ApiError(400, "Username or Email is required");
    }

    const user = await User.findOne({
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
    .cookie("refreshToken", refreshToken, options)
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
const logoutUser = asyncHandler(async(req, res) => {
    //req.user._id is available due to auth middleware
    await User.findByIdAndUpdate(
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


//creating endpoint for generation of new access token based on the previously created refresh token;
const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError (401, "Invalid refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError (401, "Refresh Token is expired or used")
        }
    
    
        //if all verified 
        const options = {
            httpOnly: true, 
            secure: true
        }
    
        const {accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken : newrefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});


// method to change the current password
const changeCurrentPassword  = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body;

    //extract the user from req.user which you have access to due to auth middleware
    const user = await User.findById(req.user?._id);

    //check the oldpassword and the newpassword using isPasswordCorrect method which was defined in the usermodel
    //You have access to isPasswordCorrect method because of the model user you have recieved in the previous step 
    const isPasswordCorrect = await user.isPasswordCorrect;

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {},
        "Password Changed Successfully"
    ));
});


// tke the current user
const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "current user fetched successfully"
        ))
});


// update the account details
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            fullName,
            email
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Detail updese successfully"));

});

//updating the user avatar
const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path;
    
    if(!avatarLocalPath)
    {
       throw new  ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url)
    {
       throw new  ApiError(400, "Error while Uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.User?._id,
        {
            $set: {
                avatar : avatar.url
            }
        },
        {new :true}
    ).select("-password")

    //Create a utility for deleting an old image from the cloudinary

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar Image updated Succesfully"
        )
    )
});


//upadatin the user cover image
const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path;
    
    if(!coverImageLocalPath)
    {
       throw new  ApiError(400, "Cover Image file is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url)
    {
       throw new  ApiError(400, "Error while Uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new :true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Cover Image updated Succesfully"
        )
    )
});


//
const getUserChannelProfile = asyncHandler(async(req, res) => {

    //get username from the params of req
    const {username} = req.params;

    //check and username
    if(!username?.trim()) {
        throw new ApiError(400, "username is missing");
    }

    //find the id creation of aggregation pipeline
    const channel =  await User.aggregate([
        {
            $match : {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"

            }
        },
        {
            $lookup: {
                from: "subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriber"
            }
        },
        {
            $addFields: {
                subscibersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "subscribers"]},
                        then: true,
                        else: false
                    }
                }                   
                
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);
    //what datatype does aggregate returns
    // check this using console.log, mostly they return array
    // but only the first index is usefull
    if(!channel?.length){
        throw new ApiError(404, "channel does not exist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "user channer fetched successfully")
    );

});

//second nested aggregation pipeline to get watchhistory
const getWatchHistory = asyncHandler(async(req, res)=>{

    const user = await User.aggregate([
        {
            $match: {
                // mongoose does not work and  the entire code of the aggregaiton pipeline goes directly
                //so we have to intentionally call the moongoose method
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchhistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch History fetched successfully"
        )
    )

});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};




//generated by chatgpt for debugging of accessandrefreshtoken bugs

// const generateAccessAndRefreshTokens = async (userId) => {
//     try {
//         const user = await User.findById(userId);

//         console.log("TOKEN GEN USER:", user);
//         console.log("ENV CHECK:", {
//             ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
//             ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY,
//             REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
//             REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY,
//         });

//         if (!user) {
//             throw new Error("User not found in token generator");
//         }

//         if (!user.generateAccessToken || !user.generateRefreshToken) {
//             throw new Error("Token methods missing on user model");
//         }

//         const accessToken = user.generateAccessToken();
//         const refreshToken = user.generateRefreshToken();

//         user.refreshToken = refreshToken;
//         await user.save({ validateBeforeSave: false });

//         return { accessToken, refreshToken };
//     } catch (error) {
//         console.error("🔥 TOKEN GENERATION ERROR:", error);
//         throw error; // IMPORTANT: rethrow the real error
//     }
// };