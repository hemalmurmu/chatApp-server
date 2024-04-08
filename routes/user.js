import express from "express";
import { acceptFriendRequest, getMyFriends, getMyprofile, getNotofications, login, logout, newUsers, searchUser, sendFriendRequest } from "../controllers/user.js";
import { singleAvatar } from "../middlewares/multer.js";
import { isaAuthencticated } from "../middlewares/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from "../lib/validators.js";

const app = express.Router();

app.post("/new",singleAvatar,registerValidator(),validateHandler, newUsers);
app.post("/login",loginValidator(),validateHandler,login);


// after Login 
app.use(isaAuthencticated)
app.get('/me',getMyprofile);
app.get("/logout",logout);
app.get("/search",searchUser);

app.put("/sendrequest",sendRequestValidator(),validateHandler, sendFriendRequest);
app.put("/accept-request",acceptRequestValidator(),validateHandler, acceptFriendRequest);

app.get("/notifications",getNotofications);

app.get("/friends",getMyFriends)


export default app;