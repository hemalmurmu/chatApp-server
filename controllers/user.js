import { compare } from "bcrypt";
import {User} from "../modals/user.js"
import { cookieOptions, emmitEvent, sendToken, uploadFilesToCloude } from "../utils/features.js";
import { tryCatch } from "../middlewares/error.js";
import { errorHandler } from "../utils/errorHandler.js";
import { Chat } from "../modals/chat.js";
import { Request } from "../modals/request.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";


// create a user and save in the cookie
const newUsers=tryCatch(
    async(req,res,next)=>{
        const {name,username,password,bio} = req.body;
        const file = req.file;
        if(!file){
            next(new errorHandler("Plesase upload avatar",400));
        }

        const result = await uploadFilesToCloude([file]);
    
        const avatar={
            public_id:result[0].public_id,
            url:result[0].url,
        };
        const user = await User.create({name,username, password, avatar,bio})
    
        sendToken(res,user,201,"User created")
    }
)

 


const login = tryCatch(async(req,res,next)=>{
    const {username,password}=req.body;

    const user = await User.findOne({username}).select("+password");
    if(!user){
        return next(new errorHandler("invalid Username or Password",404));
    }

    const isMatched = await compare(password, user.password);
    
    if(!isMatched){
        return next(new errorHandler("Invalid Username or Password",404)); 
    }
    sendToken(res,user,200,`Welcom Back ${user.name}`)
})


const getMyprofile=tryCatch(async(req,res)=>{
    const user=await User.findById(req.user);
    res.status(200).json({
        success:true,
        user:user,
    })
})


const logout=tryCatch(async(req,res)=>{
    res.status(200).cookie("Chat-App","",{...cookieOptions,maxAge:0}).json({
        success:true,
        message:"logged out",
    })
})

const searchUser=tryCatch(async(req,res)=>{


    const {name=""}  = req.query;

    const chatMembers =await Chat.find({groupChat:false,members: req.user});

    const members = chatMembers.flatMap((chatMember)=> chatMember.members)

    const remainingMembers =await User.find({
        _id: {$nin: members},
        name:{ $regex:name, $options:"i"},
    })

    const searchUsersList =  remainingMembers.map(({name,_id,avatar})=>({
        _id,
        name,
        avatar: avatar.url,
    }))


    
    return res.status(200).json({
        success:true,
        searchUsersList,
    })
})


const sendFriendRequest=tryCatch(async(req,res,next)=>{

    const{userId} = req.body;

    const request =await Request.findOne({
        $or:[
            {sender:req.user,receiver:userId},
            {sender:userId,receiver:req.user},
        ],
    });

    if(request){
        return next(new errorHandler("Request already sent",400));
    }

    await Request.create({
        sender:req.user,
        receiver:userId,
    })

    emmitEvent(req,NEW_REQUEST,[userId]);

    return res.status(200).json({
        success:true,
        message:"friend request sent",
    })
})


const acceptFriendRequest=tryCatch(async(req,res,next)=>{

    const{requestId,accept} = req.body;
    const request =await Request.findById(requestId).populate("sender","name").populate("receiver","name");

    if(!request){
        return next(new errorHandler("Request not found",400));
    }

    if(request.receiver._id.toString()!== req.user.toString()){
        return next(new errorHandler("You  are not authprised to accept this request"));
    }

    if(!accept){
        await request.deleteOne();

        return  res.status(200).json({
            success:true,
            message:"Friend Request Rejected",
        })
    }

    const members= [request.sender._id,request.receiver._id];

    await Promise.all([
        Chat.create({
            members,
            name:`${request.sender.name}-${request.receiver.name}`,
        }),
        request.deleteOne()
    ])

    emmitEvent(req,REFETCH_CHATS,members);

    return res.status(200).json({
        success:true,
        message:"Friend Request Accepted",
        senderId:request.sender._id,
    })
});


const getNotofications=tryCatch(
    async(req,res,next)=>{
        const requests = await Request.find({
            receiver: req.user
        }).populate("sender","name avatar");


        const allRequest = requests.map(({_id,sender})=>({
            _id,
            sender:{
                _id:sender._id,
                name:sender.name,
                avatar:sender.avatar.url,
            }
        }))


        return res.status(200).json({
            success:true,
            allRequest,
        })
    }
)


const getMyFriends=tryCatch(
    async(req,res,next)=>{

        const chatId= req.query.chatId;


        const chats = await Chat.find({
            members: req.user,
            groupChat:false,
        }).populate("members","name avatar");

        const friends = chats.map(({members})=>{
            const otherMember = getOtherMember(members,req.user);

            return {
                _id:otherMember._id,
                name:otherMember.name,
                avatar: otherMember.avatar.url
            }
        })


        if(chatId){
            const chat = await Chat.findById(chatId);
            const availableFriends= friends.filter((friend)=> !chat.members.includes(friend._id));
            return res.status(200).json({
                success:true,
                friends:availableFriends,
            })
        }else{
            return res.status(200).json({
                success:true,
                friends,
            })
        }

    }
)


export { login,newUsers,getMyprofile,logout,searchUser,sendFriendRequest,acceptFriendRequest,getNotofications,getMyFriends}