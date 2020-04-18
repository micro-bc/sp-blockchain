const Block = require("./Block.js");

/**
 * @description blockchain saved as an array of Block objectes
 */
var chain = new Array(Block.genesisBlock);

module.exports = chain;