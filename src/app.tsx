import * as React from "react";
import {render} from "react-dom";
import {io} from "socket.io/client-dist/socket.io";
import {Howl} from "howler";
import assets from "./assets/*.mp3";
import svg_assets from "./assets/*.svg";
import {SlideDown} from "react-slidedown";
import json from "body-parser/lib/types/json";
import {isElementAccessExpression} from "typescript";
let root = document.querySelector("#root");
console.log (svg_assets);
let socket;
let sound_enabled = true;

function get_username  () {
  return new Promise(resolve => {
    fetch("/get_username", {
      method: "POST"
    })
    .then(result => result.json())
    .then(data => {
      let username = data.username;
      resolve(username);
      return username;
    })
  })
  
}

function play_new_message_sound_effect() {
  if (sound_enabled === true) {
    let path = assets.new_message_sound_effect;

    let bop = new Howl({
      src: [path],
      volume: 0.8,
    });
    bop.play();
  }
}

function log_out(){
  document.cookie = "Auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.reload();
}



class Log_out_button extends React.Component{
  constructor(props){
    super(props);
  }

  handle_click = () => {
    log_out();
  }

  render(){
    return (
      <div className="log_out_button" onClick={this.handle_click}>
        <img src={svg_assets.log_out_icon}>
        </img>
        <span>
          Log out
        </span>
      </div>
    )
  }
}

class Side_panel extends React.Component{
  constructor(props){
    super(props);

  }
  render(){
    return(
      <div className="side_panel">
        <Log_out_button>

        </Log_out_button>
      </div>
    )
    
  }
}

class Message extends React.Component {
  message: any;
  constructor(props) {
    super(props);
    this.message = this.props.message;
  }
  render() {
    return (
      <div className="message_container">
        <div className="message_metadata">
          <span className="message_username">{this.message.username}</span>
          <span className="message_time">{this.message.time}</span>
        </div>
        <div className="message_text_container">
          <span className="message_text">{this.message.message_text}</span>
        </div>
      </div>
    );
  }
}

class New_message_menu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message_text: "",
      is_text_area_focused: false,
    };
  }

  reset_message_text = () => {
    this.setState({
      message_text: "",
    });
  };

  on_textarea_change_focus = (bool) => {
    this.setState({
      is_text_area_focused: bool,
    });
  };

  on_textarea_value_change = (ev) => {
    this.setState({
      message_text: ev.target.value,
    });
  };

  render() {
    let classes = "new_message_container";
    if (this.state.is_text_area_focused === true) {
      classes += " focused";
    }
    return (
      <div className="flex_direction_row padding_small">
        <div className={classes}>
          <textarea
            placeholder="Type new message here..."
            spellCheck="false"
            autoComplete="false"
            onFocus={() => {
              this.on_textarea_change_focus(true);
            }}
            onBlur={() => {
              this.on_textarea_change_focus(false);
            }}
            value={this.state.message_text}
            onChange={this.on_textarea_value_change}
            onKeyDown={(ev) => {
              let key = ev.key;

              if (key === "Enter") {
                this.reset_message_text();
                this.props.send_new_message(this.state.message_text);
              }
            }}
          ></textarea>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          id="send_message_btn"
          onClick={(ev) => {
            this.reset_message_text();
            this.props.send_new_message(this.state.message_text);
          }}
        >
          <path d="m4.7 15.8c-.7 1.9-1.1 3.2-1.3 3.9-.6 2.4-1 2.9 1.1 1.8s12-6.7 14.3-7.9c2.9-1.6 2.9-1.5-.2-3.2-2.3-1.4-12.2-6.8-14-7.9s-1.7-.6-1.2 1.8c.2.8.6 2.1 1.3 3.9.5 1.3 1.6 2.3 3 2.5l5.8 1.1c.1 0 .1.1.1.1s0 .1-.1.1l-5.8 1.1c-1.3.4-2.5 1.3-3 2.7z" />
        </svg>
      </div>
    );
  }
}

