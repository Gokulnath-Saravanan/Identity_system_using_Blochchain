// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IdentityManager
 * @dev Smart contract for managing decentralized identities
 * Stores user profile information on blockchain including hashed Aadhaar
 */
contract IdentityManager {
    
    // Struct to store user identity information
    struct Identity {
        string name;
        string email;
        string hashedAadhaar;  // SHA-256 hash of Aadhaar number for privacy
        address ethAddress;
        uint256 registrationTime;
        bool isActive;
    }
    
    // Mapping from Ethereum address to Identity
    mapping(address => Identity) private identities;
    
    // Mapping to check if email is already registered
    mapping(string => bool) private emailExists;
    
    // Mapping to check if hashed Aadhaar is already registered
    mapping(string => bool) private aadhaarExists;
    
    // Array to store all registered addresses for enumeration
    address[] private registeredUsers;
    
    // Events for logging important actions
    event IdentityRegistered(
        address indexed userAddress,
        string name,
        string email,
        uint256 timestamp
    );
    
    event IdentityUpdated(
        address indexed userAddress,
        string name,
        string email,
        uint256 timestamp
    );
    
    event IdentityDeactivated(address indexed userAddress, uint256 timestamp);
    
    // Modifiers for access control
    modifier onlyRegisteredUser() {
        require(identities[msg.sender].isActive, "User not registered or inactive");
        _;
    }
    
    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        _;
    }
    
    /**
     * @dev Register a new identity on the blockchain
     * @param _name User's full name
     * @param _email User's email address
     * @param _hashedAadhaar SHA-256 hash of user's Aadhaar number
     */
    function registerIdentity(
        string memory _name,
        string memory _email,
        string memory _hashedAadhaar
    ) public {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_email).length > 0, "Email cannot be empty");
        require(bytes(_hashedAadhaar).length > 0, "Hashed Aadhaar cannot be empty");
        require(!identities[msg.sender].isActive, "Identity already registered");
        require(!emailExists[_email], "Email already registered");
        require(!aadhaarExists[_hashedAadhaar], "Aadhaar already registered");
        
        // Create new identity
        identities[msg.sender] = Identity({
            name: _name,
            email: _email,
            hashedAadhaar: _hashedAadhaar,
            ethAddress: msg.sender,
            registrationTime: block.timestamp,
            isActive: true
        });
        
        // Mark email and Aadhaar as used
        emailExists[_email] = true;
        aadhaarExists[_hashedAadhaar] = true;
        
        // Add to registered users array
        registeredUsers.push(msg.sender);
        
        emit IdentityRegistered(msg.sender, _name, _email, block.timestamp);
    
    /**
     * @dev Get user information by address
     * @param _userAddress The address of the user to retrieve
     * @return name User's name
     * @return email User's email
     * @return hashedAadhaar User's hashed Aadhaar number
     * @return ethAddress User's Ethereum address
     * @return registrationTime Registration timestamp
     * @return isActive Whether the identity is active
     */
    function getIdentity(address _userAddress) 
        public 
        view 
        validAddress(_userAddress)
        returns (
            string memory name,
            string memory email,
            string memory hashedAadhaar,
            address ethAddress,
            uint256 registrationTime,
            bool isActive
        ) 
    {
        require(identities[_userAddress].isActive, "Identity not found or inactive");
        
        Identity memory identity = identities[_userAddress];
        return (
            identity.name,
            identity.email,
            identity.hashedAadhaar,
            identity.ethAddress,
            identity.registrationTime,
            identity.isActive
        );
    }
    
   
    
    /**
     * @dev Check if an address has a registered identity
     * @param _userAddress Address to check
     * @return bool indicating if identity exists and is active
     */
    function isRegistered(address _userAddress) 
        public 
        view 
        validAddress(_userAddress)
        returns (bool) 
    {
        return identities[_userAddress].isActive;
    }
    
    /**
     * @dev Check if an email is already registered
     * @param _email Email to check
     * @return bool indicating if email is taken
     */
    function isEmailRegistered(string memory _email) 
        public 
        view 
        returns (bool) 
    {
        return emailExists[_email];
    }
    
    
    
    /**
     * @dev Get total number of registered users
     * @return Total count of registered users
     */
    function getTotalUsers() public view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            if (identities[registeredUsers[i]].isActive) {
                activeCount++;
            }
        }
        return activeCount;
    }
    
    /**
     * @dev Get all registered user addresses (active only)
     * @return Array of active user addresses
     */
    function getAllUsers() public view returns (address[] memory) {
        uint256 activeCount = getTotalUsers();
        address[] memory activeUsers = new address[](activeCount);
        
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            if (identities[registeredUsers[i]].isActive) {
                activeUsers[currentIndex] = registeredUsers[i];
                currentIndex++;
            }
        }
        
        return activeUsers;
    }
}
