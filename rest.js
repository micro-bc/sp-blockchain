const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const blockchain = require('./blockchain');
const peerer = require('./peerer');

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);

app.get('/', (req, res) => {
    return res.json({
        status: 'Online',
        rest: req.connection.localPort,
        socket: peerer.getPort()
    });
});

app.get('/blocks', (req, res) => {
    return res.json({
        blocks: blockchain.getBlockchain() //TODO
    });
});
app.post('/mineBlock', (req, res) => {
    const block = blockchain.generateNextBlock(req.body.data); //TODO
    return res.status(201).json({
        block
    });
});

app.get('/peers', (req, res) => {
    return res.json({
        peers: peerer.getSockets()
    });
});
app.post('/addPeer', (req, res) => {
    peerer.connect(req.body.url); // TODO: check if succeded
    return res.status(201).json();
});

module.exports = {
    init: function (port) {
        app.set('port', port);
        server.listen(port);
        console.log('REST on port ' + port);
    }
}