class Conversation_container extends React.Component {
  messages: any;
  markup: any;
  constructor(props) {
    super(props);
    this.markup = this.props.messages.map((message, index) => {
      return <Message message={message} key={index}></Message>;
    });
  }
  scroll_into_view() {
    let elem = document.querySelector(".messages_container");
    elem.scrollTo(0, elem.scrollHeight);
  }
  componentDidUpdate() {
    this.scroll_into_view();
  }
  componentDidMount() {
    this.scroll_into_view();
  }
  render() {
    if(this.props.messages.length > 0 && this.props.new_message === undefined){
      this.markup = this.props.messages.map((message, index) => {
        return <Message message={message} key={index}></Message>;
      });
    }
    if (this.props.new_message != undefined) {
      let new_message = this.props.new_message;
      let new_message_markup = (
        <Message message={new_message} key={this.markup.length}></Message>
      );
      this.markup.push(new_message_markup);
    }

    return (
      <div className="conversation_container">
        <Side_panel>

        </Side_panel>
        <div className="messages_container">{this.markup}</div>
        <New_message_menu
          send_new_message={this.props.send_new_message}
        ></New_message_menu>
        
      </div>
    );
  }
}

class Alert_message extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    let color = this.props.color;
    let background_color;
    let border_color;

    if (color === "red") {
      color = "hsl(355deg, 61%, 32%)";
      background_color = "#f8d7da";
      border_color = "#f5c2c7";
    } else if (color === "green") {
      color = "hsl(152deg, 69%, 19%)";
      background_color = "#d1e7dd";
      border_color = "#badbcc";
    }

    let alert_style = {
      color: color,
      backgroundColor: background_color,
      borderColor: border_color,
    };

    let message = this.props.message;
    let animate = this.props.alert_visibility === true;
    let class_list = "alert_message";
    if (animate === true) {
      class_list += " animate_fade_in";
    } else {
      class_list += " animate_fade_out";
    }

    return (
      <div className={class_list} style={alert_style}>
        {message != undefined ? (
          <div className="flex_direction_row">
            <span className="margin_right">{message}</span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="close_alert"
              onClick={this.props.dismiss_alert}
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        ) : null}
      </div>
    );
  }
}

class Menu extends React.Component {
  socket_binded: boolean;
  transition_duration: number;

  constructor(props) {
    super(props);
    this.state = {
      username: "",
      password: "",
      selected: -1,
      login_hoverable: true,
      register_hoverable: true,
    };
    this.transition_duration = 0.5 * 1000 + 10;
  }

  on_username_change = (ev) => {
    this.setState({
      username: ev.target.value,
    });
  };

  on_password_change = (ev) => {
    this.setState({
      password: ev.target.value,
    });
  };

  switch_hoverable_on = (index) => {
    let opposite_index;

    if (index === 0) {
      opposite_index = 1;
    } else if (index === 1) {
      opposite_index = 0;
    }

    if (opposite_index === 0) {
      this.setState({
        login_hoverable: true,
      });
    } else if (opposite_index === 1) {
      this.setState({
        register_hoverable: true,
      });
    }
  };

  on_menu_option_click = (selected) => {
    setTimeout(() => {
      this.switch_hoverable_on(selected);
    }, this.transition_duration);
    this.setState({
      selected: selected,
      login_hoverable: false,
      username: "",
      password: "",
      register_hoverable: false,
    });
  };

  handle_registration = () => {
    this.props.register(this.state.username, this.state.password);
  };

  handle_log_in = () => {
    this.props.log_in(this.state.username, this.state.password);
  }

  render() {
    let focused_content;
    let class_lst_login = "menu_option flex_direction_column";
    let class_lst_register = "menu_option flex_direction_column";
    if (this.state.login_hoverable === true) {
      class_lst_login += " hoverable";
    }

    if (this.state.register_hoverable === true) {
      class_lst_register += " hoverable";
    }

    return (
      <div className="conversation_container flex_direction_column">
        <div
          className={class_lst_login}
          onClick={() => {
            if (this.state.login_hoverable === true) {
              this.on_menu_option_click(0);
            }
          }}
        >
          <h1>Log in</h1>
          <SlideDown className="my_slide_down">
            {this.state.selected === 0 ? (
              <div className="name_select_container flex_direction_column">
                <h2>Username:</h2>
                <input
                  className="form-control"
                  value={this.state.username}
                  onChange={this.on_username_change}
                ></input>
                <h2>Password:</h2>
                <input
                  className="form-control"
                  value={this.state.password}
                  onChange={this.on_password_change}
                  type="password"
                ></input>
                <button
                  className="btn btn-primary"
                  onClick={this.handle_log_in}
                >
                  Log in
                </button>
              </div>
            ) : null}
          </SlideDown>
        </div>
        <div
          className={class_lst_register}
          onClick={() => {
            if (this.state.register_hoverable === true) {
              this.on_menu_option_click(1);
            }
          }}
        >
          <h1>Register</h1>
          <SlideDown className="my_slide_down">
            {this.state.selected === 1 ? (
              <div className="name_select_container flex_direction_column">
                <h2>Username:</h2>
                <input
                  className="form-control"
                  value={this.state.username}
                  onChange={this.on_username_change}
                ></input>
                <h2>Password:</h2>
                <input
                  className="form-control"
                  value={this.state.password}
                  onChange={this.on_password_change}
                  type="password"
                ></input>
                <button
                  className="btn btn-primary"
                  onClick={this.handle_registration}
                >
                  Register
                </button>
              </div>
            ) : null}
          </SlideDown>
        </div>
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages_received: false,
      new_message: undefined,
      messages: [],
      username: this.props.username,
      alert_message: undefined,
      alert_visibility: true,
    };
    
  }

  

