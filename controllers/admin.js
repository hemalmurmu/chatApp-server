import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../modals/chat.js";
import { Message } from "../modals/message.js";
import { User } from "../modals/user.js";
import { errorHandler } from "../utils/errorHandler.js";
import jwt from "jsonwebtoken"
import { cookieOptions } from "../utils/features.js";
import { adminSecretKey } from "../app.js";

const getAdminData = tryCatch(
    async(req,res,next)=>{
        return res.status(200).json({
            admin:true,
        })
    }
)


const adminLogin=tryCatch(
    async(req,res,next)=>{
        const {secretKey} = req.body;

        const isMatch = secretKey=== adminSecretKey;

        if(!isMatch){
            return next(new errorHandler("Invalid Key",401));
        }

        const token = jwt.sign(secretKey,process.env.JWR_SECRET);

        return res.status(200).cookie("chat-pp-admin",token,{...cookieOptions,maxAge:1000*60*15}).json({
            success:true,
            message:"Authenticated Successfully"
        })
    }
)


const adminLogout=tryCatch(
    async(req,res,next)=>{
        return res.status(200).cookie("chat-pp-admin","",{...cookieOptions,maxAge:0}).json({
            success:true,
            message:"Logout Successfully"
        })
    }
)







const getAllUsers = tryCatch(
    async(req,res,next)=>{
        const users = await User.find({});

        const transformData = await Promise.all(
            users.map( async({name,_id,avatar,username})=>{


                const [groups,friends]= await Promise.all([
                    Chat.countDocuments({groupChat:true,members:_id}),
                    Chat.countDocuments({groupChat:false,members:_id})
                ]) 
    
    
                return { name,
                    username,
                    _id,
                    avatar:avatar.url,
                    groups,
                    friends
                }
            })
        )

       
        return res.status(200).json({
            success:true,
            data:transformData
        })
    }
)


const getAllChats = tryCatch(
    async(req,res,next)=>{
        const chats = await Chat.find({}).populate("members","name avatar").populate("creator", "name avatar");
        

        const transformData = await Promise.all(
            chats.map( async({members,groupChat,name,creator,_id})=>{
                const totalMessages = await Message.countDocuments({chadId:_id});
                return {
                    _id,
                    groupChat,
                    name,
                    avatar: members.slice(0,3).map((member)=> member.avatar.url),
                    members : members.map(({name,_id,avatar})=>({
                        _id,
                        name,
                        avatar:avatar.url,
                    }
                    )),
                    creator:{
                        name: creator?.name|| "None",
                        avatar: creator?.avatar.url|| "",
                    },
                    totalMembers: members.length,
                    totalMessages,
                }
                
            })
        )


        return res.status(200).json({
            success:true,
            data:transformData
        })
    }
)


const getAllMessages = tryCatch(
    async(req,res,next)=>{
        const messages = await Message.find({}).populate("sender","name avatar").populate("chat", "groupChat");


        const transformData = messages.map(({content,attachments,_id,sender,createdAt,chat})=>({
            _id,
            attachments,
            content,
            createdAt,
            sender:{
                _id:sender._id,
                name:sender.name,
                avatar:sender.avatar.url
            },
            chat:chat._id,
            groupChat: chat.groupChat,
        }))
        return res.status(200).json({
            success:true,
            data:transformData
        })
    }
)


const getDashBoardStats=tryCatch(
    async(req,res,next)=>{
        
        const [groupsCount,usersCount,messagesCount,totalChatCount]=await Promise.all([
            Chat.countDocuments({groupChat:true}),
            User.countDocuments(),
            Message.countDocuments(),
            Chat.countDocuments()
        ])



        const today = new Date();
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate()-7);


        const last7DaysMessages = await Message.find({
            createdAt:{
                $gte:last7Days,
                $lte:today,
            }
        }).select("createdAt");


        const messages = new Array(7).fill(0);
        const dayInMilisec= 1000*60*60*24;
        last7DaysMessages.forEach((message)=>{
            const indexAp= (today.getTime()- message.createdAt.getTime())/dayInMilisec;
            const index = Math.floor(indexAp);

            messages[6-index]++;
        })

        const stats={
            groupsCount,usersCount,messagesCount,totalChatCount,messageChart:messages
        }
        
      
        return res.status(200).json({
            success:true,
            stats
        })
    }
)


export {getAllUsers,getAllChats,getAllMessages,getDashBoardStats,adminLogin,adminLogout,getAdminData}
