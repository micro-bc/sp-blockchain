#!/usr/bin/env node
const request = require('request');
const crypto = require('crypto');
const walletUtil = require('./models/Wallet');

const privateKey = '8a915a32c8a143ce81ec467e6ea24c7ff5965bd791be0acf5a92dfdcc76cf425'
const publicKey = '0417e97758468edb4adf37980925482e610c2cd73c803f7514d7bed409e383287a3a6a435db1280a54f490bc4234106a478d8ff4523805e9b59445562846f8e6c9'
//const { privateKey, publicKey } = walletUtil.generateKeypair()

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

request({
    uri: 'http://localhost:3001/balance/' + publicKey,
    method: 'GET',
}, (err, res, body) => {
    console.log(body)
});
