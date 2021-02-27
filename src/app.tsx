import * as React from "react";
import {render} from "react-dom";
let root = document.querySelector("#root");
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
];

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
      is_text_area_focused: false
    };
  }

  on_textarea_change_focus = (bool) => {
    this.setState({
        is_text_area_focused: bool
    })
  }

  on_textarea_value_change = () => {

  }

  render() {
    let classes = "new_message_container";
    if(this.state.is_text_area_focused === true){
        classes += " focused";
    }
    return (
      <div className={classes}>
        <textarea placeholder="Type new message here..." spellCheck="false" autoComplete="false" onFocus={() => {this.on_textarea_change_focus(true)}} onBlur={() => {this.on_textarea_change_focus(false)}} value={this.state.message_text} onChange={this.on_textarea_value_change}></textarea>
      </div>
    );
  }
}

class Conversation_container extends React.Component {
  messages: any;
  markup: any;
  constructor(props) {
    super(props);
    this.messages = this.props.messages;
    this.markup = this.messages.map((message, index) => {
      return <Message message={message} key={index}></Message>;
    });
  }
  render() {
    return (
      <div className="conversation_container">
        <div className="messages_container">{this.markup}</div>
        <New_message_menu></New_message_menu>
      </div>
    );
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <Conversation_container messages={messages}></Conversation_container>
    );
  }
}

render(<App />, root);
