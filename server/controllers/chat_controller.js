let route = require('express').Router();
let database = require('../database');


route.get('/', async (req, res) => {
    let chats = await database.getChats(req.user_id)
    res.send({code: 200, success: true, chats});
});

//create chat
route.post('/new', async (req, res) => {
    // get all users from chat
    let user_id = req.user_id;
    let user_handles = req.body.users;

    //loop users
    //check if user exists
    for(let i = 0; i < user_handles.length; i++) {
        let user = await database.getUserByHandle(user_handles[i]);
        if(user == null) {
            res.status(403).json({success: false, error: `User ${user_handles[i]} does not exist`});
            return;
        }
    }


    //create chat
    let chat_id = await database.createChat(user_id, user_handles);
    res.json({success: true, chat_id: chat_id});

});

//get messages
route.get('/:chat_id', async (req, res) => {
    let chat_id = req.params.chat_id;
    let offset = req.query.offset? req.query.offset : 0;
    let messages = await database.getMessages(chat_id, offset);
    res.json({success: true, messages});
});


//send message
route.post('/:chat_id', async (req, res) => {
    let chat_id = req.params.chat_id;
    let message = req.body.message;
    let user_id = req.user_id;
    let success = await database.sendMessage(chat_id, user_id, message);
    res.status(success? 200 : 403).json({success});
});


module.exports = route;