const ws = require('ws');
const messagejs = require('./message');

const Message = messagejs.Message;
const MessageType = messagejs.MessageType;

const port = process.env.PORT || 2000;


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
        case MessageType.GET_PEERS:
            this._target = {
                url: this._socket.remoteAddress,
                port: message.data.port
            };
            const ret = sockets.map(s => s._target);
            ret.splice(sockets.indexOf(this), 1);
            send(this, new Message(MessageType.PEERS, ret));
            break;
        default:
            console.info("Ignoring incomming message from", getSocketUrl(this));
            break;
    }
}

const server = new ws.Server({ port });
server.on('connection', onConnection);
console.log('Tracker on port', port);


/**
 * Helpers
 */

function getSockets() {
    return sockets.map(s => getSocketUrl(s));
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
