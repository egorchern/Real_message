const express = require('express');
const path = require('path');
const http = require("http");
const socketio = require("socket.io");
let dist_path = path.join(__dirname, "dist");
let app = express();
const port = 3000;
var server = http.createServer(app);
var io = socketio(server);

app.use(express.static("dist"));

let messages = [
]
let usernames = [];
/*let rooms = [];*/
app.get("/", (req, res) => {
    res.status(200).sendFile("index.html");
})

is_username_free = (username) => {
    for(let i = 0; i < usernames.length; i += 1){
        
        if(username === usernames[i]){
            return false;
        }
    }
    return true;
}

io.on("connection", socket => {
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
        io.emit("new_message", JSON.stringify(new_message))
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
        
        usernames.push(parsed);
        
    })
})


server.listen(port);
console.log(`Listening on port: ${port}`);