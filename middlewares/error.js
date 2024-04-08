import { envMode } from "../app.js";


const errormiddleware = (err,req,res,next)=>{
    err.message ||="Internal Server Error";
    err.statusCode||= 500;


    if(err.code===11000){
        const error = Object.keys(err.keyPattern).join(", ")
        err.message=`Duplicate field ${error}`;
        err.statusCode= 400;
    }

    if(err.name==="CastError"){
        const path = err.path;
        err.message=`Invalid Format of ${path}`;
        err.statusCode= 400;
    }


    const response={
        success:false,
        message: err.message,
    }

    if(envMode === "DEVELOPMENT"){
        response.error = err;
    }

    return res.status(err.statusCode).json({
        success:false,
        message: envMode ==="DEVELOPMENT"? err: err.message
    });
}

const tryCatch=(passedFunction)=>async(req,res,next)=>{
    try {
        await passedFunction(req,res,next);
    } catch (error) {
        next(error);
    }
}


export {errormiddleware,tryCatch};