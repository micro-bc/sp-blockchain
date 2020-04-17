const ws = require('ws');
const blockchain = require('./blockchain');

let server = new ws.Server({ noServer: true });

server.on('connection', onConnection);
function onConnection(socket) {
    console.log('New connection ', socket);
    //TODO
}

module.exports = {
    init: (port) => {
        server = new ws.Server({ port });
        console.log('Socket on port ' + port);
    },
    getPort: () => server.options.port
}
