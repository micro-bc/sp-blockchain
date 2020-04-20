const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const blockchain = require('./blockchain/controller');
const peerer = require('./peerer');
const logger = require('./morgan');

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

app.get('/log', (req, res) => {
    return res.json({
        log: logger.getLog()
    });
});

app.use(logger.morgan());

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
    const data = req.body.data;
    if (!data) {
        return res.status(400).json({
            error: 'Empty field: data'
        });
    }

    blockchain.createBlock(data, (err, block) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        peerer.broadcastBlock(block);
        
        return res.status(201).json({
            block
        });
    });
});

/**
 * P2P
 */

app.get('/peers', (req, res) => {
    return res.json({
        peers: peerer.getSockets()
    });
});

app.get('/peerCount', (req, res) => {
    return res.json({
        peerCount: peerer.getSocketCount()
    });
});

app.post('/addPeer', (req, res) => {
    const url = req.body.url;
    if (!url) {
        return res.status(400).json({
            error: 'Empty field: url'
        });
    }

    peerer.connect(url, (err) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }

        return res.status(201).json({
            message: 'Connected to new peer'
        });
    });
});

module.exports = {
    init: function (port) {
        app.set('port', port);
        server.listen(port);
        console.log('REST on port ' + port);
    }
}
