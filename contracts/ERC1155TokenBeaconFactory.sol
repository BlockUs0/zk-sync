// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import './ERC1155TokenBeacon.sol';
import './ERC1155Token.sol';

contract ERC1155TokenBeaconFactory {

    string public version = "1.0.0";

    ERC1155TokenBeacon immutable public beacon;

    event ERC1155Created(address indexed owner, address indexed erc1155Contract, uint8 indexed currentDefaultChoice);

    constructor(address erc1155Beacon) {
        beacon = ERC1155TokenBeacon(erc1155Beacon);
    }

    function createERC1155(string memory contractName, string memory uri, string[] memory tokensName,uint256[] memory tokensMaxSupply, bool[] memory isSoulbound, uint8 defaultChoice) public  {
        BeaconProxy proxy = new BeaconProxy(address(beacon), 
            abi.encodeWithSelector(ERC1155Token(address(0)).initialize.selector, contractName, uri, tokensName, tokensMaxSupply, isSoulbound,defaultChoice)
        );
        address owner = ERC1155Token(address(proxy)).owner();
        uint8 currentDefaultChoice = ERC1155Token(address(proxy)).currentDefaultChoice();
        emit ERC1155Created(owner,address(proxy),currentDefaultChoice);
    }

    function getImplementation() public view returns (address) {
        return beacon.implementation();
    }

    function getBeacon() public view returns (address) {
        return address(beacon);
    }
}