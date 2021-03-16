const express = require("express");
const path = require("path");
const http = require("http");
const socketio = require("socket.io");
const { Client } = require("pg");
const cookie_parser = require("cookie-parser");
const body_parser = require("body-parser");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const fs = require("fs");
const request_ip = require("request-ip");
let dist_path = path.join(__dirname, "dist");
let app = express();
const port = process.env.PORT || 3000;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
app.set("trust proxy", true);


let dev_mode = false;

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
let users = [];
let auth_tokens = {

};
let logged_in_users = [];


const generateAuthToken = () => {
    return crypto.randomBytes(80).toString('hex');
}

function delete_redundant_auth_token(username, ip, user_agent) {
    return new Promise(resolve => {
        let auth_token;
        client.query(`
        SELECT authtoken
        FROM authtokens
        WHERE username='${username}' AND ip='${ip}' AND useragent='${user_agent}';
        `).then(res => {
            
            if(res.rows.length > 0){
                auth_token = res.rows[0].authtoken
            }
            
            
            client.query(`
            DELETE FROM authtokens
            WHERE username='${username}' AND ip='${ip}' AND useragent='${user_agent}';
            `).then(res => {
                
                resolve(auth_token);
            })
        })
            
            
    
    })
    

}

// hash using bcrypt
get_hashed_password = (password) => {
    let hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    return hash;
};

find_username_index = (username) => {
    let index = -1;
    for (let i = 0; i < users.length; i += 1) {
        if (users[i].username === username) {
            index = i;
            break;
        }
    }
    return index;
}

async function do_credentials_match(username, password) {
    let index = find_username_index(username);
    if (index != -1) {
        let db_hash = users[index].passwordHash;

        let match = await bcrypt.compare(password, db_hash);
        if (match === true) {
            return true;
        }
        else {
            return false;
        }
    }
    else {
        return false;
    }

}

//fetch messages from the database and push them to messages array
function get_messages() {
    return new Promise(resolve => {
        client.query(
            `
          SELECT * 
          FROM messages
        `

        ).then(res => {
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
            resolve();
        })
    })

};

function get_users() {
    return new Promise(resolve => {
        client.query(
            `
          SELECT * 
          FROM users
          `

        ).then(res => {
            let rows = res.rows;
            for (let i = 0; i < rows.length; i += 1) {
                let current_row = rows[i];
                let user = {
                    username: current_row.username,
                    passwordHash: current_row.passwordhash
                }
                users.push(user);

            }
            resolve();
        })
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
        if (err) {
            console.log(err);
        }
    });
};

function get_tokens() {
    return new Promise(resolve => {
        client.query(
            `
          SELECT * 
          FROM authtokens
          `

        ).then(res => {
            let rows = res.rows;

            for (let i = 0; i < rows.length; i += 1) {
                let current_row = rows[i];
                let token_obj = {
                    auth_token: current_row.authtoken,
                    username: current_row.username
                }
                auth_tokens[token_obj.auth_token] = token_obj.username;
            }
            resolve();
        })
    })
}

function insert_auth_token(username, auth_token, ip, user_agent) {
    client.query(`
  INSERT INTO authtokens(username, authtoken, ip, useragent)
  VALUES('${username}', '${auth_token}', '${ip}', '${user_agent}');
  `)
}

