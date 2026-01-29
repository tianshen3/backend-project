import mongoose, {Schema} from "mongooose";
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
    fullname : {
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
userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next();
})

//designing custom methods
userSchema.methods.isPasswordCorrect = async function
(password){
    return await bcrypt.compare(password, this.password)
}


//creating method for generating a access token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
    {
        _id : this_id,
        email : this.email,
        username : this.username,
        fullname : this.fullname
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn : process.env.REFREST_TOKEN_EXPIRY
    }
    )
}

//creating method for generating a access token
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
    {
        _id : this_id,
        email : this.email,
        username : this.username,
        fullname : this.fullname
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
    }
    )
}

export const User = mongoose.model("User", userSchema);