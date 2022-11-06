

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


// export route
module.exports = route;