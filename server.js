const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const {Client} = require("pg");
const cookie_parser = require("cookie-parser");
const body_parser = require("body-parser");
const bcrypt = require("bcrypt");
const fs = require("fs");
let dist_path = path.join(__dirname, "dist");
let app = express();
const port = process.env.PORT || 3000;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
app.set("trust proxy", true);
var server = http.createServer(app);
var io = socketio(server);
let dev_mode = true;

// if dev mode enabled, fetch database connection string from the connection_string.txt file.
if (dev_mode === true) {
  let database_url = fs.readFileSync("connection_string.txt", "utf8");

  process.env.DATABASE_URL = database_url;
}
app.use(express.static("dist"));

// connect to a database
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

let messages = [];
let users = [{
    username: "sample"
}];

// To support URL-encoded bodies
app.use(body_parser.urlencoded({extended: true}));
// To support json bodies
app.use(body_parser.json());

// To parse cookies from the HTTP Request
app.use(cookie_parser());

get_hashed_password = (password) => {
  let hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  return hash;
};

async function check_user(username, password) {
  let db_hash = "$2b$10$JNp1QdktZHGayW3UenHUieTxmJz99Yg5I0BJawUmF0JmPjj2YPHai";
  let match = await bcrypt.compare(password, db_hash);
}

//fetch messages from the database and push them to messages array
get_messages = () => {
  client.query(
    `
        SELECT * 
        FROM messages
        `,
    (err, res) => {
      let rows = res.rows;
      for (let i = 0; i < rows.length; i += 1) {
        let current_row = rows[i];
        let message = {
          username: current_row.username,
          time: current_row.time,
          message_text: current_row.message_text,
        };
        messages.push(message);
      }
    }
  );
};

// insert the last message from messages array into the database
insert_last_message = () => {
  let last = messages[messages.length - 1];
  let sql_query_string = `
    INSERT INTO messages(username, time, message_text)
    VALUES('${last.username}', '${last.time}', '${last.message_text}')
    `;
  client.query(sql_query_string, (err, res) => {
    if (err) {
      console.log(err);
    }
  });
};

get_messages();

// checks if the username is not in usernames array
check_if_username_free = (username) => {
    let bool = true;
    for(let i = 0; i < users.length; i += 1){
        let current_user = users[i];
        if(current_user.username === username){
            bool = false;
            break;
        }
    }
    return bool;
}

// gets ipv4 address from ipv6 formatted string
get_ipv4 = (address) => {
  let reg = /^::ffff:(?<ipv4>\d+\.\d+\.\d+\.\d+)$/;
  let temp = reg.exec(address);
  return temp[temp.length - 1];
};

get_ip_index = (ip) => {
  let index = -1;
  for (let i = 0; i < ips.length; i += 1) {
    if (ips[i] === ip) {
      index = i;
      break;
    }
  }
  return index;
};

// controller for registering new users
register_controller = (req, res) => {
  let username = req.body.username;
  let password = req.body.password;
  let username_free = check_if_username_free(username);
  console.log(username, username_free);
  // codes: 1 - successful registration, 2 - error, name taken
  if(username_free === true){

  }
  else{
    res.status(200).send({code: "2"});
  }
};

index_controller = (req, res) => {
  res.status(200).sendFile("index_deploy.html", {root: "dist"});
};

app.get("/", index_controller);

app.post("/register", register_controller);

io.on("connection", (socket) => {
  let json_messages = JSON.stringify(messages);
  socket.emit("all_messages", json_messages);

  // Register new message and emit the new message to all sockets
  socket.on("send_new_message", (data) => {
    let parsed = JSON.parse(data);
    let username = parsed.username;
    let time = parsed.time;
    let message_text = parsed.message_text;
    let new_message = {
      username: username,
      time: time,
      message_text: message_text,
    };
    messages.push(new_message);
    io.emit("new_message", JSON.stringify(new_message));
    //write_last_message_to_file();
    insert_last_message();
  });
});

server.listen(port);
console.log(`Listening on port: ${port}`);
