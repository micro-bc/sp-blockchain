/**
 * @description Block class definition
 */

export class Block {
    public index: number;
    public timestamp: number;
    public data: string;
    public hash: string;
    public previousHash: string;

    /**
     *
     * @param {number} index - Block index
     * @param {number} timestamp - Block creation timestamp
     * @param {string} data - Additional block data
     * @param {string} hash - Block's hash value
     * @param {string} previousHash - Previous Block's hash value
     */

    constructor(index: number, timestamp: number, data: string, hash: string, previousHash: string) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
        this.previousHash = previousHash;
    }
}