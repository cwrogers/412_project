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


// get all messages for a chat from the database
function getMessages(chat, offset) {

}

// create a new message in the database
function createMessage(chat, message) {

}


// export functions
module.exports = {
    authenticateUser: authenticateUser,
    registerUser,
    getUserById,
    getUserByHandle,
    getUserByEmail,
    getMessages,
    createMessage,
};