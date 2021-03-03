const express = require('express');
const path = require('path');
const http = require("http");
const socketio = require("socket.io");
const fs = require("fs");
let dist_path = path.join(__dirname, "dist");
let app = express();
const port = process.env.PORT || 3000;
app.set('trust proxy', true);
var server = http.createServer(app);
var io = socketio(server);

app.use(express.static("dist"));

let messages = [
]
let usernames = [];

write_last_message_to_file = () => {
    let last = messages[messages.length - 1];
    let str =
        `${last.username}\n${last.time}\n${last.message_text}\n`;
    fs.appendFile("messages.txt", str, err => {
        if (err) {
            console.log(err);
        }

    })
}

read_messages_from_file = () => {
    let data = fs.readFileSync("messages.txt", "utf8");

    let arr = data.split("\n");
    let upper_lim = Math.floor(arr.length / 3);
    let counter = 0;

    for (let i = 0; i < upper_lim; i += 1) {
        let message = {
        }
        message.username = arr[counter];
        counter += 1;
        message.time = arr[counter];
        counter += 1;
        message.message_text = arr[counter];
        counter += 1;

        messages.push(message);
    }
}

read_usernames_from_file = () => {
    let data = fs.readFileSync("usernames.txt", "utf8")
    let arr = data.split("\n");
    usernames = arr;
}

write_last_username_to_file = () => {
    let last = usernames[usernames.length - 1];
    let str = `${last}\n`
    fs.appendFile("usernames.txt", str, err => {
        if (err) {
            console.log(err);
        }
    })
}

read_messages_from_file();
read_usernames_from_file();
/*let rooms = [];*/
console.log(usernames);

index_controller = (req, res) => {


    res.status(200).sendFile("index_deploy.html", { root: "dist" });

}

app.get("/", index_controller);

is_username_free = (username) => {
    for (let i = 0; i < usernames.length; i += 1) {

        if (username === usernames[i]) {
            return false;
        }
    }
    return true;
}

get_ipv4 = (address) => {
    let reg = /^::ffff:(?<ipv4>\d+\.\d+\.\d+\.\d+)$/;
    let temp = reg.exec(address);
    return temp[temp.length - 1];
}

get_ip_index = (ip) => {
    let index = -1;
    for (let i = 0; i < ips.length; i += 1) {
        if (ips[i] === ip) {
            index = i;
            break;
        }
    }
    return index;
}

io.on("connection", socket => {
    /*
    let remote_ip = socket.handshake.address;
    let ip = get_ipv4(remote_ip);
    let ip_index = get_ip_index(ip);

    socket.emit("username_response", JSON.stringify(usernames[ip_index]));
    */


    let json_messages = JSON.stringify(messages);
    socket.emit("all_messages", json_messages);

    // Register new message and emit the new message to all sockets
    socket.on("send_new_message", data => {
        let parsed = JSON.parse(data);
        let username = parsed.username;
        let time = parsed.time;
        let message_text = parsed.message_text;
        let new_message = {
            username: username,
            time: time,
            message_text: message_text
        }
        messages.push(new_message);
        io.emit("new_message", JSON.stringify(new_message));
        write_last_message_to_file();
    });

    // Checks if the username is available through the function and emits the response
    socket.on("is_username_available", data => {
        let parsed = JSON.parse(data);
        let username = parsed.username;

        let username_available = is_username_free(username);

        socket.emit("is_username_available_response", JSON.stringify(username_available));
    })
    socket.on("register_username", data => {
        let parsed = JSON.parse(data);
        /*
        ips.push(ip);
        */

        usernames.push(parsed);
        write_last_username_to_file();

    })
})


server.listen(port);
console.log(`Listening on port: ${port}`);