const express = require("express");

path = require("path");
bodyParser = require("body-parser");
cors = require("cors");
// require('dotenv').config();


/*
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect(dbUri, { useNewURL_CARDSParser: true}).then(
    () => {console.log("Database is connected") }, 
    err => {console.log("Can not connect to the Database " + err)});
*/  
const app = express();
app.use(cors());
app.use(bodyParser.json());

const cardRoute = require('./routes/cards');
app.use('/cards', cardRoute);

app.get("/", function(req, res) {
    res.send("<h1>Servidor rodando com ExpressJS</h1>");
});

app.get("/index", function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'));
});



app.listen(3000, function() {
    console.log("Listening on port 3000!");
});
