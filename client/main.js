
var cookies = {}
var chats = [];
var messages = [];
var domElems = {};
var socket = null;
var currentChat = null;
var isTyping = false;
var typingTimeout = null;
var handlesTyping = [];


function checkLoginCookie() {
    if(cookies.login) {
        // TODO validate token
        return true;
    }
    return false;
}

function registerDomElems() {
    domElems.logoutBtn = document.getElementById("logoutBtn");
    domElems.chatList = document.getElementById("chat-list");
    domElems.messages = document.getElementById("messages-wrapper");
    domElems.messagebox = document.getElementById("message");
    domElems.typingIndicator = document.getElementById("typing-indicator");
    domElems.mobileChatList = document.getElementById("mobile-chat-list");
    domElems.namePlaceholders = document.getElementsByClassName("name-placeholder");
    domElems.handlePlaceholders = document.getElementsByClassName("handle-placeholder");
}

function registerSocketEvents() {
    console.log("registering socket events");
    //print all events
    socket.onAny((event, ...args) => {
//        console.log("socket event", event, args);
    });

    socket.on("message", (data) => {
        console.log(data)
        //prepend data to messages
        //TODO only render new message
        messages.unshift(data);
        renderMessages();
    });

    socket.on("typing", (data) => {
        console.log("typing", data);
        if(!handlesTyping.includes(data.handle) && data.handle != cookies.handle) {
            handlesTyping.push(data.handle);
        }
        renderTypingIndicator();
    });

    socket.on("stop typing", (data) => {
        if(handlesTyping.includes(data.handle)) {
            handlesTyping.splice(handlesTyping.indexOf(data.handle), 1);
        }
        renderTypingIndicator();
    });
}

// get chats from server
async function getChats() {
    let res = await fetch("/api/chats", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": cookies.login
        }
    });
    res = await res.json();
    if(!res.success) {
        console.log(res.error);
        return;
    }
    chats = res.chats;
}

async function getMessages(chat_id) {
    let res = await fetch("/api/chats/" + chat_id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": cookies.login
        }
    });
    res = await res.json();
    if(!res.success) {
        console.log(res.error);
        return;
    }
    return res.messages;
}

// render chats
function renderChats() {
    domElems.chatList.innerHTML = "";
    chats.forEach(chat => {
        let chatElem = document.createElement("li");
        let link = document.createElement("a");
        link.href = "#";
        link.innerHTML = chat.name;
        chatElem.appendChild(link);

        link.addEventListener('click', () => {
            selectChat(chat.id);
        });

        // add class to chatElem
        chatElem.classList.add("collection-item");
        domElems.chatList.appendChild(chatElem);
        domElems.mobileChatList.appendChild(chatElem.cloneNode(true));
    });

    console.log("rendered chats");
}

function renderMessages() {
    domElems.messages.innerHTML = "";
    messages.forEach(message => {
        console.log(message)
        let messageElem = document.createElement("div");
        // add class to messageElem
        messageElem.classList.add("msg");
        messageElem.classList.add(
            message.user_id == cookies.user_id ? "blue-msg" : "grey-msg"
        );
        messageElem.innerHTML = message.content;
        domElems.messages.prepend(messageElem);
    });

    console.log("rendered messages", messages);
}

function renderTypingIndicator() {
    domElems.typingIndicator.innerHTML = "";
    if(handlesTyping.length == 0) return;
    let typeString = handlesTyping.join(", ") + " is typing...";
    domElems.typingIndicator.innerHTML = typeString;
}

function logoutPressed() {
    console.log("logout pressed");
    document.cookie = "login=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "./login.html"
}

function registerEventListeners() {
    domElems.logoutBtn.addEventListener('click', logoutPressed)
    domElems.messagebox.addEventListener('keypress', (e) => {
        if(e.key == "Enter") {

            if(isTyping) {
                socket.emit("stop typing", {
                    chat_id: currentChat,
                    user_id: cookies.user_id
                });
                isTyping = false;
                clearTimeout(typingTimeout);
                typingTimeout = null;
            }

            socket.emit("message", {
                chat_id: 1,
                content: domElems.messagebox.value
            });
            domElems.messagebox.value = "";
            return;
        }
        if(!isTyping) {
            socket.emit("typing", {
                chat_id: currentChat,
            });
            isTyping = true;
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit("stop typing", {
                chat_id: currentChat,
            });
            isTyping = false;
            typingTimeout = null;
        }, 2000);
    })

}

async function selectChat(chat_id) {
    if(chat_id === currentChat) return;
    currentChat = chat_id;
    messages = await getMessages(chat_id);
    renderMessages();
}

function populatePlaceholderData() {
    for(let ph of domElems.namePlaceholders) {
        ph.innerHTML = cookies.name;
    }
    for(let ph of domElems.handlePlaceholders) {
        ph.innerHTML = "@" + cookies.handle;
    }

}

async function main() {
    document.cookie.split(';').map(x => x.split('=')).forEach(x => cookies[x[0]?.trim()] = x[1]?.trim());
    if(!checkLoginCookie()) {
        window.location.href = "./login.html"
    }

    socket = io("http://192.168.1.9:22222", {
        query: {
            token: cookies.login,
            user_id: cookies.user_id
        }
    });

    registerDomElems();
    registerEventListeners();
    registerSocketEvents();

    populatePlaceholderData();

    await getChats();
    renderChats();

    if(chats.length > 0) {
        selectChat(chats[0].chat_id);
    }
}


window.addEventListener("load", main)