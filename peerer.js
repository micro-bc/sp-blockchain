const ws = require('ws');
const Block = require('./blockchain/Block');
const blockchain = require('./blockchain/controller');

const MessageType = Object.freeze({
    'GET_LATEST': 0,
    'LATEST': 1,
    'GET_CHAIN': 2,
    'CHAIN': 3
});


class Message {
    /**
     * @param {MessageType} type 
     * @param {*} data 
     */
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }
}


/** @type ws.Server */
let server;

/** @type ws[] */
const sockets = [];

/**
 * Handle new peer
 * 
 * @param {ws} socket 
 */
function onConnection(socket) {
    console.log('New connection', getSocketUrl(socket));
    sockets.push(socket);

    socket.on('close', () => {
        console.log('Socket closed', getSocketUrl(socket));
        sockets.splice(sockets.indexOf(socket), 1);
    });

    socket.on('error', (err) => {
        console.error('Error on socket');
        console.error(err);
    });

    socket.on('message', onMessage);
}

/**
 * Handle incomming message
 * 
 * @this ws
 * @param {string} data
 */
function onMessage(data) {
    /** @type Message */
    const message = JSON.parse(data);

    switch (message.type) {
        case MessageType.GET_LATEST:
            send(this, new Message(MessageType.LATEST, blockchain.latestBlock()));
            console.info("Sent latest block to", getSocketUrl(this));
            break;
        case MessageType.GET_CHAIN:
            send(this, new Message(MessageType.CHAIN, blockchain.get()));
            console.log("Sent full chain to", getSocketUrl(this));
            break;
        case MessageType.LATEST:
            /** @type Block */
            const block = Object.assign(new Block(), message.data);

            blockchain.appendBlock(block, (err) => {
                if (!err) {
                    broadcastBlock(block);
                    console.log("Got new block from", getSocketUrl(this));
                    return;
                }

                const latest = blockchain.latestBlock();
                if (block.index > latest.index) {
                    send(this, new Message(MessageType.GET_CHAIN));
                    console.log("Requesting full chain from", getSocketUrl(this));
                    return;
                }

                if (latest.hash === block.hash) {
                    return;
                }

                console.log("Ignoring latest block from", getSocketUrl(this));
            });
            break;
        case MessageType.CHAIN:
            /** @type Block[] */
            const chain = message.data;
            chain.forEach(block => block = Object.assign(new Block(), block));

            blockchain.replace(chain, (err) => {
                if (err) {
                    console.log("Got invalid chain from %s (%s)", getSocketUrl(this), err.message);
                    return;
                }

                console.log("Got full chain from", getSocketUrl(this));
            });
            break;
    }
}


module.exports = {

    /** @param {number} port */
    init: (port) => {
        server = new ws.Server({ port });
        server.on('connection', onConnection);
        console.log('Socket on port', port);
    },

    getPort: () => server.options.port,

    getSockets: () => sockets.map(s => getSocketUrl(s)),

    getSocketCount: () => sockets.length,

    /**
     * Connect to peer
     * 
     * @param {string} url
     * @param {resultCallback} cb
     */
    connect: function (url, cb) {
        const socket = new ws(url);

        socket.on('open', () => {
            cb();
            onConnection(socket);
        });

        socket.on('error', (err) => cb(err));
    },

    broadcastBlock: broadcastBlock,

}


/**
 * Helpers
 */

/** @param {Block} block */
function broadcastBlock(block) {
    sockets.forEach(socket => {
        socket.send(JSON.stringify(new Message(MessageType.LATEST, block)));
    });
}

/** @param {ws} socket */
function getSocketUrl(socket) {
    return socket._socket.remoteAddress + ':' + socket._socket.remotePort;
}

/**
 * @param {ws} socket 
 * @param {*} data 
 */
function send(socket, data) {
    socket.send(JSON.stringify(data));
}

/**
 * @callback resultCallback
 * @param {Error} err
 * @param {*} result
 */