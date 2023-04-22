var cookies = {}
var chats = [];
var messages = [];
var domElems = {};
var socket = null;
var currentChat = null;
var isTyping = false;
var typingTimeout = null;
var handlesTyping = [];
var autocompleteData = {};
var newChatUsers = {};
var reactions = {};
var selectedMessageElem = null;
var doubleClickTimeout = null;
var mouseTimer = null;
var isReplying = false;
var replyTo = null;
var reactTo = null;


// states enum
const states = {
    "chat": 0,
    "newChat": 1,
}

let currentState;


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
    domElems.newChatSearchArea = document.getElementById("new-chat-search-area");
    domElems.newChatChips = document.getElementById("new-chat-chips");
    domElems.newchatBtn = document.getElementById("new-chat-btn");
    domElems.replyMsg = document.getElementById("reply-msg");
    domElems.messageArea = document.getElementById("message-input");
    domElems.replyArea = document.getElementById("reply-area") 
    domElems.modal = M.Modal.init(document.querySelectorAll('.modal'), {})[0];
}

function registerSocketEvents() {
    socket.onAny((event, ...args) => {
        // log any event
//        console.log("socket event", event, args);
    });

    socket.on("message", (data) => {
        if(data.chat_id == currentChat) {
            console.log("message", data);
            messages.unshift(data);
            renderMessages();
        }
    });

    socket.on("typing", (data) => {
        if(data.chat_id != "chat"+currentChat) return;
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
    
    socket.on("new chat", (data) => {
        chats.unshift(data);
        renderChats();
    });
    
    socket.on("select chat", (data) => {
        selectChat(data.chat_id);
    });

    socket.on("react", (data) => {
        console.log("react", data);
        let messageId = data.message_id;
        let emoji = data.emoji;
        let reactionId = data.reaction_id;
        let userId = data.user_id;
        let chatId = data.chat_id;
        reactions[reactionId] = {
            emoji,
            messageId,
            reactionId,
            userId
        }
        if(chatId == currentChat) {
            let msg = messages.find((msg) => msg.message_id == messageId);
            if(msg.reactions == null) msg.reactions = [];
            msg.reactions.push(reactionId);
            renderMessages();
        }
    });
}

async function getReaction(reactionId) {
    let res = await fetch("/api/chats/reaction/" + reactionId, {
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
    return res.reaction;
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


function stopTyping() {
    if(isTyping) {
        socket.emit("stop typing", {
            chat_id: currentChat,
            user_id: cookies.user_id
        });
        isTyping = false;
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
}

function newChatPressed() {
    // clear message box
    domElems.messagebox.value = "";
    // clear messages
    messages = [];
    renderMessages();
    // clear typing indicator
    handlesTyping = [];
    renderTypingIndicator();
    stopTyping();
    cancelReply();

    currentChat = null;
    domElems.chatList.querySelector('.active').classList.remove('active');
    currentState = states.newChat;
    domElems.newChatSearchArea.style.height = "auto";
    domElems.newChatSearchArea.style.visibility = "visible";
}

// render chats
function renderChats() {
    domElems.chatList.innerHTML = "";
    domElems.mobileChatList.innerHTML = "";
    chats.forEach(chat => {
        let chatElem = document.createElement("li");
        let mobileChatElem = document.createElement("li");
        let link = document.createElement("a");
        link.href = "#";
        link.innerHTML = chat.name;
        chatElem.appendChild(link);
        mobileChatElem.appendChild(link.cloneNode(true));

        // add class to chatElem
        chatElem.classList.add("collection-item");
        chatElem.classList.add("waves-effect");
        
        if(chat.chat_id == currentChat) {
            chatElem.classList.add("active");
            mobileChatElem.classList.add("active")
        }
        
        chatElem.addEventListener("click", () => {
            selectChat(chat.chat_id);
        });
        mobileChatElem.addEventListener("click", () => {
            selectChat(chat.chat_id);
            let n = document.querySelector('.sidenav')
            M.Sidenav.getInstance(n).close();
        });
        
        chatElem.id = "chat-" + chat.id;
        domElems.chatList.appendChild(chatElem);
        domElems.mobileChatList.appendChild(mobileChatElem);
    });
}

function formatTimestamp(dateString) {
    let date = new Date(dateString);
    let now = new Date();
    let diff = now - date;
    let diffDays = Math.floor(diff / 86400000); // days
    if(diffDays == 0) {
        let diffHours = Math.floor(diff / 3600000); // hours
        if(diffHours == 0) {
            let diffMinutes = Math.floor(diff / 60000); // minutes
            return diffMinutes <= 1 ? "now" : (diffMinutes + " min ago");
        }
        return diffHours + " hours ago";
    } else if(diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'short' }) + " " + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + " " + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
}

async function renderMessages() {
    domElems.messages.innerHTML = "";
    domElems.messages.style.justifyContent = "";
    messages.forEach(message => {
        let messageElem = document.createElement("div");
        // add class to messageElem
        messageElem.classList.add("msg");

        

        messageElem.addEventListener("click", () => {
            // double click check for reply
            if(doubleClickTimeout) {
                clearTimeout(doubleClickTimeout);
                doubleClickTimeout = null;

                // reply
                domElems.replyMsg.innerHTML = message.content;
                domElems.messageArea.classList.add("reply");

                domElems.replyArea.style.height = "auto";
                domElems.replyArea.style.visibility = "visible";
                domElems.messagebox.focus();
                isReplying = true;
                replyTo = message;
                
                return;
            } else {
                doubleClickTimeout = setTimeout(() => {
                    doubleClickTimeout = null;
                }, 250);
            }
            if(messageElem.classList.contains("selected")) {
                messageElem.classList.remove("selected");
                selectedMessageElem = null;
                return;
            } else {
                if(selectedMessageElem) selectedMessageElem.classList.remove("selected");
                selectedMessageElem = messageElem;
            }
            selectedMessageElem.setAttribute("timestamp", formatTimestamp(message.date));
            messageElem.classList.add("selected");
            
        });
        function mouseDown() {
            console.log("mouse down");
            mouseTimer = window.setTimeout(execMouseDown,700);
        }
        function mouseUp() {
            console.log("mouse up");
            if (mouseTimer) window.clearTimeout(mouseTimer);
            mouseTimer = null;
        }

        function execMouseDown() {
            reactTo = message;
            domElems.modal.open();    
        }
        
        messageElem.addEventListener("mousedown", mouseDown);
        messageElem.addEventListener("mouseup", mouseUp);
        messageElem.addEventListener("touchstart", mouseDown);
        messageElem.addEventListener("touchend", mouseUp);

        messageElem.innerHTML += message.content;

        //
        if(chats.find(chat => chat.chat_id == currentChat).members.length > 2) {
            let sender = document.createElement("div");
            sender.classList.add("sender");
            sender.innerHTML = message.handle;
            messageElem.prepend(sender);
        }

        if(message.reactions?.length > 0) {
            let reactionsElem = document.createElement("div");
            reactionsElem.classList.add("reactions");
            reactionsElem.classList.add(
                message.user_id != cookies.user_id ? "re-left" : "re-right"
            );
            message.reactions.forEach(async rid => {
                
                if(!reactions[rid]) {
                    let reaction = await getReaction(rid);
                    console.log(reaction)
                    reactions[reaction.reaction_id] = reaction;
                }

                let reactionElem = document.createElement("div");
                reactionElem.classList.add("reaction");
                reactionElem.innerHTML = reactions[rid].emoji;
                reactionsElem.appendChild(reactionElem);
            });
            domElems.messages.prepend(reactionsElem);
        }

        if(message.replies_to != null) {
            let replyWrapper = document.createElement("div");
            replyWrapper.classList.add("reply-wrapper");
            messageElem.classList.add("reply");
            messageRepliedTo = messages.find(m => m.message_id == message.replies_to);
            if(messageRepliedTo != null) {
                let replyElem = document.createElement("div");
                replyElem.classList.add("reply-msg");
                replyElem.innerHTML = messageRepliedTo.content;
                replyWrapper.appendChild(replyElem);
            }
            replyWrapper.appendChild(messageElem);
            replyWrapper.classList.add(
                message.user_id == cookies.user_id ? "blue-msg" : "grey-msg"
            );
            domElems.messages.prepend(replyWrapper);
        } else {
            messageElem.classList.add(
                message.user_id == cookies.user_id ? "blue-msg" : "grey-msg"
            );
            domElems.messages.prepend(messageElem);
        }

        if(message.lat != null) {
            //create map element
            let mapElem = document.createElement("div");
            mapElem.classList.add("map");
            mapElem.setAttribute("lat", message.lat);
            mapElem.setAttribute("lng", message.lng);
            mapElem.setAttribute("zoom", message.zoom);
            mapElem.setAttribute("timestamp", formatTimestamp(message.date));
            
        }
        
        

        
    });

    //if there is no overflow, set flex-justify to end
    if(domElems.messages.scrollHeight <= domElems.messages.clientHeight) {
        domElems.messages.style.justifyContent = "flex-end";
    } else {
        domElems.messages.scrollTop = domElems.messages.scrollHeight;
    }

}

function react(emoji) {
    if(reactTo == null) return;
    let data = {
        message_id: reactTo.message_id,
        emoji: emoji,
        chat_id: currentChat
    }
    socket.emit("react", data);
    domElems.modal.close();
    reactTo = null;
}

function cancelReply() {
    domElems.replyArea.style.height = "0";
    domElems.replyArea.style.visibility = "hidden";
    domElems.messageArea.classList.remove("reply");
    domElems.replyMsg.innerHTML = "";
    domElems.messagebox.value = "";
    isReplying = false;
    replyTo = null;
    domElems.messagebox.focus();
}


function renderTypingIndicator() {
    domElems.typingIndicator.innerHTML = "";
    if(handlesTyping.length == 0) return;
    let typeString = handlesTyping.join(", ") + " is typing...";
    domElems.typingIndicator.innerHTML = typeString;
}

function logoutPressed() {
    document.cookie = "login=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "./login.html"
}

async function searchUsers(handle) {
    let res = await fetch("/api/user/search/" + handle, {
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
    return res.users;
}

async function createNewChat() {
    let message = domElems.messagebox.value;
    let users = Object.keys(newChatUsers).map(key => newChatUsers[key].user_id);
    socket.emit("new chat", {
        message,
        users
    });
    domElems.messagebox.value = "";
    for(let i = 0; i < Object.keys(newChatUsers).length; i++) {
        M.Chips.getInstance(domElems.newChatChips).deleteChip(i);
    }
    newChatUsers = {};
}

function sendMessage() {
    stopTyping();
    let content = domElems.messagebox.value;
    if(content == "") return;
    domElems.messagebox.value = ""; 

    if(isReplying) {
        socket.emit("reply", {
            chat_id: currentChat,
            replies_to: replyTo.message_id,
            content,
        });
        cancelReply();
        return;
    }

    socket.emit("message", {
        chat_id: currentChat,
        content,
    });
}

function sendButtonPressed() {
    if(currentState == states.newChat) {
        createNewChat();
        return;
    }
    sendMessage();
}

function registerEventListeners() {
    domElems.logoutBtn.addEventListener('click', logoutPressed)
    domElems.messagebox.addEventListener('keypress', (e) => {
        if(e.key == "Enter") {
            if(currentState == states.newChat) {
                createNewChat();
            } else {
                sendMessage();
            }
            return;
        }
        
        if(currentState == states.newChat) return;
        if(!isTyping) {
            socket.emit("typing", {
                chat_id: currentChat,
            });
            isTyping = true;
        }

        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            stopTyping();
        }, 2000);
    });


    domElems.messagebox.addEventListener('input', (e) => {
        if(currentState == states.newChat) return;
        if(isTyping) return;
        socket.emit("typing", {
            chat_id: currentChat,
        });
        isTyping = true;
        typingTimeout = setTimeout(() => {
            socket.emit("stop typing", {
                chat_id: currentChat,
            });
            isTyping = false;
            typingTimeout = null;
        }, 2000);
    });
    
    domElems.newchatBtn.addEventListener('click', () => {
       newChatPressed(); 
    });
    
   M.Chips.init(domElems.newChatChips, {
       autocompleteOptions: {
           data: {
           },
           limit: 50,
       },
       placeholder: "Search",
       onChipAdd: (e, chip) => {
           let chips = e[0].M_Chips.chipsData;
           let label = chips[chips.length - 1].tag;
           if(!autocompleteData[label]) {
               e[0].M_Chips.deleteChip(chips.length - 1);
               return;
           }
           newChatUsers[label] = autocompleteData[label];
       }, 
       onChipDelete: (e, chip) => {
           let label = chip.firstChild.data;
           delete newChatUsers[label];
       }
    });
    
    document.querySelector("#new-chat-chips input").addEventListener('input', async (e) => {
        let search = e.target.value;
        if(search.length < 3) {
            return;
        }
        let users = await searchUsers(search);
        var data = {};
        users.forEach(user => {
            autocompleteData[user.handle] = user;   
            data[user.handle] = null;
        });
        let chips = M.Chips.getInstance(domElems.newChatChips);
        chips.autocomplete.updateData(data);
    });

}

async function selectChat(chat_id) {
    currentState = states.chat;
    if(chat_id === currentChat) return;
    cancelReply();
    //setheight to 0
    domElems.newChatSearchArea.style.height = "0px";
    domElems.newChatSearchArea.style.visibility = "hidden";
    currentChat = chat_id;
    messages = await getMessages(chat_id);
    renderChats();
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

    socket = io("http://192.168.4.35:22222", {
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

    currentState = states.newChat;
    if(chats.length > 0) {
        selectChat(chats[0].chat_id);
    } 
}

window.addEventListener("load", main)
