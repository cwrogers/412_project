
let route = require('express').Router();
let database = require('../database');

//setup jwt
const jwt = require('jsonwebtoken');
const jwtSecret = 'secret';

// authentication routes
route.post('/login', async (req, res) => {
    // get username and password from request
    let email = req.body.email.trim().toLowerCase();
    let password = req.body.password.trim();

    // get user from database
    let user = await database.authenticateUser(email, password);

    // if user is not found, return 401
    if (!user) {
        res.status(401).json({
            code: 401,
            success: false,
            error: "Incorrect email or password"
        });
        return;
    }
    // gen token with user id
    let token = jwt.sign({user_id: user.user_id}, jwtSecret, {expiresIn: '48h'});
    user.token = token;

    let resp = {
        code: 200,
        success: true,
        user
    }

    console.log(resp);

    res.send(resp);
});

route.post('/register', async (req, res) => {
    console.log(req.body);
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
        res.status(400).json({success: false, error: "Email already in use", code: 400});
        return;
    }
    if (handleInUse) {
        res.status(400).json({success: false, error: "Handle already in use", code: 400});
        return;
    }

    // register user
    let id = await database.registerUser(email, password, handle, name);
    //generate token
    let token = jwt.sign({user_id: id}, jwtSecret, {expiresIn: '48h'});
    res.json({success: true, code: 200, user: {user_id: id, token, handle, name}});
});

route.post('/reset', async (req, res) => {
    let email = req.body.email;
    let pass = req.body.password;

    let user = await database.getUserByEmail(email);
    console.log(user)
    if(user == null) {
        res.status(402).json({success: false});
        return;
    }
    let new_password = pass == null ? Math.random().toString(35).slice(-8) : pass;
    let success = await database.changePassword(user.user_id, new_password);
    if(success) {
        res.send("Your new password is: " + new_password);
    } else {
        res.status(499).json({success: false});
    }
});


// export route
module.exports = route;