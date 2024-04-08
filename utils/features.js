import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import {v2  as cloudinary} from "cloudinary"
import {v4 as uuid} from "uuid"
import { getBase64, getSockets } from "../lib/helper.js"

const cookieOptions={
    maxAge:15*24*60*60*1000,
    sameSite:"none",
    httpOnly:true,
    secure:true,
}

const connectDB=(uri)=>{
    mongoose.connect(uri,{dbName:"ChatApp"}).then((data)=>console.log(`Connected to DB: ${data.connection.host}`)).catch((err)=>{
        throw err;
    })
}

const sendToken =(res,user,code,message)=>{
    const token= jwt.sign({_id:user._id},process.env.JWR_SECRET);
    return res.status(code).cookie("Chat-App",token,cookieOptions).json({
        success:true,
        user,
        message:message
    })
};


const emmitEvent=(req,event,users,data)=>{
    let io=req.app.get("io");
    const usersSocket = getSockets(users);
    io.to(usersSocket).emit(event,data)
    console.log("Emmiting event", event);
}


const uploadFilesToCloude=async(files=[])=>{
    const uploadPromises = files.map((file)=>{
        return new Promise((resolve,reject)=>{
            cloudinary.uploader.upload(
                getBase64(file),
                {
                resource_type:"auto",
                public_id: uuid()
            },
            (error,result)=>{
                if(error) return reject(error);
                resolve(result)
            })
        })
    })

    try {
        const results = await Promise.all(uploadPromises);
        const fromattedResult = results.map((result)=>({
            public_id:result.public_id,
            url:result.secure_url
        }));
        return fromattedResult;
    } catch (error) {
        console.error(error);
        throw new Error("Error uploading files in Cloudnary",error)
    }
}

const deleteFilesFromCloude=async(public_ids)=>{

}

export {connectDB,sendToken,cookieOptions,emmitEvent,deleteFilesFromCloude,uploadFilesToCloude};