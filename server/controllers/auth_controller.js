
let route = require('express').Router();
let database = require('../database');

//setup jwt
const jwt = require('jsonwebtoken');
const jwtSecret = 'secret';

// authentication routes
route.post('/login', async (req, res) => {
    // get username and password from request
    let email = req.body.email;
    let password = req.body.password;

    // get user from database
    let user = await database.authenticateUser(email, password);

    // if user is not found, return 401
    if (!user) {
        res.status(401).json({success: false});
        return;
    }

    // gen token with user id
    let token = jwt.sign({user_id: user.id}, jwtSecret, {expiresIn: '1h'});
    user.token = token;
    res.send(user);
});

route.post('/register', async (req, res) => {
    // get username and password from request
    let email = req.body.email;
    let name = req.body.name;
    let handle = req.body.handle;
    let password = req.body.password;
    // check if all fields are valid
    let fieldsNotNull = email && name && handle && password;
    let fieldsNotEmpty = email?.length > 0 && name?.length > 0 && handle?.length > 0 && password?.length > 0;
    if (!fieldsNotNull || !fieldsNotEmpty) {
        res.status(400).json(req.body)//success: false, error: "Invalid fields"});
        return;
    }

    // check if email is already in use
    let emailInUse = await database.getUserByEmail(email) != null;
    let handleInUse = await database.getUserByHandle(handle) != null;
    if (emailInUse) {
        res.status(400).json({success: false, error: "Email already in use"});
        return;
    }
    if (handleInUse) {
        res.status(400).json({success: false, error: "Handle already in use"});
        return;
    }

    // register user
    let success = await database.registerUser(email, password, handle, name);
    res.json({success: success});
});


// export route
module.exports = route;