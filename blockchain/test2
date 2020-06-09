#!/usr/bin/env node
const request = require('request');
const crypto = require('crypto');
const walletUtil = require('./models/Wallet');

const privateKey = '23cd3d786399f09be23b38ee3d5d9d62aa67729579a068d4ff4405c01d64ab5f'
const publicKey = '04de85eced4341035ecc8a7e8e232b01f90caab462f6888ee5d7f3fa85f3fda6c04a35dcc4d96d08d340ca1a2f73b2aa30f9118644b208efa8c41ebce548abc05a'

const INIT_DATA = {
    clicks: 500,
    masks: 200,
    respirators: 100,
    volunteers: 50,
    doctors: 20,
    ventilators: 5,
    researches: 3
}

request({
    uri: 'http://localhost:3001/initWallet',
    method: 'POST',
    json: {
        publicKey: publicKey,
        signature: walletUtil.sign(privateKey, INIT_DATA)
    }
}, (err, res, body) => {
    if (res.statusCode == 400)
        console.log("Wallet initialization failed");
    else if (res.statusCode == 201)
        console.log("Wallet initialized successfully");
    console.log(body)
});
