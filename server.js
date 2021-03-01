const express = require('express');
const path = require('path');
let dist_path = path.join(__dirname, "dist");
const app = express();
const port = 3000;
app.use(express.static("dist"));

let messages = [];
app.get("/", (req, res) => {
    res.status(200).sendFile("index.html");  
})


app.listen(port, () => console.log(`Example app listening on port ${port}!`))