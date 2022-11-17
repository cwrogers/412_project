//import bcrypt from 'bcrypt';
let bcrypt = require('bcrypt');

//postgres database connection
const { Pool } = require('pg');
const pool = new Pool({
    user: 'homework1',
    host: 'localhost',
    database: 'project',
    password: 'postgres',
    port: 5432,
});


// Authentication and User Queries
async function authenticateUser(email, password) {
    // get user with email
    let res = await pool.query(`SELECT * FROM "Auth" WHERE email = $1`, [email]);
    if (res.rows.length == 0) {
        return null;
    }
    let user = res.rows[0];
    // bcrypt compare password
    let match = await bcrypt.compare(password, user.password);
    if (!match) {
        return null;
    }
    // query from User table by user_id
    query = `SELECT * FROM "User" WHERE user_id = ${user.user_id}`;
    res = await pool.query(query);
    if (res.rows.length == 0) {
        return null;
    }
    return res.rows[0];
}

async function registerUser(email, password, handle, name) {
    // hash password
    let hash = await bcrypt.hash(password, 10);
    // pool.query with sanitized input
    await pool.query(`INSERT INTO "Auth" (email, password) VALUES ($1, $2)`, [email, hash]);
    // insert name and handle into User table
    await pool.query(`INSERT INTO "User" (name, handle) VALUES ($1, $2)`, [name, handle]);
    return true;
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

async function changeHandle(id, handle) {
   // update handle
    await pool.query(`UPDATE "User" SET handle = $1 WHERE user_id = $2`, [handle, id]);
    return true;
}


// get all messages for a chat from the database
async function getMessages(chat, offset) {
    // return an array of messages
    return (await pool.query(`SELECT * FROM "Message" WHERE chat_id = $1 ORDER BY date DESC LIMIT 20 OFFSET $2`, [chat, offset])).rows;
}

async function sendMessage(chatId, userId, message) {
    // check that user is in chat
    let res = await pool.query(`INSERT INTO "Message" VALUES (DEFAULT, $1, $2, $3, DEFAULT, NULL, NULL, NULL) RETURNING message_id`, [chatId, userId, message]);
    return res;
}

// create a new message in the database
function createMessage(chat, message) {

}

async function getChats(userId) {
    let c = await pool.query(`SELECT * FROM "Chat" WHERE $1 = ANY (members)`, [userId]);
    return c.rows;
}


async function createChat(userId, userHandles) {
    let defaultChatName = userHandles.join(', ');
    let chatId = await pool.query(`INSERT INTO Chat VALUES (DEFAULT, $1, $2) RETURNING chat_id`, [defaultChatName, [userId, ...userHandles]]);
    return chatId;
}

// export functions
module.exports = {
    authenticateUser,
    registerUser,
    getUserById,
    getUserByHandle,
    getUserByEmail,
    changeHandle,
    getChats,
    createChat,
    getMessages,
    sendMessage,
};