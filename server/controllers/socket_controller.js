let database = require('../database');
let jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

class SocketController {
    static openConnections = {};

    constructor(expressApp) {
        this.io = new Server(expressApp, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });
        this.io.on('connection', this.onConnection.bind(this));
        this.io.use(this.socketAuth.bind(this));
        this.userSocekts = {};

    }

    socketAuth(socket, next) {
        console.log("checking socket auth")
        let token = socket.handshake.query.token;
        if (!token) {
            next(new Error('No token provided'));
            return;
        }
        token = token.replace('Bearer ', '');
        jwt.verify(token, 'secret', async (err, decoded) => {
            if (err) {
                next(new Error('Invalid token'));
                return;
            }
            socket.user_id = decoded.user_id;
            socket.handle = (await database.getUserById(decoded.user_id)).handle;
            this.userSocekts[socket.user_id] = socket;
            next();
        });
    }

    onConnection(socket) {
        console.log("socket connected")
        // open chat room connections
        database.getChats(socket.user_id).then(chats => {
            for (let chat of chats) {
                socket.join("chat" + chat.chat_id);
                //console.log(this.io.sockets.adapter.rooms.get("chat" + chat.chat_id).size);
            }
        });

        socket.on('disconnect', () => {
            delete this.userSocekts[socket.user_id];
            console.log("socket disconnected")
        });

        socket.on('typing', (data) => {
            let room = "chat"+data.chat_id;
            this.io.to(room).emit('typing', {user: socket.user_id, handle: socket.handle, chat_id: room});
        });

        socket.on('stop typing', (data) => {
            let room = "chat"+data.chat_id;
            this.io.to(room).emit('stop typing', {user: socket.user_id, handle: socket.handle});
        });

        socket.on('message', async (data) => {
            let chatId = data.chat_id;
            let content = data.content;
            let userId = socket.user_id;
            let messageId = await database.sendMessage(chatId, userId, content);

            this.io.to("chat"+chatId).emit('message', {
                chat_id: chatId,
                message_id: messageId,
                user_id: userId,
                content,
                handle: socket.handle,
                date: "" + "" + Date.now(),
                replies_to: null,
                reactions: [],
                image_id: null
            });
        });
        
        socket.on('reply', async (data) => {
            let chatId = data.chat_id;
            let content = data.content;
            let userId = socket.user_id;
            let handle = socket.handle;
            let replies_to = data.replies_to;
            let messageId = await database.sendReply(chatId, userId, content, replies_to);
            
            console.log("SENDING MESSAGE WITH ID: " + messageId);

            this.io.to("chat"+chatId).emit('message', {
                chat_id: chatId,
                message_id: messageId,
                user_id: userId,
                content,
                replies_to,
                handle,
                date: "" + "" + Date.now(),
                reactions: [],
                image_id: null
            });
        });

        socket.on('location', async (data) => {
            let chatId = data.chat_id;
            let content = data.content;
            let userId = socket.user_id;
            let lat = data.lat;
            let long = data.long;
            let messageId = await database.sendLocation(chatId, userId, content, lat, long);
            this.io.to("chat"+chatId).emit('message', {
                chat_id: chatId,
                message_id: messageId,
                user_id: userId,
                content: content ?? "",
                handle: socket.handle,
                date: "" + Date.now(),
                replies_to: null,
                reactions: [],
                image_id: null,
                lat,
                long
            });
        });

        socket.on('react', async(data) => {
            let messageId = data.message_id;
            let emoji = data.emoji;
            let userId = socket.user_id;
            let chatId = data.chat_id;
            let reactionId = await database.react(messageId, userId, emoji);
            
            this.io.to("chat"+data.chat_id).emit('react', {
                message_id: messageId,
                user_id: userId,
                reaction_id: reactionId,
                chat_id: chatId,
                emoji
            });
            
        });


        socket.on('new chat', async (data) => {
            let userId = socket.user_id;
            let chatUsers = data.users;
            if(!chatUsers.includes(userId)) chatUsers.push(userId);
            let message = data.message;
            let chat = await database.createChat(chatUsers);
            await database.sendMessage(chat.chat_id, userId, message);
            for (let user of chatUsers) {
                if (user in this.userSocekts) {
                    this.userSocekts[user].join("chat" + chat.chat_id);
                }
            }
            this.io.to("chat"+chat.chat_id).emit('new chat', chat);
            socket.emit('select chat', {chat_id: chat.chat_id});
        });
    }
}


module.exports = SocketController;