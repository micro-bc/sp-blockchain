const Block = require("./Block.js");

/**
 * @description blockchain saved as an array of Block objectes
 */
var chain = new Array(Block.genesisBlock);

/**
 * isValid()
 * @description checks block validity for all blocks in the chain
 * @param {Array<Block>}
 * @returns {boolean}
 */
const isValid = (chain) => {
    const genesisBlock = chain[0];
    if (genesisBlock.hash != Block.computeHash(genesisBlock.index, genesisBlock.timestamp, genesisBlock.data, genesisBlock.previousHash))
        return false;

    for (let i = 1; i < chain.length; i++) {
        if (!Block.isBlockValid(chain[i], chain[i - 1]))
            return false
    }

    return true;
}

module.exports = chain, isValid;