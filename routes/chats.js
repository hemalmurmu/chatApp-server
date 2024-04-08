import express from "express";
import { isaAuthencticated } from "../middlewares/auth.js";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMember, renameGroup, sendAttachment } from "../controllers/chat.js";
import { attachmentMulter } from "../middlewares/multer.js";
import { addmemberValidator, chatIdValidator, getMessageValidator, groupchatValidator, leaveGroupValidator, removeMemberValidator, renameValidator, sentAttachmentsValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();
// after Login 
app.use(isaAuthencticated)

app.post("/new",groupchatValidator(),validateHandler,newGroupChat);
app.get('/my',getMyChats);
app.get("/my/groups",getMyGroups);
app.put("/addmembers",addmemberValidator(),validateHandler,addMembers);
app.put("/remove",removeMemberValidator(),validateHandler,removeMember);
app.delete("/leave/:id",leaveGroupValidator(),validateHandler,leaveGroup);

app.post('/message',attachmentMulter,sentAttachmentsValidator(),validateHandler,sendAttachment);

app.get("/message/:id",getMessageValidator(),validateHandler,getMessages);


app.route("/:id").get(chatIdValidator(),validateHandler,getChatDetails).put(renameValidator(),validateHandler,renameGroup).delete(chatIdValidator(),validateHandler,deleteChat);



export default app;