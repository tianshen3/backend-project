import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        index : true
    },
    email : {
        type : String,  
        required : true, 
        unique : true, 
        lowercase : true, 
        trim : true,
    },
    fullName : {
        type : String,
        required : true, 
        trim : true, 
        index : true
    },
    avatar : {
        type : String, //cloudinary url in form of String 
        required : true,
    },
    coverImage : {
        type : String, // cloudinary url in form of string
    },
    watchHistroy : [ // an arrayy of objects which contain object id of videos
        {
            type : Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    password : {
        type : String,
        required : [true, 'Password is required']
    },
    refreshToken : {
        type : String,

    }
},{timestamps : true});


//for password encryption
userSchema.pre("save", async function () {
    if(!this.isModified("password")) return ;

    this.password = await bcrypt.hash(this.password, 10)
    
});

//designing custom methods
userSchema.methods.isPasswordCorrect = async function
(password){
    return await bcrypt.compare(password, this.password)
};


//creating method for generating a access token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
    {
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn : process.env.REFRESH_TOKEN_EXPIRY
    }
    )
}

//creating method for generating a access token
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
    {
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
    }
    )
}

export const User = mongoose.model("User", userSchema);