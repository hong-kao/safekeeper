//web3 utility functions
import { isAddress, getAddress, formatEther, parseEther } from 'viem';

//validate ethereum address
export function isValidAddress(address) {
    return isAddress(address);
}

//normalize address to checksum format
export function normalizeAddress(address) {
    try {
        return getAddress(address);
    } catch {
        throw new Error(`Invalid address: ${address}`);
    }
}

//convert wei to eth
export function weiToEth(wei) {
    return formatEther(BigInt(wei));
}

//convert eth to wei
export function ethToWei(eth) {
    return parseEther(eth.toString());
}

//format large numbers for display
export function formatAmount(wei, decimals = 4) {
    const eth = Number(formatEther(BigInt(wei)));
    return eth.toFixed(decimals);
}

//shorten address for display (0x1234...5678)
export function shortenAddress(address, chars = 4) {
    if (!address) return '';
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

//calculate 50% coverage payout
export function calculatePayout(lossAmount) {
    const loss = BigInt(lossAmount);
    return (loss / 2n).toString();
}
