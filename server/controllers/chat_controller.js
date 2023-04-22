let route = require('express').Router();
let database = require('../database');


route.get('/', async (req, res) => {
    let chats = await database.getChats(req.user_id);
    chats.reverse();
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
    for(message of messages) {
         if(message.location_id != null) {
            var loc = await database.getLocation(message.location_id);
            console.log("LOCATION: " + JSON.stringify(loc))
            message.lat = loc.lat;
            message.long = loc.lon;
        }
    }
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

route.get('/reaction/:reaction_id', async (req, res) => {
    console.log("WHAT")
    let reaction_id = req.params.reaction_id;
    let reaction = await database.getReaction(reaction_id);
    res.json({success: true, reaction});
});


module.exports = route;