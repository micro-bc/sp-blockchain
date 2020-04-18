const portfinder = require('portfinder');
const rest = require('./rest');
const peerer = require('./peerer');


const baseRestPort = 3000;
const maxRestPort = 3999;
const baseSocketPort = 4000;
const maxSocketPort = 4999;


portfinder.getPortPromise({
    port: baseSocketPort,
    stopPort: maxSocketPort
}).then(port => {
    peerer.init(port);
}).catch((e) => {
    console.error("Failed to find Socket port!\n");
    console.error(e);
    process.exit(1);
});

portfinder.getPortPromise({
    port: baseRestPort,
    stopPort: maxRestPort
}).then(port => {
    rest.init(port);
}).catch(() => {
    console.error("Failed to find REST port!");
    console.error(e);
    process.exit(1);
});