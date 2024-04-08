import { errorHandler } from "../utils/errorHandler.js";

import jwt from "jsonwebtoken"
import { adminSecretKey } from "../app.js";
import { Chat_TOKEN } from "../constants/config.js";
import { User } from "../modals/user.js";


const isaAuthencticated = (req,res,next)=>{
    const token = req.cookies[Chat_TOKEN];
    if(!token){
        return next(new errorHandler("Please login to Continue",401));
    }

    const decodedData = jwt.verify(token,process.env.JWR_SECRET)

    req.user = decodedData._id;

    next();
}

const isAdminOnly = (req,res,next)=>{
    const token = req.cookies["chat-pp-admin"];

    if(!token){
        return next(new errorHandler("Only Admin can access this route"));
    }
    const secretKey = jwt.verify(token,process.env.JWR_SECRET)
        const isMatch = secretKey=== adminSecretKey;

        if(!isMatch){
            return next(new errorHandler("Invalid Key",401));
        }
    next();
}


const socketAuthenticator=async(err,socket,next)=>{
    try {
        if(err){
            return next(err);
        }

        const authToken = socket.request.cookies[Chat_TOKEN];

        if(!authToken){
            return next(new errorHandler("PLEASE LOGIN TO ACCESS THIS ROUTE",401))
        }

        const decodedData = jwt.verify(authToken,process.env.JWR_SECRET);

        const user = await User.findById(decodedData._id);
        if(!user){
            return next(new errorHandler("PLEASE LOGIN TO ACCESS THIS ROUTE",401))
        }
        socket.user = user;
        return next();
        
    } catch (error) {
        console.log(error)
        return next(new errorHandler("PLEASE LOGIN TO ACCESS THIS ROUTE",401))
    }
}

export { isaAuthencticated,isAdminOnly,socketAuthenticator}