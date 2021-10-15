#!/usr/bin/env node

const fileToIpfs = require('@kleros/file-to-ipfs');

const policies = [
  "xDai-English-Language-Court-Policy.json",
  "xDai-Spanish-English-Language-Court-Policy.json",
  "xDai-French-English-Language-Court-Policy.json",
  "xDai-Portuguese-English-Language-Court-Policy.json",
  "xDai-German-English-Language-Court-Policy.json",
  "xDai-Russian-English-Language-Court-Policy.json",
  "xDai-Korean-English-Language-Court-Policy.json",
  "xDai-Japanese-English-Language-Court-Policy.json",
  "xDai-Turkish-English-Language-Court-Policy.json",
  "xDai-Chinese-English-Language-Court-Policy.json",
]

async function main() {
  console.log("");
  for (let i = 0; i < policies.length; i++) {
    const ipfsPath = await fileToIpfs(`subcourt-policies/${policies[i]}`);
    console.log(ipfsPath);
  }
  console.log("");
};

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
});