// checks if the username is not in usernames array
check_if_username_free = (username) => {
    let bool = true;
    for (let i = 0; i < users.length; i += 1) {
        let current_user = users[i];
        if (current_user.username === username) {
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

function getCookie(cname, cookies_string) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(cookies_string);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

insert_new_user_into_db = (username, password_hash) => {
    client.query(`
  INSERT INTO users
  VALUES ('${username}', '${password_hash}')
  `, (err, result) => {
        if (err) {
            console.log(err);
        }
    })
}

// controller for registering new users
register_controller = (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let username_free = check_if_username_free(username);
    console.log(username, username_free);
    // codes: 1 - successful registration, 2 - error, name taken
    if (username_free === true) {
        let hashed_password = get_hashed_password(password);
        let new_user = {
            username: username,
            passwordHash: hashed_password
        }
        users.push(new_user);

        insert_new_user_into_db(username, hashed_password);
        res.status(200).send({ code: 1 });
    }
    else {
        res.status(200).send({ code: 2 });
    }
};

index_controller = (req, res) => {

    res.status(200).sendFile("index_deploy.html", { root: "dist" });
};

const requireAuth = (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.send({ code: 2 });
    }
};

get_username_controller = (req, res) => {
    let to_send = undefined;
    if (req.user != undefined) {
        to_send = req.user;
    }
    res.send({ username: to_send });
}

login_controller = (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    console.log(`Log in attempt: ${username} ${password}`);
    do_credentials_match(username, password).then(result => {
        if (result === true) {
            let client_ip = request_ip.getClientIp(req);
            let user_agent = req.body.user_agent;
            let auth_token = generateAuthToken();

            auth_tokens[auth_token] = username;
            let deleted_token;
            
            delete_redundant_auth_token(username, client_ip, user_agent).then(result => {
                deleted_token = result;
                console.log(deleted_token);
                if(deleted_token != undefined){
                    delete auth_tokens[deleted_token];
                    console.log(auth_tokens);
                }
                // Setting the auth token in cookies
                res.cookie('Auth_token', auth_token, { maxAge: 725760000, expires: 725760000 });
                insert_auth_token(username, auth_token, client_ip, user_agent);
                res.send({ code: 1 });
            });
            
            
        }
        else {
            res.send({ code: 2 })
        }
    })
}


async function main() {
    let message_promise = await get_messages();
    let users_promise = await get_users();
    let tokens_promise = await get_tokens();
    console.log(users, auth_tokens);
    var server = http.createServer(app);
    var io = socketio(server);
    // To support URL-encoded bodies
    app.use(body_parser.urlencoded({ extended: true }));
    // To support json bodies
    app.use(body_parser.json());

    // To parse cookies from the HTTP Request
    app.use(cookie_parser());

    app.use((req, res, next) => {
        // Get auth token from the cookies
        const authToken = req.cookies['Auth_token'];

        // Inject the user to the request
        req.user = auth_tokens[authToken];

        next();
    });
    app.get("/", index_controller);

    app.post("/register", register_controller);
    app.post("/login", login_controller);
    app.post("/get_username", get_username_controller);
    io.on("connection", (socket) => {
        let cookies_string = socket.handshake.headers.cookie;
        let auth_token = getCookie("Auth_token", cookies_string);

        let username = auth_tokens[auth_token];
        console.log(`socket with token: ${auth_token}, name: ${username}`);
        if (username != undefined) {
            //let present = logged_in_users.find(element => element === username);
            /*if(present === undefined){
              logged_in_users.push(username);
            }
            */
            logged_in_users.push(username);
            console.log(logged_in_users);
            io.emit("logged_in_users", JSON.stringify(logged_in_users));
            socket.on("request_logged_in_users", data => {
                socket.emit("logged_in_users", JSON.stringify(logged_in_users));
            })
            let json_messages = JSON.stringify(messages);
            socket.on("get_all_messages", data => {
                socket.emit("all_messages", json_messages);
            })
            socket.on("get_logged_in_users", data => {
                let unique = [...new Set(logged_in_users)];
                socket.emit("logged_in_users", JSON.stringify(unique));
            })
            socket.on("disconnect", data => {
                let pop_index = logged_in_users.findIndex(element => element === username);
                logged_in_users.splice(pop_index, 1);
                io.emit("logged_in_users", JSON.stringify(logged_in_users));
            })
            // Register new message and emit the new message to all sockets
            socket.on("send_new_message", (data) => {
                let parsed = JSON.parse(data);

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
        }
    });

    server.listen(port);
    console.log(`Listening on port: ${port}`);
}

main();


