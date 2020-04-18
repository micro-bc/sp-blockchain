import { Block } from "./Block";
var blockchain = new Array<Block>();

module.exports = {
    /**
     * blockchain.get()
     * @returns { Array<Block> } - returns the entire blockchain
     */
    get: function (): Array<Block> { return blockchain; },

    /**
     * blockchain.latestBlock()
     * @returns { Block } - returns the latest block
     */
    latestBlock: function (): Block { return blockchain[blockchain.length - 1]; },

    /**
     * blockchain.createBlock()
     */
    createBlock: function () { },

    /**
     * blockchain.update()
     */
    update: function () { },

    /**
     * blockchain.appendBlock()
     */
    appendBlock: function () { }
}
