// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import './ERC1155Token.sol';

contract ERC1155TokenFactory is ERC2771Context {
    string public version = "1.0.0";
    
    uint8 public defaultChoice;
    address public signerAuthority1;
    address public signerAuthority2;
    address public trustedForwarder;
    address public owner;

    
    address[] private _deployedContracts;
    
    event ERC1155Created(address indexed owner, address indexed erc1155Contract, uint8 indexed currentDefaultChoice);
    
    constructor(
        address _signerAuthority1,
        address _signerAuthority2, 
        uint8 _defaultChoice,
        address _trustedForwarder
    ) ERC2771Context(_trustedForwarder) {
        signerAuthority1 = _signerAuthority1;
        signerAuthority2 = _signerAuthority2;
        defaultChoice = _defaultChoice;
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
            signerAuthority1, 
            signerAuthority2,
            defaultChoice,
            trustedForwarder,
            contractName,
            uri,
            tokensName,
            tokensMaxSupply,
            isSoulbound
        );

        _deployedContracts.push(address(newToken));
        emit ERC1155Created(msg.sender, address(newToken), defaultChoice);
    }
    
    function getAllDeployedContracts() public view returns (address[] memory) {
        return _deployedContracts;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }
    
    function setTrustedForwarder(address _trustedForwarder) public onlyOwner {
        trustedForwarder = _trustedForwarder;
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        owner = newOwner;
    }
}