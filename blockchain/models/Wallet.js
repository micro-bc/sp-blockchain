const ec = require('elliptic');
const EC = new ec.ec('secp256k1');

/**
 * Wallet.generateKeypair()
 * @description create a new keypair
 * @returns {{string, string}} {privateKey, publicKey}
 */
function generateKeypair() {
    const kp = EC.genKeyPair()
    const x = kp.getPrivate('hex');
    const y = kp.getPublic('hex');
    return { privateKey: x, publicKey: y };
}

/**
 * wallet.sign()
 * @param {string} privatekey
 * @param {string} data
 * @returns {string} signature
 */
function sign(privateKey, data) {
    const kp = EC.keyFromPrivate(privateKey, 'hex');
    return kp.sign(data, 'utf-8').toDER('hex');
}

/**
 * Wallet.isSignatureValid()
 * @param {string} signature
 * @param {string} publicKey
 * @param {string} data
 * @returns {boolean} isValid
 */
function isSignatureValid(signature, publicKey, data) {
    const kp = EC.keyFromPublic(publicKey, 'hex');
    return kp.verify(data, signature);
}

module.exports = {
    generateKeypair, sign, isSignatureValid
}
