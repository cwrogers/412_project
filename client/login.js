
let emailInput;
let passwordInput;


function main() {
    emailInput = document.getElementById("email")
    passwordInput = document.getElementById("password")
}

function loginPressed() {
    // TODO check inputs

    let headers = new Headers();
    headers.append("Content-Type", "application/json");
    fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: emailInput.value,
            password: passwordInput.value
        }),
        headers,
    }).then(res => res.json()).then(res => {
        if(!res.success) {
            console.log(res.error);
            return;
        }
        document.cookie = "login=" + res.user.token;
        document.cookie = "user_id=" + res.user.user_id;
        document.cookie = "handle=" + res.user.handle;
        document.cookie = "name=" + res.user.name;
        console.log(res.user);
        //window.location.href = "/";
    });
}

window.onload = () => main();