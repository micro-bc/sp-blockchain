const ws = require('ws');
const blockchain = require('./blockchain/controller');

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

    //TODO
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

    connect: (url) => {
        const socket = new ws(url);

        socket.on('open', () => {
            onConnection(socket)
        });

        socket.on('error', () => {
            console.error('Error trying to connect to', socket.url);
        });
    },

}


/**
 * Helpers
 */

/** @param {ws} socket */
function getSocketUrl(socket) {
    return socket._socket.remoteAddress + ':' + socket._socket.remotePort;
}
