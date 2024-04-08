
import {faker, simpleFaker} from "@faker-js/faker"
import {User} from "../modals/user.js" 
import { Chat } from "../modals/chat.js";
import { Message } from "../modals/message.js";

const seederData=async(numUsers)=>{
    try {

        const memberPromise = [];

    for(let i=0;i<numUsers;i++){
        const newUsers = await User.create({
            name: faker.person.fullName(),
            username:faker.internet.userName(),
            bio:faker.lorem.sentence(10),
            password:"password",
            avatar:{
                public_id: faker.system.fileName(),
                url:faker.image.avatar(),
            }

        })
        memberPromise.push(newUsers);

    }
    await Promise.all(memberPromise);

    console.log("users created");
    process.exit(1);
        
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
    
}


const sampleSingleChats=async(numChats)=>{
    try {
        const user= await User.find().select("_id");

    const chatsPromise = [];

    for(let i=0;i<user.length;i++){
        for(let j=i+1;j<user.length;j++){
            chatsPromise.push(
                Chat.create({
                    name:faker.lorem.words(2),
                    members: [user[i],user[j]],
                })
            )
        }
    }
    await Promise.all(chatsPromise);
    console.log("Chats has been created");
    process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

const sampleGroupChats=async(numChats)=>{
    try {
        const users= await User.find().select("_id");

        const chatsPromise = [];
    
        for(let i=0;i<numChats;i++){

            const  numMembers = simpleFaker.number.int({min:3,max: users.length});
            const members=[];
            for(let j=0;j< numMembers;j++){

                const randomIndex = Math.floor(Math.random()* users.length);

                const randomUser= users[randomIndex];

                if(!members.includes(randomUser)){
                    members.push(randomUser);
                }
            }
            console.log("jniernkg")
            const chat = await Chat.create({
                groupChat:true,
                name:faker.lorem.words(1),
                members,
                creator: members[0],
            })

            chatsPromise.push(chat);
            
        }

        await Promise.all(chatsPromise);
        console.log("Chats has been created");
        process.exit();
        
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}


const createMessage = async(numMessages)=>{
    try {
        const users= await User.find().select("_id");
        const chats= await Chat.find().select("_id");
        const messagePromise=[];

        for(let i=0;i<numMessages;i++){

            const randomUser = users[Math.floor(Math.random()* users.length)];

            const randomChat= chats[Math.floor(Math.random()* chats.length)];

            messagePromise.push(
                Message.create({
                    chat:randomChat,
                    sender: randomUser,
                    content: faker.lorem.sentence(),
                })
            )
        }
        await Promise.all(messagePromise);
        console.log("Messages Created");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}


const chatMessage = async(chatId,numMessages)=>{
    try {
        const users= await User.find().select("_id");
    const messagePromise=[];

    for(let i=0;i<numMessages;i++){
        const randomUser = users[Math.floor(Math.random()* users.length)];
        messagePromise.push(
            Message.create({
                chat:chatId,
                sender: randomUser,
                content: faker.lorem.sentence(),
            })
        )
    }
    await Promise.all(messagePromise);
        console.log("Messages Created");
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }

}
export {seederData,sampleSingleChats,sampleGroupChats,createMessage,chatMessage};