import * as React from "react";
import {render} from "react-dom";
import {io} from "socket.io/client-dist/socket.io";
import {Howl} from "howler";
import assets from "./assets/*.mp3";
let root = document.querySelector("#root");
let origin = location.origin;
let socket = io.connect();
let sound_enabled = true;

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
    if (this.props.new_message != undefined) {
      let new_message = this.props.new_message;
      let new_message_markup = (
        <Message message={new_message} key={this.markup.length}></Message>
      );
      this.markup.push(new_message_markup);
    }

    return (
      <div className="conversation_container">
        <div className="messages_container">{this.markup}</div>
        <New_message_menu
          send_new_message={this.props.send_new_message}
        ></New_message_menu>
      </div>
    );
  }
}

class Menu extends React.Component {
  socket_binded: boolean;

  constructor(props) {
    super(props);
    this.state = {
      name_selection_phase: true,
      username: "",
    };
    this.socket_binded = false;
  }

  on_username_change = (ev) => {
    this.setState({
      username: ev.target.value,
    });
  };

  handle_username = () => {
    let username = this.state.username;
    let bool;

    //Checks if username is available through the is_username_available socket route

    socket.on("is_username_available_response", (data) => {
      let parsed = JSON.parse(data);
      bool = parsed;

      if (bool === true) {
        this.props.select_username(username);
      } else {
        alert("This username is already taken!");
      }
      //Prevents bugs with socket duplication and wrong names selected
      socket.removeListener("is_username_available_response");
    });

    let obj = {
      username: username,
    };
    socket.emit("is_username_available", JSON.stringify(obj));
  };

  render() {
    return (
      <div className="conversation_container">
        {this.state.name_selection_phase === true ? (
          <div className="name_select_container flex_direction_column">
            <h2>Username:</h2>
            <input
              className="form-control"
              value={this.state.username}
              onChange={this.on_username_change}
            ></input>
            <button className="btn btn-primary" onClick={this.handle_username}>
              Submit
            </button>
          </div>
        ) : null}
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      should_display_conversation: false,
      messages_received: false,
      new_message: undefined,
      messages: [],
      username: undefined,
    };
  }
  select_username = (username) => {
    //Transmit selected username to the server via register_username socket route
    socket.emit("register_username", JSON.stringify(username));
    this.setState({
      username: username,
      should_display_conversation: true,
    });
  };

  send_new_message = (message_text) => {
    if (message_text != "") {
      let message_obj = {
        username: this.state.username,
        time: new Date().toLocaleTimeString("en-GB", {
          hour: "numeric",
          minute: "numeric",
        }),
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
    socket.on("new_message", (data) => {
      let new_message = JSON.parse(data);

      this.state.messages.push(new_message);
      this.state.new_message = new_message;
      play_new_message_sound_effect();
      this.forceUpdate();
    });
  }

  render() {
    return (
      <div className="app_container flex_direction_column">
        {this.state.should_display_conversation === true &&
        this.state.messages_received === true ? (
          <Conversation_container
            messages={this.state.messages}
            new_message={this.state.new_message}
            send_new_message={this.send_new_message}
          ></Conversation_container>
        ) : (
          <Menu select_username={this.select_username}></Menu>
        )}
      </div>
    );
  }
}

render(<App />, root);
