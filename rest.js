const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const blockchain = require('./blockchain/controller');
const peerer = require('./peerer');
const logger = require('./morgan');

const app = express();

/* CORS setup */
app.use(cors({ optionsSuccessStatus: 200 }));

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
    return res.json(logger.getLog());
});

app.get('/log/transactions/failed', (req, res) => {
    return res.json(
        logger.getLog().filter(le => le.method == 'POST' && le.url.endsWith('Transaction') && String(le.status).startsWith('4'))
    );
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

    blockchain.createBlock(publicKey, signature, (err, block) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }
        peerer.broadcastBlock(block);

        return res.status(201).json(block);
    });
});

app.get('/mempool', (req, res) => {
    return res.json(blockchain.getMempool(null));
});

app.get('/mempool/:address', (req, res) => {
    const address = req.params.address;
    if(!address) {
        return res.status(400).json({
            error: 'Empty field: address'
        });
    }

    if(!blockchain.userExists(address)) {
        return res.status(400).json({
            error: 'No such user'
        });
    }

    return res.status(200).json(blockchain.getMempool(address));
});

app.get('/balance/:address', (req, res) => {
    const address = req.params.address;
    if(!address) {
        return res.status(400).json({
            error: 'Empty field: address'
        });
    }

    if(!blockchain.userExists(address)) {
        return res.status(400).json({
            error: 'No such user'
        });
    }

    return res.status(200).json(blockchain.getBalance(address));
});

app.get('/transactions/:address', (req, res) => {
    const address = req.params.address;
    if(!address) {
        return res.status(400).json({
            error: 'Empty field: address'
        });
    }

    blockchain.mapTransactions(address, (err, transactions) => {
        if(err) {
            return res.status(400).json({
                error: err.message
            });
        }

        return res.status(200).json(transactions);
    });
});

app.post('/prepareTransaction', (req, res) => {
    const sender = req.body.sender;
    const reciever = req.body.reciever;
    const data = req.body.data;
    if(!sender || !reciever || !data) {
        return res.status(400).json({
            error: 'Empty field(s): sender, reciever and data required'
        });
    }

    blockchain.createTransaction(sender, reciever, data, (err, id) => {
        if(err) {
            return res.status(400).json({
                error: err.message
            });
        }

        return res.status(201).json(id);
    })
});

app.post('/sendTransaction', (req, res) => {
    const id = req.body.id;
    const publicKey = req.body.publicKey;
    const signature = req.body.signature;
    if (!id || !publicKey || !signature) {
        return res.status(400).json({
            error: 'Empty field(s): id, publicKey and signature required'
        });
    }

    blockchain.appendTransaction(id, publicKey, signature, (err, transaction) => {
        if(err) {
            return res.status(400).json({
                error: err.message
            });
        }

        peerer.broadcastTransaction(transaction);
        return res.status(201).json();
    });
});

app.post('/initWallet', (req, res) => {
    const publicKey = req.body.publicKey;
    const signature = req.body.signature;
    if (!publicKey || !signature) {
        return res.status(400).json({
            error: 'Empty field(s): publicKey and signature required'
        });
    }

    if(blockchain.userExists(publicKey)) {
        return res.status(400).json({
            error: 'Address already exists'
        });
    }

    blockchain.createBlock(publicKey, signature, (err, block) => {
        if (err) {
            return res.status(500).json({
                error: err.message
            });
        }
        
        peerer.broadcastBlock(block);
        return res.status(201).json();
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
