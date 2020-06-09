const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const blockchain = require('./blockchain/controller');
const txUtil = require('./blockchain/new_models/Transaction');
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

app.get('/log/transactions/failed', (req, res) => {
    return res.json({
        log: logger.getLog().filter(le => le.method == 'POST' && le.url == '/transaction' && String(le.status).startsWith('4'))
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

app.get('/balance/:address', (req, res) => {
    const address = req.params.address;
    if(!address) {
        return res.status(400).json({
            error: 'Empty field: address'
        });
    }

    blockchain.getBalance(address, (err, balance) => {
        if(err) {
            return res.status(500).json({
                error: err.message
            });
        }

        return res.status(200).json(balance);
    });
});

app.get('/transactions/:address', (req, res) => {
    const address = req.params.address;
    if(!address) {
        return res.status(400).json({
            error: 'Empty field: address'
        });
    }

    // TODO: blockchain.getTransactions...
    return res.status(200).json([
        Object.assign({ sender: 'xxxxxxxxxx', reciever: address }, txUtil.INIT_DATA),
        Object.assign({ reciever: 'xxxxxxxxxx', sender: address }, txUtil.INIT_DATA)
    ]);
});

app.post('/transaction', (req, res) => {
    const tx = req.body.transaction;
    const sig = req.body.signature;
    if (!tx || !sig) {
        return res.status(400).json({
            error: 'Empty field(s): transaction and signature required'
        });
    }

    return res.status(201).json(tx);
    /*
    blockchain.createTransaction(address, amount, extras, privateKey, (err, tx) => {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }
        peerer.broadcastTransaction(tx);
        return res.status(201).json(tx);
    });*/
});

app.post('/initWallet', (req, res) => {
    const publicKey = req.body.publicKey;
    const signature = req.body.signature;
    if (!publicKey) {
        return res.status(400).json({
            error: 'Empty field: publicKey'
        });
    }
    if (!signature) {
        return res.status(400).json({
            error: 'Empty field: signature'
        });
    }

    blockchain.initWallet(publicKey, signature, (err, userExists) => {
        if (err) {
            return res.status(400).json({
                error: err.message
            });
        }

        if (!userExists) {
            const initialTx = txUtil.initialTransaction(publicKey, blockchain.latestBlock().index + 1, signature);

            blockchain.appendTransaction(initialTx, (err) => {
                if (err) {
                    return res.status(400).json({
                        error: err.message
                    });
                }
            });

            blockchain.createBlock((err, block) => {
                if (err) {
                    return res.status(400).json({
                        error: err.message
                    });
                }

                peerer.broadcastBlock(block);
            });

            return res.status(201).json({
                initialTransaction: initialTx
            });
        }

        return res.status(400).json({
            error: 'Address already exists'
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
