#!/usr/bin/env node
const request = require('request');
const crypto = require('crypto');
const walletUtil = require('./new_models/Wallet');

const privateKey = '30820155020100300d06092a864886f70d01010105000482013f3082013b020100024100b35e6b4a260607e4c789f673cec1cc57ae1fffabf92531504e3f56d7754c540e02e5b2419ed9b5168c832ecf8dc3e79f10dcce6e46ffc7567f90b3769ce3038b0203010001024071b30d61a03ebc6c3a4c6aec3808c306657b252f972c0b597370551518e6bc7460a153506e31d327fc34e64f5c78e63ed5069a283a0cb693de911c157811f2b9022100e91f46b2314bed48e7c806e06bcdafc66f2da121ba441100ee0690426ea661f7022100c4f8b2d8ddf23dfc1f96e01ad7d714f36945a2609e798ff6d8d988dc0bedc60d022047eae82a6cded993163e3530e2d10f9b0e0d6b9a36166d9075ddfc7f22179e3d022100872b5c2072ff00067aef20cf8afb308771e0b573b48d1b7c7c879be1d5d5d02902210092017393514e825c3ef553ebed33a00a8ba302b0ed647b111350b4bda8ce83c2';
const publicKey = '305c300d06092a864886f70d0101010500034b003048024100b35e6b4a260607e4c789f673cec1cc57ae1fffabf92531504e3f56d7754c540e02e5b2419ed9b5168c832ecf8dc3e79f10dcce6e46ffc7567f90b3769ce3038b0203010001';

request({
    uri: 'http://localhost:3001/initWallet',
    method: 'POST',
    json: {
        publicKey: publicKey,
        signature: walletUtil.sign(privateKey, "initWallet")
    }
}, (err, res, body) => {
    if (res.statusCode == 400)
        console.log("Wallet initialization failed");
    else if (res.statusCode == 201)
        console.log("Wallet initialized successfully");
    console.log(body)
});

//request({
//    uri: 'http://localhost:3001/balance',
//    method: 'GET',
//}, (err, res, body) => {
//    //console.log(body)
//});
