const express = require('express');
const path = require('path');
const http = require("http");
const socketio = require("socket.io");
const { Client } = require("pg");
const fs = require("fs");
let dist_path = path.join(__dirname, "dist");
let app = express();
const port = process.env.PORT || 3000;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
app.set('trust proxy', true);
var server = http.createServer(app);
var io = socketio(server);
let dev_mode = false;

// if dev mode enabled, fetch database connection string from the connection_string.txt file.
if(dev_mode === true){
    let database_url = fs.readFileSync("connection_string.txt", "utf8");
    
    process.env.DATABASE_URL = database_url;
}
app.use(express.static("dist"));

// connect to a database
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});


client.connect();

let messages = [
]
let usernames = [];

//fetch messages from the database and push them to messages array
get_messages = () => {
    client.query(
        `
        SELECT * 
        FROM messages
        `, (err, res) => {

        let rows = res.rows;
        for(let i = 0; i < rows.length; i += 1){
            let current_row = rows[i];
            let message = {
                username: current_row.username,
                time: current_row.time,
                message_text: current_row.message_text
            }
            messages.push(message);
        }
       
    });
}

// fetch usernames from the database and push them to usernames
get_usernames = () => {
    client.query(`
    SELECT *
    FROM usernames
    `, (err, res) => {
        let rows = res.rows;
        rows.forEach(row => {
            usernames.push(row.username);
        });
    })
}

// insert the last username from usernames array into the database
insert_last_username = () => {
    let last = usernames[usernames.length - 1];
    let sql_query_string = `
    INSERT INTO usernames(username)
    VALUES('${last}')
    `;
    client.query(sql_query_string, (err, res) => {
        if(err){
            console.log(err);
        }
    }) 
}

// insert the last message from messages array into the database 
insert_last_message = () => {
    let last = messages[messages.length - 1];
    let sql_query_string = `
    INSERT INTO messages(username, time, message_text)
    VALUES('${last.username}', '${last.time}', '${last.message_text}')
    `;
    client.query(sql_query_string, (err, res) => {
        if(err){
            console.log(err);
        }
    })
}
/*
get_usernames();
get_messages();
console.log(usernames);
console.log(messages);
*/
/*
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
*/

/*let rooms = [];*/


index_controller = (req, res) => {


    res.status(200).sendFile("index_deploy.html", { root: "dist" });

}

app.get("/", index_controller);

// checks if the username is not in usernames array
is_username_free = (username) => {
    for (let i = 0; i < usernames.length; i += 1) {

        if (username === usernames[i]) {
            return false;
        }
    }
    return true;
}

// gets ipv4 address from ipv6 formatted string
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
    console.log(socket);

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
        //write_last_message_to_file();
        insert_last_message();
    });

    // Checks if the username is available through the function and emits the response
    socket.on("is_username_available", data => {
        let parsed = JSON.parse(data);
        let username = parsed.username;

        let username_available = is_username_free(username);

        socket.emit("is_username_available_response", JSON.stringify(username_available));
    })

    // registers the new username in usernames array and calls insertion into database method
    socket.on("register_username", data => {
        let parsed = JSON.parse(data);
        /*
        ips.push(ip);
        */

        usernames.push(parsed);
        //write_last_username_to_file();
        insert_last_username();

    })
})


server.listen(port);
console.log(`Listening on port: ${port}`);