import express from "express";
import { getAllChats, getAllMessages, getAllUsers, getDashBoardStats,adminLogin, adminLogout, getAdminData } from "../controllers/admin.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { isAdminOnly } from "../middlewares/auth.js";


const app = express.Router();



app.post("/verify",adminLoginValidator(),validateHandler,adminLogin);

app.get("/logout",adminLogout);


app.use(isAdminOnly)

app.get("/",getAdminData);

app.get("/users",getAllUsers);

app.get("/chats",getAllChats);

app.get("/messages",getAllMessages);

app.get("/stats",getDashBoardStats);



export default app;