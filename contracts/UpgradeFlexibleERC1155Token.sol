// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "./Nonces.sol";
import "./UpgradeFlexibleCustomERC2771Context.sol";

contract UpgradeFlexibleERC1155Token is Initializable, UpgradeFlexibleCustomERC2771Context, ERC1155SupplyUpgradeable, ERC1155BurnableUpgradeable, PausableUpgradeable, Nonces {

    string public constant version = "2.0.0";
    string public name;

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable _defaultOwner_1;
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable _defaultOwner_2;

    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable _defaultAuthoritySigner_1;
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address private immutable _defaultAuthoritySigner_2;
    
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private tokenIdCounter;
    mapping(uint256=>string) private _tokenNameMap;
    mapping(uint256=>uint256) private _tokenMaxSupplyMap;//MAX SUPPLY 0 MEANS UNLIMITED
    mapping(uint256=>uint256) private _tokenBurnedAmountMap;
    mapping(uint256 => bool) private _soulboundTokenIds;

    bool public defaultOwnerRenounced;
    address private _altAuthSigner;

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address contractOwner_1, 
                address contractAuthoritySigner_1,
                address contractTrustedForwarder_1,
                address contractOwner_2, 
                address contractAuthoritySigner_2,
                address contractTrustedForwarder_2) UpgradeFlexibleCustomERC2771Context(contractTrustedForwarder_1,contractTrustedForwarder_2){
        _defaultOwner_1 = contractOwner_1;
        _defaultOwner_2 = contractOwner_2;
        _defaultAuthoritySigner_1 = contractAuthoritySigner_1;
        _defaultAuthoritySigner_2 = contractAuthoritySigner_2;
    }

    function initialize(string memory contractName, string memory uri, string[] memory tokensName,uint256[] memory tokensMaxSupply, uint8 defaultChoice) public initializer {
       name=contractName;
       defaultOwnerRenounced=false;
       __ERC1155_init(uri);
       __UpgradeFlexibleCustomERC2771Context_init(defaultChoice);
        _addSupportedTokens(tokensName,tokensMaxSupply); 
    }

    function currentDefaultChoice() public view returns (uint8){
        return _defaultChoice;
    }

    function _msgSender() internal view virtual override(ContextUpgradeable, UpgradeFlexibleCustomERC2771Context) returns (address) {
        return UpgradeFlexibleCustomERC2771Context._msgSender();
    }
    function _msgData() internal view virtual override(ContextUpgradeable, UpgradeFlexibleCustomERC2771Context) returns (bytes calldata) {
        return UpgradeFlexibleCustomERC2771Context._msgData();
    }

    function owner() public view virtual override returns (address) {
        if(defaultOwnerRenounced)
            return super.owner();
        
        return _defaultChoice==1 ? _defaultOwner_1 : _defaultOwner_2;
    }
    function _transferOwnership(address newOwner) internal virtual override {
        require(defaultOwnerRenounced, 'Ownership can not be transfered until defaultOwner is renounced');
        super._transferOwnership(newOwner);
    }
    function renounceToDefaultOwner(address newOwner) public virtual onlyOwner {
        require(!defaultOwnerRenounced, 'Ownership has already been renounced');
        defaultOwnerRenounced=true;
        _transferOwnership(newOwner);
    }

    function setAuthoritySigner(address authSigner) public onlyOwner{
        _altAuthSigner = authSigner;
    }
    function currentAuthoritySigner() public view returns (address){
        if(address(0)==_altAuthSigner)
            return _defaultChoice==1 ? _defaultAuthoritySigner_1 : _defaultAuthoritySigner_2;
        return _altAuthSigner;
    }

    function setUri(string memory uri) public onlyOwner {
        _setURI(uri);
    }
    function addSupportedTokens(string[] memory tokensName, uint256[] memory tokensMaxSupply) public onlyOwner {
       _addSupportedTokens(tokensName,tokensMaxSupply);
    }
    function _addSupportedTokens(string[] memory tokensName, uint256[] memory tokensMaxSupply) internal {
        require(tokensName.length==tokensMaxSupply.length,"tokensName and tokensMaxSupply length mismatch");
        for(uint256 i;i<tokensName.length;i++){
            tokenIdCounter.increment();
            _tokenNameMap[tokenIdCounter.current()]=tokensName[i];
            _tokenMaxSupplyMap[tokenIdCounter.current()]=tokensMaxSupply[i];
        } 
    }

    function pauseMinting(bool pause) public onlyOwner{
        if(pause)
            _pause();
        else
            _unpause();
    }
    
    function mint(address to, uint256 id, uint256 amount, bytes memory data, bytes memory signature) public whenNotPaused {
        address sender = _msgSender();
        _validateAuthorizedMint(sender,to,id,amount,data,signature);
        _validateMint(id,amount);
        _mint(to,id,amount,data);
    }
    function batchMint(address to, uint256[] memory  ids,  uint256[] memory amounts, bytes memory data, bytes memory signature) public whenNotPaused{  
        address sender = _msgSender();
        _validateAuthorizedBatchMint(sender,to,ids,amounts,data,signature);
        require(ids.length==amounts.length,"ids and amounts length mismatch");
        for(uint256 i;i<ids.length;i++){
            _validateMint(ids[i],amounts[i]);
        }
        _mintBatch(to,ids,amounts,data);
    }

    function _validateAuthorizedMint(address minter, address to, uint256 id, uint256 amount, 
        bytes memory data,bytes memory signature) internal {
        bytes32 contentHash = keccak256(abi.encode(minter,to,id,amount,keccak256(data),_useNonce(minter),block.chainid,address(this)));
        address signer = _signatureWallet(contentHash, signature);
        require(signer == currentAuthoritySigner(), "Not authorized to mint");
    }
    function _validateAuthorizedBatchMint(address minter, address to, uint256[] memory ids, uint256[] memory amounts,
         bytes memory data, bytes memory signature) internal {
        bytes32 contentHash = keccak256(abi.encode(minter,to,ids,amounts,keccak256(data),_useNonce(minter),block.chainid,address(this)));
        address signer = _signatureWallet(contentHash, signature);
        require(signer == currentAuthoritySigner(), "Not authorized to mint");
    }
    function _signatureWallet(bytes32 contentHash, bytes memory signature) private pure returns (address){
      return ECDSAUpgradeable.recover(ECDSAUpgradeable.toEthSignedMessageHash(contentHash), signature);
    }
    function _validateMint(uint256 id,uint256 amount) internal view {
        require(id<=tokenIdCounter.current(), "Token does not exist");
        require(amount>0, "Amount must be greater than 0");
        require(_tokenMaxSupplyMap[id]==0 || totalSupply(id)+_tokenBurnedAmountMap[id]+amount<=_tokenMaxSupplyMap[id],"Can not exceed token max supply");
    }

    function _beforeTokenTransfer(
            address operator,
            address from,
            address to,
            uint256[] memory ids,
            uint256[] memory amounts,
            bytes memory data
        ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
            ERC1155SupplyUpgradeable._beforeTokenTransfer(operator, from, to, ids, amounts, data);
        }
    
    function _afterTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        if(to==address(0)){
            for(uint256 i;i<ids.length;i++){
                _tokenBurnedAmountMap[ids[i]]+=amounts[i];
            }
        }
        super._afterTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function getTokenDetails()public view returns(TokenDetail[] memory tokenDetails){
        uint256 tokenIdCounterCurrent = tokenIdCounter.current();
        tokenDetails = new TokenDetail[](tokenIdCounterCurrent);
        uint256 tokenId = 0;
        for(uint256 i;i<tokenIdCounterCurrent;i++){ 
            tokenId=i+1;
            TokenDetail memory tokenDetail;
            tokenDetail.id=tokenId;
            tokenDetail.name=_tokenNameMap[tokenId];
            tokenDetail.maxSupply=_tokenMaxSupplyMap[tokenId];
            tokenDetail.minted=totalSupply(tokenId)+_tokenBurnedAmountMap[tokenId];
            tokenDetail.inCirculation=totalSupply(tokenId);
            tokenDetails[i]=tokenDetail;
        }
    }
    function getTokensOwnershipDetail(address _owner)public view returns(OwnershipTokenDetail[] memory tokensOwnershipDetail){
        uint256 tokenIdCounterCurrent = tokenIdCounter.current();
        tokensOwnershipDetail = new OwnershipTokenDetail[](tokenIdCounterCurrent);
        uint256 tokenId = 0;
        for(uint256 i;i<tokenIdCounterCurrent;i++){
            OwnershipTokenDetail memory tokenOwnershipDetail;
            tokenId=i+1;
            tokenOwnershipDetail.id=tokenId;
            tokenOwnershipDetail.name=_tokenNameMap[tokenId];
            tokenOwnershipDetail.amount=balanceOf(_owner,tokenId);
            tokensOwnershipDetail[i]=tokenOwnershipDetail;
        }
    }

}