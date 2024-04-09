import express from "express";
import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import {v2 as cloudinary} from "cloudinary"
import cookieParser from 'cookie-parser'
import { errormiddleware } from "./middlewares/error.js";
import userRouter from './routes/user.js'
import chatRoute from './routes/chats.js'
import adminRoute from "./routes/admin.js";
import {createServer} from 'http';
import {Server} from "socket.io"
import { v4 as uuid } from "uuid";
import cors from "cors"
import { getSockets } from "./lib/helper.js";
import { Message } from "./modals/message.js";
import { corsOption } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";
import { CHAT_JOINED, CHAT_LEFT, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";



dotenv.config({
    path:'./.env',
})


const mongoURI=process.env.MONGO_URI;
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION";
const port= process.env.port || 3000;
 const adminSecretKey= process.env.ADMIN_SECRET_KEY || "hemNim";
const userSocketIDs= new Map();
const onlineUsers = new Set();


connectDB(mongoURI);


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_SECRET
})



const app = express();
const server = createServer(app);
const io = new Server(server,{
    cors:corsOption
});

app.set("io",io);
// using middleWares here
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOption))



app.use("/api/v1/user",userRouter);
app.use("/api/v1/chat",chatRoute);
app.use("/api/v1/admin",adminRoute);

app.get('/',(req,res)=>{
    res.send("Home sweet home");
})


io.use((socket,next)=>{
    cookieParser()(socket.request,socket.request.res,async(err)=>{
        await socketAuthenticator(err,socket,next)
    })
})


io.on("connection",(socket)=>{


    const user=socket.user;

    userSocketIDs.set(user._id.toString(),socket.id);


    socket.on(NEW_MESSAGE,async({chatId,members,message})=>{
        const messgeForRealTime = {
            content:message,
            _id:uuid(),
            sender:{
                _id:user._id,
                name:user.name,
            },
            chat:chatId,
            createdAt: new Date().toISOString(),
        }

        const messgeForDB = {
            content:message,
            sender:user._id,
            chat:chatId,
        }



        const usersSocket = getSockets(members);
        io.to(usersSocket).emit(NEW_MESSAGE,{
            chatId,
            message:messgeForRealTime
        })
        io.to(usersSocket).emit(NEW_MESSAGE_ALERT,{
            chatId,
        })

        

       try {
        await Message.create(messgeForDB);
       } catch (error) {
        console.log(error);
       }
    })

    socket.on(START_TYPING,({members,chatId})=>{

        const memberSockets = getSockets();
  
        socket.to(memberSockets).emit(START_TYPING,{chatId})
    })
    socket.on(STOP_TYPING,({members,chatId})=>{

        const memberSockets = getSockets();

        socket.to(memberSockets).emit(STOP_TYPING,{chatId})
    })

    socket.on(CHAT_JOINED,({userId,members})=>{
        
        onlineUsers.add(userId.toString())
        const membersSocket = getSockets(members);

        io.to(membersSocket).emit(ONLINE_USERS,Array.from(onlineUsers))
    });
    
    socket.on(CHAT_LEFT,({userId,members})=>{
        onlineUsers.delete(userId.toString())
        const membersSocket = getSockets(members);

        io.to(membersSocket).emit(ONLINE_USERS,Array.from(onlineUsers))
    });

    socket.on("disconnect",()=>{
        // console.log("user disconnected");
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString())
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineUsers))
    })
    
})


app.use(errormiddleware);

server.listen(port,()=>{
    console.log(`Server is running in port ${port} and in ${process.env.NODE_ENV}`)
})


export {
    adminSecretKey,
    envMode,
    userSocketIDs
}