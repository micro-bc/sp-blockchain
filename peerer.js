const ws = require('ws');
const Block = require('./blockchain/Block');
const blockchain = require('./blockchain/controller');
const messagejs = require('./message');

const MessageType = messagejs.MessageType;
const Message = messagejs.Message;


/** @type ws.Server */
let server;

/** @type ws */
let tracker;

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
        sockets.splice(sockets.indexOf(socket), 1);
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

                broadcastBlock(blockchain.latestBlock());
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
    connect: function (url, cb = (err, res) => {}) {
        const socket = new ws(url);

        socket.on('open', () => {
            cb();
            onConnection(socket);
        });

        socket.on('error', (err) => cb(err));
    },

    broadcastBlock: broadcastBlock,

    initTracker: initTracker,

}


/**
 * Helpers
 */

function initTracker(trackerUrl) {
    if (tracker != null && tracker.OPEN) {
        sockets.forEach(s => s.close());
        sockets.splice(0, sockets.length);
        tracker.close();
    }

    tracker = new ws(trackerUrl);

    tracker.on('open', () => {
        tracker.on('message', (data) => {
            /** @type Message */
            const message = JSON.parse(data);

            if (message.type == MessageType.PEERS) {
                message.data.forEach(s => module.exports.connect('ws://' + s.url.substring(7) + ':' + s.port));
            }
        });

        send(tracker, new Message(MessageType.GET_PEERS, { port: server.options.port }));
    });

    tracker.on('error', (err) => console.error("Tracker not found"));
}

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