import { ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { tryCatch } from "../middlewares/error.js";
import { Chat } from "../modals/chat.js";
import { Message } from "../modals/message.js";
import { User } from "../modals/user.js";
import { errorHandler } from "../utils/errorHandler.js";
import { deleteFilesFromCloude, emmitEvent, uploadFilesToCloude } from "../utils/features.js";


const newGroupChat = tryCatch(async(req,res,next)=>{
    const {name,members} = req.body;


    if(members.length < 2){
        return next(new errorHandler("Group chat must have at least 3 members",400));
    }
    const allMembers=[...members,req.user];
    await Chat.create({
        name,groupChat:true,creator:req.user,members:allMembers
    });

    emmitEvent(req,ALERT,allMembers,`Welcome to ${name} group`);
    emmitEvent(req,REFETCH_CHATS,members)

   return res.status(200).json("Group has been created");
})



const getMyChats = tryCatch(async(req,res,next)=>{
    const chats = await Chat.find({members:req.user}).populate("members" ,"name avatar")

   const transformedChats = chats.map(({_id,name,members,groupChat})=>{
    const otherMember = getOtherMember(members,req.user);
    return {
        _id,
        groupChat,
        name: groupChat? name: otherMember.name,
        avatar:groupChat? members.slice(0,3).map(({avatar})=> avatar.url):[otherMember.avatar.url],
        members:members.reduce((prev,curr)=>{
            if(curr._id.toString()!== req.user.toString()){
                prev.push(curr._id)
            }
            return prev;
        },[]),
    }
   })

   return res.status(200).json({
    success:true,
    chats:transformedChats,
   });
})



const getMyGroups= tryCatch(
    async(req,res)=>{
        const chats = await Chat.find({members:req.user,groupChat:true,creator:req.user}).populate("members", "name avatar");
        // console.log(chats);
        const groups = chats.map(({_id,groupChat,name,members})=>({
            _id,
            name,
            groupChat,
            avatar: members.slice(0,3).map(({avatar})=> avatar.url)
        }) )

        return res.status(200).json({
            success:true,
            groups,
        })
    }
)


const addMembers= tryCatch(
    async(req,res,next)=>{
        const {chatId,members}=req.body;
        const chat = await Chat.findById(chatId);
        if(!chat){
            return next(new errorHandler("Chat not found",404));
        }

        if(!members || members.length<1){
            return next(new errorHandler("Please provide members",400))
        }

        if(!chat.groupChat){
            return next(new errorHandler("This is not a group chat",400));
        }


        if(chat.creator.toString()!==req.user.toString()){
            return next(new errorHandler("You are not allowed to add members",403));
        }

        
        const allNewPeomise = members.map((i)=>User.findById(i,"name"));
        

        const allNewMembers=await Promise.all(allNewPeomise);

        const uniqueMembers = allNewMembers.filter((i)=> !chat.members.includes(i._id.toString()));

        chat.members.push(...uniqueMembers.map((i)=> i._id));
        

        if(chat.members.length>100){
            return next(new errorHandler("Members limit reached",400));
        }
        await chat.save();

        const allUsers = allNewMembers.map((i)=> i.name).join(",");



        emmitEvent(
            req,
            ALERT,
            chat.members,
            `${allUsers} has been added to the group`,
        )

        emmitEvent(req,REFETCH_CHATS,chat.members);

        return res.status(200).json({
            success:true,
            message:"Members Added Successfully",
        })


    }
)
const removeMember = tryCatch(
    async(req,res,next)=>{
        const {userId,chatId} = req.body;
        const [chat,userThatWillBeremoved] = await Promise.all([
            Chat.findById(chatId),
            User.findById(userId,"name")
        ]) ;

        if(!chat){
            return next(new errorHandler("Chat not found",404));
        }

        if(!chat.groupChat){
            return next(new errorHandler("This is not a group chat",400));
        }


        if(chat.creator.toString()!==req.user.toString()){
            return next(new errorHandler("You are not allowed to remove members",403));
        }

        

        if(chat.members.length<=3){
            return next(new errorHandler("Group must atleast have 3 members",400));
        }

        const allChatMembers = chat.members.map((i)=> i.toString())

        chat.members = chat.members.filter((member)=> member.toString()!== userId.toString());

        await chat.save();

        emmitEvent(
            req,
            ALERT,
            chat.members,
            {
                message:`${userThatWillBeremoved.name} as been removed from the group`,
                chatId
            }
        )

        emmitEvent(req,REFETCH_CHATS,allChatMembers);
        return res.status(200).json({
            success:true,
            message:"Member Removed Successfully",
        })


    }
)


const leaveGroup=tryCatch(
    async(req,res,next)=>{
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);

        if(!chat){
            return next(new errorHandler("Chat not found",404));
        }

        if(!chat.groupChat){
            return next(new errorHandler("This is not a group chat",400));
        }


        const remainingMembers = chat.members.filter((member)=> member.toString() !== req.user.toString());

        if(remainingMembers.length < 3){
            return next(new errorHandler("Group must atleast have 3 members",400));
        }

        

        if(chat.creator.toString() === req.user.toString()){
            const randomElement = Math.floor(Math.random()*remainingMembers.length);
            const newCreator = remainingMembers[randomElement];
            chat.creator = newCreator;
        }


        chat.members = remainingMembers;


        const [user] = await Promise.all([User.findById(req.use),chat.save()]);

        emmitEvent(
            req,
            ALERT,
            chat.members,
            {
                message:`${user} has left the group`,
                chatId
            }
        )

        return res.status(200).json({
            success:true,
            message:"Group left SuccesFully",
        })

    }
)


