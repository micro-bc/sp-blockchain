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

app.get('/balance/:address', (req, res) => {
    const address = req.params.address;
    if(!address)
        return res.status(400).json({
            error: 'Empty field: address'
        });
    if(!blockchain.userExists(address))
        return res.status(400).json({
            error: 'No such user'
        });
    blockchain.getBalance(address, (err, balance) => {
        if(err)
            return res.status(400).json({
                error: err.message
            });
        return res.status(200).json({balance});
    });
});

app.post('/prepareTransaction', (req, res) => {
    const sender = req.body.sender;
    const reciever = req.body.reciever;
    const data = req.body.data;
    if(!sender || !reciever)
        return res.status(400).json({
            error: 'Empty field(s): sender or reciever'
        });
    if(!data)
        return res.status(400).json({
            error: 'Empty field: data'
        });
    blockchain.createTransaction(sender, reciever, data, (err, id) => {
        if(err)
            return res.status(400).json({
                error: err.message
            });
        return res.status(201).json({transactionId: id});
    })
});

app.post('/appendTransaction', (req, res) => {
    const id = req.body.id;
    const publicKey = req.body.publicKey;
    const signature = req.body.signature;
    if (!id) {
        return res.status(400).json({
            error: 'Empty field: id'
        });
    }
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
    blockchain.appendTransaction(id, publicKey, signature, (err, transaction) => {
        if(err)
            return res.status(400).json({
                error: err.message
            });
        peerer.broadcastTransaction(transaction);
        return res.status(201).json();
    });
});

// app.post('/transaction', (req, res) => {
//     const address = req.body.address;
//     const amount = req.body.amount;
//     const extras = req.body.extras;
//     const privateKey = req.body.privateKey;
//     if (!address) {
//         return res.status(400).json({
//             error: 'Empty field: address'
//         });
//     }
//     if (!privateKey) {
//         return res.status(400).json({
//             error: 'Empty field: privateKey'
//         });
//     }
//     if (!amount) {
//         return res.status(400).json({
//             error: 'Empty fields: amount, extras'
//         });
//     }
//     if (!extras)
//         extras = new Extras(0, 0, 0, 0, 0, 0, 0);
//     blockchain.createTransaction(address, amount, extras, privateKey, (err, tx) => {
//         if (err) {
//             return res.status(400).json({
//                 error: err.message
//             });
//         }

//         peerer.broadcastTransaction(tx);
//         return res.status(201).json(tx);
//     });
// });

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
        return res.status(201).json({ block });
    });
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
    if(!blockchain.userExists(publicKey))
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
