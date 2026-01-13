// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Pricing.sol";
import "./PolicyRegistry.sol";

contract InsurancePool{
    Pricing public pricingContract;
    PolicyRegistry public policyRegistry;
    
    address public admin;
    bool public paused;
    
    //50% coverage
    uint256 public constant COVERAGE_BPS = 5000;
    
    uint256 public poolBalance;
    uint256 public totalPremiumsCollected;
    uint256 public totalClaimsPaid;
    
    // Track premiums per policy ID
    mapping(uint256 => uint256) public policyPremiums;
    // Track claims per policy ID
    mapping(uint256 => bool) public policyClaimed;

    // ========== LP (Liquidity Provider) Storage ==========
    uint256 public totalLpShares;
    uint256 public lpAprBps; // e.g., 1500 = 15% APR

    struct LpPosition {
        uint256 shares;
        uint256 lastUpdated;
    }
    mapping(address => LpPosition) public lpPositions;

    // ========== Events ==========
    event InsurancePurchased(address indexed user, uint256 indexed policyId, uint256 positionSize, uint256 premium);
    event ClaimPaid(address indexed user, uint256 indexed policyId, uint256 lossAmount, uint256 payoutAmount);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event EmergencyWithdraw(address indexed by, uint256 amount);
    event PoolFunded(address indexed by, uint256 amount);
    
    // LP Events
    event LpDeposit(address indexed user, uint256 amount, uint256 sharesIssued);
    event LpWithdraw(address indexed user, uint256 sharesRedeemed, uint256 amountPaid);
    event LpAprUpdated(uint256 oldAprBps, uint256 newAprBps);

    modifier onlyAdmin(){
        require(msg.sender == admin, "InsurancePool: caller is not admin");
        _;
    }

    modifier notPaused(){
        require(!paused, "InsurancePool: pool is paused");
        _;
    }

    constructor(address _pricingContract){
        require(_pricingContract != address(0), "InsurancePool: invalid pricing address");
        
        admin = msg.sender;
        pricingContract = Pricing(_pricingContract);
        policyRegistry = new PolicyRegistry(address(this));
    }

    function buyInsurance(
        uint256 positionSize,
        uint256 leverage,
        uint256 liquidationPrice
    ) external payable notPaused returns (uint256){
        require(positionSize > 0, "InsurancePool: position size must be > 0");
        require(leverage > 0, "InsurancePool: leverage must be > 0");
        require(liquidationPrice > 0, "InsurancePool: liquidation price must be > 0");
        
        //volatility = 0 for mvp
        uint256 expectedPremium = pricingContract.premiumAmount(positionSize, leverage, 0);
        require(msg.value >= expectedPremium, "InsurancePool: insufficient premium");
        
        uint256 policyId = policyRegistry.createPolicy(
            msg.sender,
            positionSize,
            leverage,
            liquidationPrice,
            msg.value
        );
        
        policyPremiums[policyId] = msg.value;
        totalPremiumsCollected += msg.value;
        poolBalance += msg.value;
        
        emit InsurancePurchased(msg.sender, policyId, positionSize, msg.value);
        return policyId;
    }

    function submitClaim(address user, uint256 policyIndex, uint256 lossAmount) external onlyAdmin{
        require(user != address(0), "InsurancePool: invalid user address");
        require(lossAmount > 0, "InsurancePool: loss amount must be > 0");
        require(policyRegistry.isPolicyActive(user, policyIndex), "InsurancePool: no active policy at this index");
        
        PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(user, policyIndex);
        require(!policyClaimed[policy.id], "InsurancePool: claim already submitted for this policy");
        
        uint256 payout = (lossAmount * COVERAGE_BPS) / 10000;
        require(poolBalance >= payout, "InsurancePool: insufficient pool balance");
        
        //cei pattern
        policyClaimed[policy.id] = true;
        poolBalance -= payout;
        totalClaimsPaid += payout;
        
        policyRegistry.markClaimed(user, policyIndex);
        
        (bool success, ) = payable(user).call{value: payout}("");
        require(success, "InsurancePool: payout transfer failed");
        
        emit ClaimPaid(user, policy.id, lossAmount, payout);
    }

    function getPoolStatus() external view returns(
        uint256 balance,
        uint256 totalPremiums,
        uint256 totalClaims,
        uint256 activePolicies
    ){
        return (
            poolBalance,
            totalPremiumsCollected,
            totalClaimsPaid,
            policyRegistry.getActivePoliciesCount()
        );
    }

    function pause() external onlyAdmin{
        require(!paused, "InsurancePool: already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyAdmin{
        require(paused, "InsurancePool: not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    function changeAdmin(address newAdmin) external onlyAdmin{
        require(newAdmin != address(0), "InsurancePool: invalid admin address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    function emergencyWithdraw(uint256 amount) external onlyAdmin{
        require(amount <= address(this).balance, "InsurancePool: insufficient balance");
        poolBalance -= amount;
        
        (bool success, ) = payable(admin).call{value: amount}("");
        require(success, "InsurancePool: withdraw failed");
        
        emit EmergencyWithdraw(msg.sender, amount);
    }

    receive() external payable{
        poolBalance += msg.value;
        emit PoolFunded(msg.sender, msg.value);
    }

    // ========== LP Functions ==========

    /**
     * @notice LP deposits ETH into the pool and receives shares
     * @dev Share calculation: first deposit 1:1, later proportional to pool value
     */
    function deposit() external payable notPaused {
        require(msg.value > 0, "InsurancePool: deposit must be > 0");

        uint256 sharesToMint;
        if (totalLpShares == 0 || poolBalance == 0) {
            // First deposit: 1 ETH = 1 share
            sharesToMint = msg.value;
        } else {
            // Proportional: shares = deposit * totalShares / poolBalance
            sharesToMint = (msg.value * totalLpShares) / poolBalance;
        }

        require(sharesToMint > 0, "InsurancePool: shares minted must be > 0");

        // Update state
        poolBalance += msg.value;
        totalLpShares += sharesToMint;
        
        LpPosition storage lp = lpPositions[msg.sender];
        // If existing position, we simply add shares (for simplicity, reset lastUpdated)
        lp.shares += sharesToMint;
        lp.lastUpdated = block.timestamp;

        emit LpDeposit(msg.sender, msg.value, sharesToMint);
    }

    /**
     * @notice LP withdraws shares and receives ETH + accrued interest
     * @param shares Number of shares to redeem
     */
    function withdraw(uint256 shares) external {
        require(shares > 0, "InsurancePool: shares must be > 0");
        
        LpPosition storage lp = lpPositions[msg.sender];
        require(lp.shares >= shares, "InsurancePool: insufficient shares");
        require(totalLpShares > 0, "InsurancePool: no LP shares exist");

        // Calculate underlying ETH
        uint256 underlyingETH = (shares * poolBalance) / totalLpShares;

        // Calculate accrued interest
        uint256 dt = block.timestamp - lp.lastUpdated;
        uint256 interest = 0;
        if (dt > 0 && lpAprBps > 0) {
            // interest = underlying * aprBps * dt / (10000 * 365 days)
            interest = (underlyingETH * lpAprBps * dt) / (10000 * 365 days);
        }

        uint256 payout = underlyingETH + interest;
        
        // Cap payout to available pool balance to prevent overdraw
        if (payout > poolBalance) {
            payout = poolBalance;
        }

        // CEI: Update state before transfer
        lp.shares -= shares;
        lp.lastUpdated = block.timestamp;
        totalLpShares -= shares;
        poolBalance -= payout;

        // Transfer ETH to LP
        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "InsurancePool: withdraw transfer failed");

        emit LpWithdraw(msg.sender, shares, payout);
    }

    /**
     * @notice Preview pending interest for an LP
     * @param user Address of the LP
     * @return pendingInterest Estimated interest accrued so far
     */
    function previewLpYield(address user) external view returns (uint256 pendingInterest) {
        LpPosition memory lp = lpPositions[user];
        if (lp.shares == 0 || totalLpShares == 0) {
            return 0;
        }

        uint256 underlyingETH = (lp.shares * poolBalance) / totalLpShares;
        uint256 dt = block.timestamp - lp.lastUpdated;
        
        if (dt > 0 && lpAprBps > 0) {
            pendingInterest = (underlyingETH * lpAprBps * dt) / (10000 * 365 days);
        }
    }

    /**
     * @notice Get full LP position details
     * @param user Address of the LP
     * @return shares Number of LP shares held
     * @return underlying Current underlying ETH value
     * @return pendingInterest Estimated interest accrued
     */
    function getLpPosition(address user) external view returns (
        uint256 shares,
        uint256 underlying,
        uint256 pendingInterest
    ) {
        LpPosition memory lp = lpPositions[user];
        shares = lp.shares;

        if (shares == 0 || totalLpShares == 0) {
            return (shares, 0, 0);
        }

        underlying = (shares * poolBalance) / totalLpShares;
        uint256 dt = block.timestamp - lp.lastUpdated;
        
        if (dt > 0 && lpAprBps > 0) {
            pendingInterest = (underlying * lpAprBps * dt) / (10000 * 365 days);
        }
    }

    /**
     * @notice Admin sets the LP APR in basis points
     * @param newAprBps New APR in basis points (e.g., 1500 = 15%)
     */
    function setLpAprBps(uint256 newAprBps) external onlyAdmin {
        uint256 oldAprBps = lpAprBps;
        lpAprBps = newAprBps;
        emit LpAprUpdated(oldAprBps, newAprBps);
    }
}
