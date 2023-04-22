//import bcrypt from 'bcrypt';
let bcrypt = require('bcrypt');

//postgres database connection
const { Pool } = require('pg');
const pool = new Pool({
    user: 'homework1',
    host: 'localhost',
    database: 'db',
    password: 'postgres',
    port: 5432,
});


// Authentication and User Queries
async function authenticateUser(email, password) {
    // get user with email
    console.log({ email, password });
    let res = await pool.query(`SELECT * FROM "Auth" WHERE email = $1`, [email]);
    if (res.rows.length == 0) {
        console.log("no user ??");
        return null;
    }
    let user = res.rows[0];
    console.log(user)
    // bcrypt compare password
    let match = await bcrypt.compare(password, user.password);
    if (!match) {
        console.log("no match");
        return null;
    }
    // query from User table by user_id
    query = `SELECT * FROM "User" WHERE user_id = ${user.user_id}`;
    res = await pool.query(query);
    if (res.rows.length == 0) {
        console.log("no user from user table??");
        return null;
    }
    return res.rows[0];
}

async function registerUser(email, password, handle, name) {
    // hash password
    let hash = await bcrypt.hash(password, 10);
    // pool.query with sanitized input
    let uid = await pool.query(`INSERT INTO "Auth" (email, password) VALUES ($1, $2) RETURNING user_id`, [email, hash]);
    // insert name and handle into User table
    await pool.query(`INSERT INTO "User" (name, handle) VALUES ($1, $2)`, [name, handle]);
    return uid.rows[0].user_id
}

async function resetPassword(email, password) {
    // check if email is in database
    let res = await pool.query(`SELECT * FROM "Auth" WHERE email = $1`, [email]);
    if (res.rows.length == 0) {
        return false;
    }
    // hash password
    let hash = await bcrypt.hash(password, 10);
    // update password
    await pool.query(`UPDATE "Auth" SET password = $1 WHERE email = $2`, [hash, email]);
    return true;
}

async function getUserById(id) {
    let res = await pool.query(`SELECT * FROM "User" WHERE user_id = $1`, [id]);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function getUserByHandle(handle) {
    let res = await pool.query(`SELECT * FROM "User" WHERE handle = $1`, [handle]);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function getUserByEmail(email) {
    let res = await pool.query(`SELECT * FROM "Auth" WHERE email = $1`, [email]);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function searchUsers(query) {
    let res = await pool.query(`SELECT * FROM "User" WHERE handle LIKE $1`, [query + '%']);
    return res.rows;
}

async function changeHandle(id, handle) {
    // update handle
    await pool.query(`UPDATE "User" SET handle = $1 WHERE user_id = $2`, [handle, id]);
    return true;
}

async function changePassword(id, password) {
    // hash password
    let hash = await bcrypt.hash(password, 10);
    console.log(password, hash)
    // update password
    let res = await pool.query(`UPDATE "Auth" SET password = $1 WHERE user_id = $2`, [hash, id]);
    console.log(res);
    return true;
}

// get all messages for a chat from the database
async function getMessages(chat, offset) {
    // return an array of messages
    return (await pool.query(`SELECT * FROM "Message", "User" WHERE "Message".chat_id = $1 AND "Message".user_id = "User".user_id ORDER BY date DESC LIMIT 20 OFFSET $2`, [chat, offset])).rows;
}

async function getMessageById(id) {
    let res = await pool.query(`SELECT * FROM "Message" WHERE message_id = $1`, [id]);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function sendMessage(chatId, userId, message) {
    // check that user is in chat
    let res = await pool.query(`INSERT INTO "Message" VALUES (DEFAULT, $1, $2, $3, DEFAULT, NULL, NULL, NULL) RETURNING message_id`, [chatId, userId, message]);
    return res.rows[0].message_id;;
}

async function sendReply(chatId, userId, message, replyTo) {
    let res = await pool.query(`INSERT INTO "Message" VALUES (DEFAULT, $1, $2, $3, DEFAULT, NULL, $4, NULL) RETURNING message_id`, [chatId, userId, message, replyTo]);
    return res.rows[0].message_id;
}

async function sendLocation(chatId, userId, message, lat, lon) {
    let location_id = (await pool.query(`INSERT INTO "Location" VALUES (DEFAULT, $1, $2) returning location_id`, [lat, lon])).rows[0].location_id;
    let res = await pool.query(`INSERT INTO "Message" VALUES (DEFAULT, $1, $2, $3, DEFAULT, NULL, NULL, NULL, $4) RETURNING message_id`, [chatId, userId, message ?? " ", location_id]);
    return res.rows[0].message_id;
}

async function getLocation (locationId) {
    let res = await pool.query(`SELECT * FROM "Location" WHERE location_id = $1`, [locationId]);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function getChats(userId) {
    //merge with messages to get chats in order from most recent message
    let c = await pool.query(`SELECT * FROM "Chat" WHERE $1 = ANY (members)`, [userId]);
    return c.rows;
}

async function react(messageId, userId, emoji) {
    let res = await pool.query(`INSERT INTO "Reaction" VALUES (DEFAULT, $1, $2, $3) RETURNING reaction_id`, [userId, messageId, emoji]);

    let rid = res.rows[0].reaction_id
    await pool.query(`UPDATE "Message" SET reactions = array_append(reactions, $1) WHERE message_id = $2`, [rid, messageId]);
    return rid;
}

async function getReaction(reactionId) {
    let res = await pool.query(`SELECT * FROM "Reaction" WHERE reaction_id = $1`, [reactionId]);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function createChat(userIds) {

    //get names for all users
    let names = [];
    for (let i = 0; i < userIds.length; i++) {
        let user = await getUserById(userIds[i]);
        names.push(user.name);
    }
    defaultChatName = names.join(', ');
    let chat = await pool.query(`INSERT INTO "Chat" VALUES (DEFAULT, $1, $2) RETURNING *`, [defaultChatName, userIds]);
    return chat.rows[0];
}

// export functions
module.exports = {
    authenticateUser,
    registerUser,
    getUserById,
    getUserByHandle,
    getUserByEmail,
    searchUsers,
    changeHandle,
    changePassword,
    getChats,
    createChat,
    getMessages,
    getMessageById,
    sendMessage,
    sendReply,
    sendLocation,
    getLocation,
    react,
    getReaction
};
