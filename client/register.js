
let nameInput
let handleInput
let emailInput;
let passwordInput;


function main() {
    nameInput = document.getElementById("name")
    handleInput = document.getElementById("handle")
    emailInput = document.getElementById("email")
    passwordInput = document.getElementById("password")
}

function registerPressed() {
    let name = nameInput.value;
    let handle = handleInput.value;
    let email = emailInput.value;
    let password = passwordInput.value;
    let fieldsNotNull = email && name && handle && password;
    let fieldsNotEmpty = email?.length > 0 && name?.length > 0 && handle?.length > 0 && password?.length > 0;
    if (!fieldsNotNull || !fieldsNotEmpty) {
        alert("Invalid fields");
        return;
    }
    let data = {
        name,
        handle,
        email,
        password
    }
    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    fetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
    }).then(res => res.json()).then(res => {
        console.log(res);
        if(!res.success) {
            console.log(res.error);
            alert(res.error);
            return;
        }

        document.cookie = "login=" + res.user.token;
        document.cookie = "user_id=" + res.user.user_id;
        document.cookie = "handle=" + res.user.handle;
        document.cookie = "name=" + res.user.name;
        window.location.href = "/";

    });
    //window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", main)
