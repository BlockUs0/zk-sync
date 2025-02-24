// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

abstract contract Nonces {
    
    using CountersUpgradeable for CountersUpgradeable.Counter;
    mapping(address => CountersUpgradeable.Counter) private _nonces;

    function nonces(address owner) public view virtual returns (uint256) {
        return _nonces[owner].current();
    }

    function _useNonce(address owner) internal virtual returns (uint256 current) {
        CountersUpgradeable.Counter storage nonce = _nonces[owner];
        current = nonce.current();
        nonce.increment();
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[50] private __gap;
}