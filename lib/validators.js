import { body, param, validationResult } from "express-validator";
import { errorHandler } from "../utils/errorHandler.js";


const registerValidator=()=> [
    body("name","Please Enter Name").notEmpty(),
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
    body("bio","Please Enter Your Bio").notEmpty(),

]

const loginValidator=()=> [
    body("username","Please Enter Username").notEmpty(),
    body("password","Please Enter Password").notEmpty(),
]

const groupchatValidator=()=> [
    body("name","Please Provide The name").notEmpty(),
    body("members","Please Enter members").notEmpty().isArray({min:2,max:100}).withMessage("members must be 2-100"),
]


const addmemberValidator=()=> [
    body("chatId","Please Enter Chat ID").notEmpty(),
    body("members","Please Enter members").notEmpty().isArray({min:1,max:97}).withMessage("members must be 1-97"),
]

const removeMemberValidator=()=> [
    body("chatId","Please Enter Chat ID").notEmpty(),
    body("userId","Please Enter User ID").notEmpty(),
]

const leaveGroupValidator=()=> [
    param("id","Please Enter Chat ID").notEmpty(),
]


const sentAttachmentsValidator=()=>[
    body("chatId","Please Enter Chat ID").notEmpty(),
]


const getMessageValidator=()=> [
    param("id","Please Enter Chat ID").notEmpty(),
]

const chatIdValidator=()=> [
    param("id","Please Enter Chat ID").notEmpty(),
]

const renameValidator=()=> [
    param("id","Please Enter Chat ID").notEmpty(),
    body("name","Please Enter New Name").notEmpty(),
]

const sendRequestValidator=()=> [
    body("userId","Please Enter User ID").notEmpty(),
]

const acceptRequestValidator=()=> [
    body("requestId","Please Enter Request ID").notEmpty(),
    body("accept","Please Add Accept").notEmpty().isBoolean().withMessage("Accept Must Be A Boolean"),

]


const adminLoginValidator=()=> [
    body("secretKey","Please Enter The Secret-Key").notEmpty(),

]

const validateHandler=(req,res,next)=>{
    const errors = validationResult(req);
    const errorMessage = errors.array().map((error)=> error.msg).join(", ");

    console.log(errorMessage);

    if(errors.isEmpty()){
        return next();
    }else{
        next(new errorHandler(errorMessage,400))
    }
}

export { acceptRequestValidator, addmemberValidator, adminLoginValidator, chatIdValidator, getMessageValidator, groupchatValidator, leaveGroupValidator, loginValidator, registerValidator, removeMemberValidator, renameValidator, sendRequestValidator, sentAttachmentsValidator, validateHandler };
