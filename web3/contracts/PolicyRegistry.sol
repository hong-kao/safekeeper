// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PolicyRegistry{
    struct Policy{
        uint256 id;
        address user;
        uint256 positionSize;
        uint256 leverage;
        uint256 liquidationPrice;
        uint256 premiumPaid;
        uint256 createdAt;
        bool claimed;
        uint256 claimedAt;
    }

    // User => array of policies (supports multiple policies per user)
    mapping(address => Policy[]) public userPolicies;
    
    // Global policy counter for unique IDs
    uint256 public nextPolicyId;
    
    // Track total active policies count
    uint256 public activePoliciesCount;
    
    address public insurancePool;

    event PolicyCreated(address indexed user, uint256 indexed policyId, uint256 positionSize, uint256 leverage, uint256 premium);
    event PolicyClaimed(address indexed user, uint256 indexed policyId, uint256 claimedAt);
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
    ) external onlyPool returns (uint256){
        require(user != address(0), "PolicyRegistry: invalid user address");
        
        uint256 policyId = nextPolicyId++;
        
        userPolicies[user].push(Policy({
            id: policyId,
            user: user,
            positionSize: positionSize,
            leverage: leverage,
            liquidationPrice: liquidationPrice,
            premiumPaid: premium,
            createdAt: block.timestamp,
            claimed: false,
            claimedAt: 0
        }));
        
        activePoliciesCount++;
        
        emit PolicyCreated(user, policyId, positionSize, leverage, premium);
        return policyId;
    }

    function markClaimed(address user, uint256 policyIndex) external onlyPool{
        require(policyIndex < userPolicies[user].length, "PolicyRegistry: invalid policy index");
        Policy storage policy = userPolicies[user][policyIndex];
        require(!policy.claimed, "PolicyRegistry: policy already claimed");
        
        policy.claimed = true;
        policy.claimedAt = block.timestamp;
        activePoliciesCount--;
        
        emit PolicyClaimed(user, policy.id, block.timestamp);
    }

    // Check if user has any active (unclaimed) policy
    function hasPolicy(address user) external view returns(bool){
        Policy[] storage policies = userPolicies[user];
        for(uint256 i = 0; i < policies.length; i++){
            if(!policies[i].claimed){
                return true;
            }
        }
        return false;
    }

    // Check if a specific policy is active
    function isPolicyActive(address user, uint256 policyIndex) external view returns(bool){
        if(policyIndex >= userPolicies[user].length) return false;
        return !userPolicies[user][policyIndex].claimed;
    }

    // Get a specific policy by index
    function getPolicy(address user, uint256 policyIndex) external view returns(Policy memory){
        require(policyIndex < userPolicies[user].length, "PolicyRegistry: invalid policy index");
        return userPolicies[user][policyIndex];
    }

    // Get all policies for a user
    function getUserPolicies(address user) external view returns(Policy[] memory){
        return userPolicies[user];
    }

    // Get count of policies for a user
    function getUserPoliciesCount(address user) external view returns(uint256){
        return userPolicies[user].length;
    }

    // Get all active (unclaimed) policies for a user
    function getActivePolicies(address user) external view returns(Policy[] memory){
        Policy[] storage allPolicies = userPolicies[user];
        
        // Count active policies first
        uint256 activeCount = 0;
        for(uint256 i = 0; i < allPolicies.length; i++){
            if(!allPolicies[i].claimed){
                activeCount++;
            }
        }
        
        // Create result array
        Policy[] memory activePolicies = new Policy[](activeCount);
        uint256 index = 0;
        for(uint256 i = 0; i < allPolicies.length; i++){
            if(!allPolicies[i].claimed){
                activePolicies[index] = allPolicies[i];
                index++;
            }
        }
        
        return activePolicies;
    }

    function getActivePoliciesCount() external view returns(uint256){
        return activePoliciesCount;
    }

    function setInsurancePool(address _newPool) external onlyPool{
        require(_newPool != address(0), "PolicyRegistry: invalid pool address");
        insurancePool = _newPool;
        emit InsurancePoolSet(_newPool);
    }
}
