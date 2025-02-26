// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import './ERC1155Token.sol';

contract ERC1155TokenFactory is ERC2771Context {
    string public version = "1.0.0";
    
    address public signerAuthority;
    address public trustedForwarder;
    address public owner;
    
    address[] private _deployedContracts;
    
    event ERC1155Created(address indexed owner, address indexed erc1155Contract);
    
    constructor(address _signerAuthority, address _trustedForwarder) ERC2771Context(_trustedForwarder) {
        signerAuthority = _signerAuthority;
        trustedForwarder = _trustedForwarder;
        owner = msg.sender;
    }
    
    function createERC1155(
        string memory contractName, 
        string memory uri, 
        string[] memory tokensName,
        uint256[] memory tokensMaxSupply, 
        bool[] memory isSoulbound
    ) public {
        ERC1155Token newToken = new ERC1155Token(
            msg.sender,
            signerAuthority,
            trustedForwarder,
            contractName,
            uri,
            tokensName,
            tokensMaxSupply,
            isSoulbound
        );
        
        _deployedContracts.push(address(newToken));
        
        emit ERC1155Created(msg.sender, address(newToken));
    }
    
    function getAllDeployedContracts() public view returns (address[] memory) {
        return _deployedContracts;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    
    function setSignerAuthority(address _signerAuthority) public onlyOwner {
        signerAuthority = _signerAuthority;
    }
    
    function setTrustedForwarder(address _trustedForwarder) public onlyOwner {
        trustedForwarder = _trustedForwarder;
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        owner = newOwner;
    }
}