const sendAttachment= tryCatch(
    async(req,res,next)=>{

        const {chatId} = req.body;
        const files = req.files || [];

        if(files.length<1){
            return next(new errorHandler("Please Upload Attachments",400))
        }

        if(files.length>5){
            return next(new errorHandler("Files can't be more then 5",400))
        }



        const [chat,me] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.user,"name avatar")
        ]);

        if(!chat){
            return next(new errorHandler("Chat not found",404));

        }

        

        if(files.length<1){
            return next(new errorHandler("Please provide attachments",400))
        }

        // upload files from cloude
        const attachments =await uploadFilesToCloude(files);

        const messageForDB={
            content:"",
            attachments,
            sender: me._id,
             chat:chatId,


        };

        
        const messageForRealTime={
            ...messageForDB,
            sender: {
                _id:me._id,
                name:me.name,
            },
        };

        const message = await Message.create(messageForDB);

        emmitEvent(
            req,
            NEW_MESSAGE,chat.members,{
                message:messageForRealTime,
                chatId,
            }
        );

        emmitEvent(
            req,
            NEW_MESSAGE_ALERT,chat.members,{
                chatId,
            }
        )


        return res.status(200).json({
            success:true,
            message,
        })
    }
)



const getChatDetails = tryCatch(
    async(req,res,next)=>{
        if(req.query.populate === "true"){

            const chat = await Chat.findById(req.params.id).populate("members","name avatar").lean();
            if(!chat){
                return next(new errorHandler("Chat not found",404));
    
            }


          
            chat.members = chat.members.map(({_id,name,avatar})=>({
                _id,
                name,
                avatar: avatar.url,
            }))


            return res.status(200).json({
                success:true,
                chat,
            })

        }else{
            const chat = await Chat.findById(req.params.id);
            if(!chat){
                return next(new errorHandler("Chat not found",404));
    
            }

            return res.status(200).json({
                success:true,
                chat,
            })

        }
    }
)


const renameGroup= tryCatch(
    async(req,res,next)=>{
        const chatId= req.params.id;
        const {name}= req.body;
        const chat = await Chat.findById(chatId);
        if(!chat){
            return next(new errorHandler("Chat not found",404));
        }

        if(!chat.groupChat){
            return next(new errorHandler("This is not a group chat",400));
        }


        if(chat.creator.toString()!==req.user.toString()){
            return next(new errorHandler("You are not allowed to edit name",403));
        }

        chat.name = name;

        await chat.save();

        emmitEvent(req,REFETCH_CHATS,chat.members);

        return res.status(200).json({
            success:true,
            message:"Group name changed successfully",
        }) 

        
        
    }
)

const deleteChat= tryCatch(
    async(req,res,next)=>{
        
        const chatId= req.params.id;

        
        
        const chat= await Chat.findById(chatId);
        if(!chat){
            return next(new errorHandler("Chat not found",404));
        }
        const members = chat.members;
        

        if(chat.groupChat && chat.creator.toString() !== req.user.toString()){
            return next(new errorHandler("You are not allowed to delete the chat",403));
        }

        if(chat.groupChat && !chat.members.includes(req.user.toString())){
            return next(new errorHandler("You are not allowed to delete the chat",403));
        }

        // delete all messages and attachments from cloude
        

        const messagesWithAttachments = await Message.find({
            chat:chatId,
            attachments:{$exists: true, $ne: []},
        })

        const public_ids=[];
        
        messagesWithAttachments.forEach(({attachments})=>{
            attachments.forEach(({public_id})=> public_ids.push(public_id));
        });

        await Promise.all([
            deleteFilesFromCloude(public_ids),
            chat.deleteOne(),
            Message.deleteMany({chat:chatId}),
        ])
        

        emmitEvent(req,REFETCH_CHATS, members);

        return res.status(200).json({
            success:true,
            message:"Chat deleted successsfully",
        }) 



    }
)


const getMessages=tryCatch(async(req,res,next)=>{
    const chatId = req.params.id;

    const {page=1} = req.query;

    const limit=20;
    const skip= (page-1)*limit;

    const chat  = await Chat.findById(chatId);
    if(!chat) return next(new errorHandler("Chat not found",404))


    if(!chat.members.includes(req.user.toString())) return next(new errorHandler("You are not allowed to access this chat",403))
    const [messages,totalMessagesCount] = await Promise.all([
        Message.find({chat:chatId}).sort({createdAt:-1}).skip(skip).limit(limit).populate("sender","name").lean(),
        Message.countDocuments({chat:chatId})
    ])

    const totalpages = Math.ceil(totalMessagesCount/limit);


    // console.log("lolme",messages.reverse());

    return res.status(200).json({
        success:true,
        message:messages.reverse(),
        totalpages,
    }) 

})



export {newGroupChat,getMyChats,getMyGroups,addMembers,removeMember,leaveGroup,sendAttachment,getChatDetails,renameGroup,deleteChat,getMessages};