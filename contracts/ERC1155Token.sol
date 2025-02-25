// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Nonces.sol";

contract ERC1155Token is ERC1155, ERC1155Supply, ERC1155Burnable, Pausable, Nonces, Ownable {
    string public constant version = "1.0.0";
    string public name;

    address private immutable _authoritySigner;
    address private immutable _trustedForwarder;
    
    using Counters for Counters.Counter;
    Counters.Counter private tokenIdCounter;
    mapping(uint256=>string) private _tokenNameMap;
    mapping(uint256=>uint256) private _tokenMaxSupplyMap; //MAX SUPPLY 0 MEANS UNLIMITED
    mapping(uint256=>uint256) private _tokenBurnedAmountMap;

    mapping(uint256 => bool) private _soulboundTokenIds;

    struct TokenDetail {
        uint256 id;
        string name;
        uint256 maxSupply;
        uint256 minted;
        uint256 inCirculation;
    }
    struct OwnershipTokenDetail {
        uint256 id;
        string name;
        uint256 amount;
    }

    constructor(
        address contractOwner,
        address contractAuthoritySigner,
        address contractTrustedForwarder,
        string memory contractName, 
        string memory uri, 
        string[] memory tokensName,
        uint256[] memory tokensMaxSupply, 
        bool[] memory isSoulbound
    ) 
        ERC1155(uri)
        Ownable()
    {
        name = contractName;
        _authoritySigner = contractAuthoritySigner;
        _trustedForwarder = contractTrustedForwarder;
        _addSupportedTokens(tokensName, tokensMaxSupply, isSoulbound);
        transferOwnership(contractOwner);
    }

    function isTrustedForwarder(address forwarder) public view returns (bool) {
        return forwarder == _trustedForwarder;
    }

    function _msgSender() internal view override returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData() internal view override returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }

    function currentAuthoritySigner() public view returns (address) {
        return _authoritySigner;
    }

    function setUri(string memory uri) public onlyOwner {
        _setURI(uri);
    }
    
    function addSupportedTokens(string[] memory tokensName, uint256[] memory tokensMaxSupply, bool[] memory isSoulbound) public onlyOwner {
       _addSupportedTokens(tokensName, tokensMaxSupply, isSoulbound);
    }
    
    function _addSupportedTokens(string[] memory tokensName, uint256[] memory tokensMaxSupply, bool[] memory isSoulbound) internal {
        require(tokensName.length == tokensMaxSupply.length && tokensName.length == isSoulbound.length, 
            "tokensName, tokensMaxSupply and isSoulbound length mismatch");

        for(uint256 i; i < tokensName.length; i++) {
            tokenIdCounter.increment();
            _tokenNameMap[tokenIdCounter.current()] = tokensName[i];
            _tokenMaxSupplyMap[tokenIdCounter.current()] = tokensMaxSupply[i];
            _soulboundTokenIds[tokenIdCounter.current()] = isSoulbound[i];
        } 
    }

    function pauseMinting(bool pause) public onlyOwner {
        if(pause)
            _pause();
        else
            _unpause();
    }
    
    function mint(address to, uint256 id, uint256 amount, bytes memory data, bytes memory signature) public whenNotPaused {
        address sender = _msgSender();
        _validateAuthorizedMint(sender, to, id, amount, data, signature);
        _validateMint(id, amount);
        _mint(to, id, amount, data);
    }
    
    function batchMint(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data, bytes memory signature) public whenNotPaused {  
        address sender = _msgSender();
        _validateAuthorizedBatchMint(sender, to, ids, amounts, data, signature);
        require(ids.length == amounts.length, "ids and amounts length mismatch");
        for(uint256 i; i < ids.length; i++) {
            _validateMint(ids[i], amounts[i]);
        }
        _mintBatch(to, ids, amounts, data);
    }

    function _validateAuthorizedMint(address minter, address to, uint256 id, uint256 amount, 
        bytes memory data, bytes memory signature) internal {
        bytes32 contentHash = keccak256(abi.encode(minter, to, id, amount, keccak256(data), _useNonce(minter), block.chainid, address(this)));
        address signer = _signatureWallet(contentHash, signature);
        require(signer == currentAuthoritySigner(), "Not authorized to mint");
    }
    
    function _validateAuthorizedBatchMint(address minter, address to, uint256[] memory ids, uint256[] memory amounts,
         bytes memory data, bytes memory signature) internal {
        bytes32 contentHash = keccak256(abi.encode(minter, to, ids, amounts, keccak256(data), _useNonce(minter), block.chainid, address(this)));
        address signer = _signatureWallet(contentHash, signature);
        require(signer == currentAuthoritySigner(), "Not authorized to mint");
    }
    
    function _signatureWallet(bytes32 contentHash, bytes memory signature) private pure returns (address) {
      return ECDSA.recover(ECDSA.toEthSignedMessageHash(contentHash), signature);
    }
    
    function _validateMint(uint256 id, uint256 amount) internal view {
        require(id <= tokenIdCounter.current(), "Token does not exist");
        require(amount > 0, "Amount must be greater than 0");
        require(_tokenMaxSupplyMap[id] == 0 || totalSupply(id) + _tokenBurnedAmountMap[id] + amount <= _tokenMaxSupplyMap[id], "Can not exceed token max supply");
    }

    function _beforeTokenTransfer(
            address operator,
            address from,
            address to,
            uint256[] memory ids,
            uint256[] memory amounts,
            bytes memory data
    ) internal override(ERC1155, ERC1155Supply) {
        if (from != address(0)) { // Skip minting
            for(uint256 i; i < ids.length; i++) {
                require(!_soulboundTokenIds[ids[i]], "Token is soulbound");
            }
        }
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
    
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        if(to == address(0)) {
            for(uint256 i; i < ids.length; i++) {
                _tokenBurnedAmountMap[ids[i]] += amounts[i];
            }
        }
        super._afterTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function getTokenDetails() public view returns(TokenDetail[] memory tokenDetails) {
        uint256 tokenIdCounterCurrent = tokenIdCounter.current();
        tokenDetails = new TokenDetail[](tokenIdCounterCurrent);
        uint256 tokenId = 0;
        for(uint256 i; i < tokenIdCounterCurrent; i++) { 
            tokenId = i + 1;
            TokenDetail memory tokenDetail;
            tokenDetail.id = tokenId;
            tokenDetail.name = _tokenNameMap[tokenId];
            tokenDetail.maxSupply = _tokenMaxSupplyMap[tokenId];
            tokenDetail.minted = totalSupply(tokenId) + _tokenBurnedAmountMap[tokenId];
            tokenDetail.inCirculation = totalSupply(tokenId);
            tokenDetails[i] = tokenDetail;
        }
    }
    
    function getTokensOwnershipDetail(address _owner) public view returns(OwnershipTokenDetail[] memory tokensOwnershipDetail) {
        uint256 tokenIdCounterCurrent = tokenIdCounter.current();
        tokensOwnershipDetail = new OwnershipTokenDetail[](tokenIdCounterCurrent);
        uint256 tokenId = 0;
        for(uint256 i; i < tokenIdCounterCurrent; i++) {
            OwnershipTokenDetail memory tokenOwnershipDetail;
            tokenId = i + 1;
            tokenOwnershipDetail.id = tokenId;
            tokenOwnershipDetail.name = _tokenNameMap[tokenId];
            tokenOwnershipDetail.amount = balanceOf(_owner, tokenId);
            tokensOwnershipDetail[i] = tokenOwnershipDetail;
        }
    }

    function isSoulboundToken(uint256 tokenId) public view returns (bool) {
        return _soulboundTokenIds[tokenId];
    }
    
    function getTrustedForwarder() public view returns (address) {
        return _trustedForwarder;
    }
}