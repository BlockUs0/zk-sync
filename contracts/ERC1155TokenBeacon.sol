// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

contract ERC1155TokenBeacon is UpgradeableBeacon {

   constructor(address implementation, address owner) UpgradeableBeacon(implementation){
        _transferOwnership(owner);
   }

}