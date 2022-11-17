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

    }

    socketAuth(socket, next) {
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
            next();
        });
    }

    onConnection(socket) {
        console.log('a user connected');
        // open chat room connections
        database.getChats(socket.user_id).then(chats => {
            for (let chat of chats) {
                console.log('joining room', chat.chat_id);
                console.log(chat);
                socket.join("chat" + chat.chat_id);
                console.log(this.io.sockets.adapter.rooms.get("chat" + chat.chat_id).size);
                //console.log(socket.rooms)
            }
        });

        socket.on('disconnect', () => {
            console.log('user disconnected');
        });

        socket.on('typing', (data) => {
            /*this.io.to("chat"+chat_id).emit('typing', {user: socket.user_id, handle: socket.handle});*/
            let room = "chat"+data.chat_id;
            console.log("typing in room ", room);
            this.io.to(room).emit('typing', {user: socket.user_id, handle: socket.handle});
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
                content
            });
        });
    }
}


module.exports = SocketController;