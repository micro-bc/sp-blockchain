const portfinder = require('portfinder');
const blockchain = require('./blockchain/controller');
const rest = require('./rest');
const peerer = require('./peerer');
const fs = require('fs');


const baseRestPort = 3000;
const maxRestPort = 3999;
const baseSocketPort = 4000;
const maxSocketPort = 4999;


let peerPortP = portfinder.getPortPromise({
    port: baseSocketPort,
    stopPort: maxSocketPort
}).then(port => {
    peerer.init(port);
    return port;
}).catch((e) => {
    console.error("Failed to find Socket port!\n");
    console.error(e);
    process.exit(1);
});

let restPortP = portfinder.getPortPromise({
    port: baseRestPort,
    stopPort: maxRestPort
}).then(port => {
    rest.init(port);
    blockchain.initBackup('bkp_' + port);
    return port;
}).catch((e) => {
    console.error("Failed to find REST port!");
    console.error(e);
    process.exit(1);
});

peerPortP.then(peerPort => {
    restPortP.then(restPort => {
        peerer.initTracker('ws://localhost:2000', peerPort, restPort);
    });
});
