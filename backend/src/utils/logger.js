// Color logging utility for better console readability
import chalk from 'chalk';

// Define log prefixes with colors
const log = {
    // Monitor logs - Cyan
    monitor: (msg) => console.log(chalk.cyan(`[MONITOR] ${msg}`)),
    monitorSafe: (msg) => console.log(chalk.green(`[MOCK] 🟢 ${msg}`)),
    monitorDanger: (msg) => console.log(chalk.red(`[MOCK] 🔴 ${msg}`)),

    // Price logs - Yellow
    price: (msg) => console.log(chalk.yellow(`[PRICE] ${msg}`)),

    // Buy/Policy logs - Magenta
    buy: (msg) => console.log(chalk.magenta(`[BUY] ${msg}`)),
    buySuccess: (msg) => console.log(chalk.magenta.bold(`[BUY] ✅ ${msg}`)),

    // Claim logs - Blue
    claim: (msg) => console.log(chalk.blue(`[CLAIM] ${msg}`)),
    claimSuccess: (msg) => console.log(chalk.blue.bold(`[CLAIM] ✅ ${msg}`)),
    claimError: (msg) => console.log(chalk.red.bold(`[CLAIM] ❌ ${msg}`)),

    // WebSocket logs - Gray
    ws: (msg) => console.log(chalk.gray(`[WS] ${msg}`)),

    // Policy logs - White
    policies: (msg) => console.log(chalk.white(`[POLICIES] ${msg}`)),

    // Prisma logs - Dim
    prisma: (msg) => console.log(chalk.dim(`[PRISMA] ${msg}`)),

    // Error logs - Red
    error: (msg) => console.log(chalk.red.bold(`[ERROR] ❌ ${msg}`)),

    // Success logs - Green bold
    success: (msg) => console.log(chalk.green.bold(`✅ ${msg}`)),

    // Liquidation alert - Red background
    liquidation: (msg) => console.log(chalk.bgRed.white.bold(`\n🔴🔴🔴 LIQUIDATION TRIGGERED 🔴🔴🔴\n${msg}\n`)),

    // Payout complete - Green background
    payout: (msg) => console.log(chalk.bgGreen.black.bold(`\n✅✅✅ PAYOUT COMPLETE ✅✅✅\n${msg}\n`)),

    // Force crash - Yellow background
    crash: (msg) => console.log(chalk.bgYellow.black.bold(`\n📉 MARKET CRASH 📉\n${msg}\n`)),
};

export default log;
