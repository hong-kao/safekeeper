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

    event InsurancePurchased(address indexed user, uint256 indexed policyId, uint256 positionSize, uint256 premium);
    event ClaimPaid(address indexed user, uint256 indexed policyId, uint256 lossAmount, uint256 payoutAmount);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event EmergencyWithdraw(address indexed by, uint256 amount);
    event PoolFunded(address indexed by, uint256 amount);

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
}
