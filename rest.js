const http = require('http');
const express = require('express');
const blockchain = require('./blockchain/controller');
const peerer = require('./peerer');

const app = express();
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
    res.json({
        peers: peerer.getSockets().map(s => s._socket.remoteAddress + ':' + s._socket.remotePort) //TODO
    });
});
app.post('/addPeer', (req, res) => {
    peerer.connectToPeers(req.body.peer); //TODO
    return res.status(201);
});

module.exports = {
    init: function (port) {
        app.set('port', port);
        server.listen(port);
        console.log('REST on port ' + port);
    }
}