  dismiss_alert = () => {
    this.setState({
      alert_visibility: false,
    });
  };

  register = (username, password) => {
    if (username != "" && password != "") {
      let data = {
        username: username,
        password: password,
      };
      let jsoned = JSON.stringify(data);

      // codes: 1 - successful registration, 2 - error, name taken
      fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: jsoned,
      })
        .then((result) => result.json())
        .then((data) => {
          let code = data.code;
          let alert_message, alert_color;
          if (code === 2) {
            alert_message =
              "Chosen username is already taken. Please choose another username";
            alert_color = "red";
          } else if (code === 1) {
            alert_message = `User ${username} successfully registered`;
            alert_color = "green";
          }
          this.setState({
            alert_message: alert_message,
            alert_color: alert_color,
            alert_visibility: true,
          });
        });
    } else {
      this.setState({
        alert_message: "Some fields were left empty. Please fill all fields",
        alert_color: "red",
        alert_visibility: true,
      });
    }
  };

  log_in = (username, password) => {
    if (username != "" && password != "") {
      let data = {
        username: username,
        password: password,
        user_agent: navigator.userAgent
      };
      let jsoned = JSON.stringify(data);

      // codes: 1 - successful login, 2 - credentials not found
      fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: jsoned,
      })
      .then((result) => result.json())
      .then((data) => {
        let code = data.code;
        if(code === 2){
          this.setState({
            alert_message: "Invalid credentials. Either the passwords does not match or user with selected username does not exist",
            alert_color: "red",
            alert_visibility: true,
          });
        }
        if(code === 1){
          window.location.reload();
        }
      });
    } else {
      this.setState({
        alert_message: "Some fields were left empty. Please fill all fields",
        alert_color: "red",
        alert_visibility: true,
      });
    }
  };

  send_new_message = (message_text) => {
    if (message_text != "") {
      let date = new Date().toLocaleDateString("en-GB");
      let time = new Date().toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
      let time_string = `${time} ${date}`;

      let message_obj = {
        
        time: time_string,
        message_text: message_text,
      };
      socket.emit("send_new_message", JSON.stringify(message_obj));
    }
  };

  componentDidMount() {
    
    socket.on("all_messages", (data) => {
      this.setState({
        messages_received: true,
        messages: JSON.parse(data),
      });
    });
    socket.emit("get_all_messages");
    socket.on("new_message", (data) => {
      let new_message = JSON.parse(data);

      this.state.messages.push(new_message);
      this.state.new_message = new_message;
      if (
        new_message.username != this.state.username &&
        this.state.username != null &&
        this.state.username != undefined
      ) {
        play_new_message_sound_effect();
      }

      this.forceUpdate();
    });
  }

  render() {
    return (
      <div className="app_container flex_direction_column">
        {this.state.username != undefined ? (
          <Conversation_container
            messages={this.state.messages}
            new_message={this.state.new_message}
            send_new_message={this.send_new_message}
          ></Conversation_container>
        ) : (
          <div className="size_full flex_direction_column">
            <Alert_message
              message={this.state.alert_message}
              color={this.state.alert_color}
              alert_visibility={this.state.alert_visibility}
              dismiss_alert={this.dismiss_alert}
            ></Alert_message>
            <Menu register={this.register} log_in={this.log_in}></Menu>
          </div>
        )}
      </div>
    );
  }
}

async function main(){
  let username = await get_username();
  socket = io.connect();
  render(<App username={username}/>, root);
}

main();