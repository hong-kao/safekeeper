// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PolicyRegistry{
    struct Policy{
        address user;
        uint256 positionSize;
        uint256 leverage;
        uint256 liquidationPrice;
        uint256 premiumPaid;
        uint256 createdAt;
        bool claimed;
        uint256 claimedAt;
    }

    mapping(address => Policy) public policies;
    address[] public activePolicies;
    mapping(address => uint256) private policyIndex;
    mapping(address => bool) private hasActivePolicy;
    address public insurancePool;

    event PolicyCreated(address indexed user, uint256 positionSize, uint256 leverage, uint256 premium);
    event PolicyClaimed(address indexed user, uint256 claimedAt);
    event InsurancePoolSet(address indexed pool);

    modifier onlyPool(){
        require(msg.sender == insurancePool, "PolicyRegistry: caller is not the insurance pool");
        _;
    }

    constructor(address _insurancePool){
        require(_insurancePool != address(0), "PolicyRegistry: invalid pool address");
        insurancePool = _insurancePool;
        emit InsurancePoolSet(_insurancePool);
    }

    function createPolicy(
        address user,
        uint256 positionSize,
        uint256 leverage,
        uint256 liquidationPrice,
        uint256 premium
    ) external onlyPool{
        require(user != address(0), "PolicyRegistry: invalid user address");
        require(!hasActivePolicy[user], "PolicyRegistry: user already has an active policy");
        
        policies[user] = Policy({
            user: user,
            positionSize: positionSize,
            leverage: leverage,
            liquidationPrice: liquidationPrice,
            premiumPaid: premium,
            createdAt: block.timestamp,
            claimed: false,
            claimedAt: 0
        });
        
        policyIndex[user] = activePolicies.length;
        activePolicies.push(user);
        hasActivePolicy[user] = true;
        
        emit PolicyCreated(user, positionSize, leverage, premium);
    }

    function markClaimed(address user) external onlyPool{
        require(hasActivePolicy[user], "PolicyRegistry: no active policy for user");
        require(!policies[user].claimed, "PolicyRegistry: policy already claimed");
        
        policies[user].claimed = true;
        policies[user].claimedAt = block.timestamp;
        hasActivePolicy[user] = false;
        
        //swap and pop for gas efficiency
        uint256 indexToRemove = policyIndex[user];
        uint256 lastIndex = activePolicies.length - 1;
        
        if(indexToRemove != lastIndex){
            address lastUser = activePolicies[lastIndex];
            activePolicies[indexToRemove] = lastUser;
            policyIndex[lastUser] = indexToRemove;
        }
        
        activePolicies.pop();
        delete policyIndex[user];
        
        emit PolicyClaimed(user, block.timestamp);
    }

    function hasPolicy(address user) external view returns(bool){
        return hasActivePolicy[user];
    }

    function getPolicy(address user) external view returns(Policy memory){
        return policies[user];
    }

    function getActivePoliciesCount() external view returns(uint256){
        return activePolicies.length;
    }

    function setInsurancePool(address _newPool) external onlyPool{
        require(_newPool != address(0), "PolicyRegistry: invalid pool address");
        insurancePool = _newPool;
        emit InsurancePoolSet(_newPool);
    }
}
