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
    {
        time: "23:55:23",
        username: "Vladiak",
        message_text: "Hello world",
    },
    {
        time: "12:06:12",
        username: "Egorcik",
        message_text: "I am the best jhin in EU",
    },
    {
        time: "12:06:12",
        username: "Миа бойка",
        message_text: "Лети лети лепесток, через запад на восток",
    },
    {
        time: "12:06:12",
        username: "Nikitka",
        message_text: "Я худший"
    }
]
app.get("/", (req, res) => {
    res.status(200).sendFile("index.html");
})
io.on("connection", socket => {
    let json_messages = JSON.stringify(messages);
    socket.emit("all_messages", json_messages);
    
})

server.listen(port);
console.log(`Listening on port: ${port}`);