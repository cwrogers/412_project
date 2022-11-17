let route = require('express').Router();
let database = require('../database');

// get user by handle
route.get('/:handle', async (req, res) => {
    let handle = req.params.handle;
    let user = await database.getUserByHandle(handle);
    res.json(user);
})

// change password
route.post('/change_password', async (req, res) => {
    let user_id = req.body.user_id;
    let old_password = req.body.old_password;
    let new_password = req.body.new_password;
    // check if old password is correct
    let user = await database.getAuthById(user_id);
    let match = await bcrypt.compare(old_password, user.password);
    if (!match) {
        res.status(403).json({success: false});
        return;
    }
    database.changePassword(user_id, new_password);
});

// change handle
route.post('/change_handle', async (req, res) => {
    let user_id = req.body.user;
    let new_handle = req.body.new_handle;
    res.json({user_id, new_handle})
    return;
    // check if handle is already in use
    if(await database.getUserByHandle(new_handle) != null) {
        res.status(403).json({success: false, error: "Handle already in use"});
        return;
    }
    let success = await database.changeHandle(user_id, new_handle);
    res.json({success: success});
});


// export route
module.exports = route;