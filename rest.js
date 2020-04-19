const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const blockchain = require('./blockchain/controller');
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

/**
 * Blockchain
 */

app.get('/blocks', (req, res) => {
    return res.json({
        blocks: blockchain.get()
    });
});

app.get('/latestBlock', (req, res) => {
    return res.json({
        block: blockchain.latestBlock()
    });
});

app.post('/mineBlock', (req, res) => {
    const block = blockchain.createBlock(req.body.data);
    if (!block) {
        return res.status(400).json({
            error: "Invalid field: data"
        });
    }

    if (blockchain.appendBlock(block)) { //TODO: async.. mineBlock??
        peerer.broadcastBlock(block);
        return res.status(201).json({
            block
        });
    }
    else {
        return res.status(500).json({
            error: "Something went wrong"
        });
    }
});

/**
 * P2P
 */

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
