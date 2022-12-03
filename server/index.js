let express = require('express');
let database = require('./database');
let swaggerUi = require('swagger-ui-express');
// set up express app
const app = express();
const server = require('http').createServer(app);
app.use(express.json());

//basic jwt middleware
const jwt = require('jsonwebtoken');
const jwtSecret = 'secret';
const jwtMiddleware = (req, res, next) => {
    let token = req.headers['authorization'];
    if (!token) {
        res.status(401).json({success: false, error: "No token provided"});
        return;
    }

    token = token.replace('Bearer ', '');
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            res.status(401).json({success: false, error: "Invalid token"});
            return;
        }
        console.log(decoded);
        // get user id from token
        req.user_id = decoded.user_id;
        req.user = decoded;
        next();
    });
}

app.use(express.static('../client'))

// build controllers
// let controllers = {
//     //'message': require('./controllers/message_controller'),
//     'auth': require('./controllers/auth_controller'),
//     'user': require('./controllers/user_controller'),
//     //'chat': require('./controllers/chat_controller'),
//     //'image': require('./controllers/image_controller'),
// };

// build unAuthenticated routes
let unAuthenticatedRoutes = {
    'auth': require('./controllers/auth_controller'),
}

// build authenticated routes
let authenticatedRoutes = {
    'user': require('./controllers/user_controller'),
    'chats': require('./controllers/chat_controller')
}

// set up express app to use controllers
for (let key in unAuthenticatedRoutes) {
    app.use('/api/' + key, unAuthenticatedRoutes[key]);
}
for(let key in authenticatedRoutes) {
    app.use('/api/' + key, jwtMiddleware, authenticatedRoutes[key]);
}

SocketController = require('./controllers/socket_controller');
let socketController = new SocketController(server);

app.get("/rooms" , (req, res) => {
    let rooms = socketController.io.sockets.adapter.rooms;
    console.log("ROOMS:", rooms);
    res.json(rooms);
});
// set up port
const port = 22222;
server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
