import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber : {
        type : Schema.Types.ObjectId, //the one who is subscribing my channel
        ref : "User"
    },
    channel : {
        type : Schema.Types.ObjectId,// the one whose channel i am subscribing
        ref : "User"
    }
},{timestamps : true});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);