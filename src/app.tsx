import * as React from 'react';
import { render } from 'react-dom';
let root = document.querySelector("#root");
let messages = [{
    time: "23:55:23",
    username: "Vladiak",
    message_text: "Hello world"
}, {
    time: "12:06:12",
    username: "Egorcik",
    message_text: "I am the best jhin in EU"
},
{
    time: "13:12:46",
    username: "Mia boyka",
    message_text: `
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus ac nulla iaculis, aliquet lacus sit amet, congue odio. Nullam pharetra sapien a efficitur fermentum. Fusce sit amet volutpat ante. Vestibulum ac risus fermentum ex laoreet pharetra ornare at leo. Vestibulum posuere, dolor at tincidunt fermentum, tortor purus commodo dui, et vehicula velit ligula at risus. Aliquam non tristique sapien, hendrerit tristique neque. Sed tincidunt sed diam et pharetra. Proin vel lorem volutpat, faucibus risus lobortis, tincidunt velit. Quisque mauris turpis, iaculis id eros at, consequat gravida nibh.

Quisque nec ullamcorper urna. Maecenas id nisi viverra augue porttitor iaculis. Cras lobortis nisi ut risus pretium egestas. Maecenas hendrerit erat lectus, volutpat tempor justo gravida in. Fusce varius nisl arcu, luctus ullamcorper ante pulvinar facilisis. In congue dictum tempus. Vivamus non nunc eleifend, ultrices mi ut, consectetur lectus. Donec vehicula, enim at condimentum semper, est metus ultrices erat, sit amet mattis dui purus eu felis. Vivamus pretium risus vel commodo ornare. Quisque dapibus ut justo non ultrices. Donec dapibus sapien sit amet semper scelerisque. Nullam pretium sagittis varius.
    `
}]


class Message extends React.Component{
    message: any;
    constructor(props){
        super(props);
        this.message = this.props.message;
    }
    render(){
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
        )
    }
}


class Message_container extends React.Component{
    messages: any;
    markup: any;
    constructor(props){
        super(props);
        this.messages = this.props.messages;
        this.markup = this.messages.map((message, index) => {
            return (
                <Message message={message} key={index}>

                </Message>
            )
        })
    }
    render(){
        return (
            <div className="conversation_container">
                {this.markup}
            </div>
        )
    }
}


class App extends React.Component{
    constructor(props){
        super(props);
    }
    render(){
        return (
            <Message_container messages={messages}>
            </Message_container>
        )
    }
}


render(<App/>, root);