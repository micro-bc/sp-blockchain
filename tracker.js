const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const peerer = require('./peerer');

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);

const port = process.env.PORT || 3000;



/** @type Peer[] */
const peers = [];
peers[0].

app.get('/peers', (req, res) => {

});


app.set(port);
server.listen(port);
server.on('listening', () => {
    console.log('Tracker on port', port);
})