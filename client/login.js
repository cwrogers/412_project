
let emailInput;
let passwordInput;


function main() {
    emailInput = document.getElementById("email")
    passwordInput = document.getElementById("password")
}

function loginPressed() {
    // TODO check inputs
    let email = emailInput.value;
    let password = passwordInput.value;
    if(email == "" || password == "") {
        alert("Please enter an email and password");
        return;
    }
    let data = {
        email,
        password
    }

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
    }).then(res => res.json()).then(res => {
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
}

window.onload = () => main();