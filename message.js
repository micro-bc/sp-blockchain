class Message {
    /**
     * @param {MessageType} type 
     * @param {*} data 
     */
    constructor(type, data) {
        this.type = type;
        this.data = data;
    }
}

const MessageType = Object.freeze({
    'GET_LATEST': 0,
    'LATEST': 1,
    'GET_CHAIN': 2,
    'CHAIN': 3,
    'GET_PEERS': 4,
    'PEERS': 5,
});

module.exports = {
    MessageType,
    Message    
}