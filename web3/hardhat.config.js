require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SHARDEUM_RPC = process.env.SHARDEUM_RPC_URL || "https://api-mezame.shardeum.org";

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: false,
            },
        },
    },
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
        tenderly: {
            url: process.env.TENDERLY_RPC_URL || "",
            chainId: parseInt(process.env.TENDERLY_CHAIN_ID || "1"),
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
        },
        shardeum: {
            url: SHARDEUM_RPC,
            chainId: 8119,
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
            gas: 20000000,
            gasPrice: 30000000000,
        },
    },
};
