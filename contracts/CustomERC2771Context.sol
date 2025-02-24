// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.9.3) (metatx/ERC2771Context.sol)

pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @dev Context variant with ERC2771 support.
 */
abstract contract CustomERC2771Context is Initializable, ContextUpgradeable, OwnableUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable _defaultTrustedForwarder_1;
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable _defaultTrustedForwarder_2;
    uint8 internal _defaultChoice; 

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address trustedForwarder1, address trustedForwarder2) {
        _defaultTrustedForwarder_1 = trustedForwarder1;
        _defaultTrustedForwarder_2 = trustedForwarder2;
    }

    function __CustomERC2771Context_init(uint8 defaultChoice) internal onlyInitializing {
        _defaultChoice=defaultChoice;
    }
    
    function isTrustedForwarder(address forwarder) public view virtual returns (bool) {
        return forwarder == currentTrustedForwarder();
    }

    function _msgSender() internal view virtual override returns (address sender) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            /// @solidity memory-safe-assembly
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData() internal view virtual override returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender) && msg.data.length >= 20) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }

    function currentTrustedForwarder() public view returns(address){
       return _defaultChoice==1 ? _defaultTrustedForwarder_1 : _defaultTrustedForwarder_2;
    }


    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}
