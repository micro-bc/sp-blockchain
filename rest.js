const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const blockchain = require('./blockchain/controller');
const peerer = require('./peerer');
const Extras = require('./blockchain/models/Extras');
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

app.get('/log/failed', (req, res) => {
    return res.json({
        log: logger.getFailed() // TODO
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

app.get('/mempool', (req, res) => {
    return res.json({
        mempool: blockchain.getMempool()
    });
});

app.get('/mineBlock', (req, res) => {
    blockchain.createBlock((err, block) => {
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

app.get('/balance', (req, res) => {
    const { amount, extras } = blockchain.getBalance();
    return res.status(200).json({
        amount: amount,
        extras: extras
    });
});

app.get('/balance/:address', (req, res) => {
    const { amount, extras } = blockchain.getBalance(req.params.address);
    return res.status(200).json({
        amount: amount,
        extras: extras
    });
});

app.post('/transaction', (req, res) => {
    const address = req.body.address;
    const amount = req.body.amount;
    const extras = req.body.extras;
    const privateKey = req.body.privateKey;
    if (!address) {
        return res.status(400).json({
            error: 'Empty field: address'
        });
    }
    if (!privateKey) {
        return res.status(400).json({
            error: 'Empty field: privateKey'
        });
    }
    if (!amount) {
        return res.status(400).json({
            error: 'Empty fields: amount, extras'
        });
    }
    if (!extras)
        extras = new Extras(0, 0, 0, 0, 0, 0, 0);
    blockchain.createTransaction(address, amount, extras, privateKey, (err, tx) => {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        peerer.broadcastTransaction(tx);
        return res.status(201).json(tx);
    });
});

app.get('/newWallet', (req, res) => {
    blockchain.initWallet(null, (err, privateKey, publicKey) => {
        if (err)
            return res.status(400).json({
                error: err.message
            });
        else
            return res.json({
                privateKey: privateKey,
                publicKey: publicKey
            });
    });
})

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
