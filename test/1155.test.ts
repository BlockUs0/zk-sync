import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet } from "zksync-ethers";

describe("ERC1155Token Basic Tests", function () {
  const name = "Tickets Tournament Collection";
  const uri = "https://example.com/token/{id}.json";
  const tokensName = ["GENESIS_CITY"];
  const tokensMaxSupply = [10n];
  const isSoulBound = [true]; // Changed from 0 to true for boolean array
  
  let ownerWallet: Wallet;
  let signerWallet: Wallet;
  let userWallet: Wallet;
  
  let erc1155Token: any;
  
  before(async function() {
    const [deployer, signer, user] = await ethers.getSigners();
    
    ownerWallet = deployer as any;
    signerWallet = signer as any;
    userWallet = user as any;
    
    console.log("Owner address:", await ownerWallet.getAddress());
    console.log("Signer address:", await signerWallet.getAddress());
    console.log("User address:", await userWallet.getAddress());
  });
  
  describe("Basic Deployment", function () {
    it("Should deploy ERC1155Token and verify basic properties", async function () {
      // Deploy ERC1155Token contract
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      
      // Constructor args for simplified contract
      const constructorArgs = [
        await ownerWallet.getAddress(),  // owner
        await signerWallet.getAddress(), // signer authority
        "0x0000000000000000000000000000000000000000", // trusted forwarder
        name,  // contract name
        uri,   // token URI
        tokensName,  // Array of token names
        tokensMaxSupply,  // Array of max supplies
        isSoulBound  // Array of soulbound flags
      ];
      
      erc1155Token = await ERC1155Token.deploy(...constructorArgs);
      await erc1155Token.waitForDeployment();
      
      // No initialize function in the simplified contract
      
      // Verify basic properties
      expect(await erc1155Token.name()).to.equal(name);
      expect(await erc1155Token.uri(1)).to.equal(uri);
      expect(await erc1155Token.owner()).to.equal(await ownerWallet.getAddress());
      expect(await erc1155Token.currentAuthoritySigner()).to.equal(
        await signerWallet.getAddress()
      );
      
      // Verify token was added during deployment
      const tokenDetails = await erc1155Token.getTokenDetails();
      expect(tokenDetails.length).to.equal(1);
      expect(tokenDetails[0].name).to.equal(tokensName[0]);
      expect(tokenDetails[0].maxSupply).to.equal(tokensMaxSupply[0]);
      
      // Verify soulbound status
      expect(await erc1155Token.isSoulboundToken(1)).to.equal(isSoulBound[0]);
      
      // Test adding another token
      const newTokenName = ["PLATINUM_TICKET"];
      const newTokenMaxSupply = [5n];
      const newIsSoulBound = [false];
      
      await erc1155Token.connect(ownerWallet).addSupportedTokens(
        newTokenName, 
        newTokenMaxSupply, 
        newIsSoulBound
      );
      
      // Verify new token was added
      const updatedTokenDetails = await erc1155Token.getTokenDetails();
      expect(updatedTokenDetails.length).to.equal(2);
      expect(updatedTokenDetails[1].name).to.equal(newTokenName[0]);
      expect(updatedTokenDetails[1].maxSupply).to.equal(newTokenMaxSupply[0]);
      expect(await erc1155Token.isSoulboundToken(2)).to.equal(newIsSoulBound[0]);
    });
  });
  
  describe("Factory Deployment", function() {
    it("Should deploy factory and create a token through it", async function() {
      const ERC1155TokenFactory = await ethers.getContractFactory("ERC1155TokenFactory");
      const factory = await ERC1155TokenFactory.deploy(
        await signerWallet.getAddress(),
        "0x0000000000000000000000000000000000000000" // trusted forwarder
      );
      await factory.waitForDeployment();
      
      expect(await factory.owner()).to.equal(await ownerWallet.getAddress());
      expect(await factory.signerAuthority()).to.equal(await signerWallet.getAddress());
      
      const newTokenName = "Factory Token";
      const newTokenUri = "https://example.com/factory-token/{id}.json";
      const newTokensName = ["FACTORY_ITEM"];
      const newTokensMaxSupply = [20n];
      const newIsSoulBound = [false];
      
      await factory.connect(ownerWallet).createERC1155(
        newTokenName,
        newTokenUri,
        newTokensName,
        newTokensMaxSupply,
        newIsSoulBound
      );
      
      const deployedContracts = await factory.getAllDeployedContracts();
      expect(deployedContracts.length).to.equal(1);
      
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      const factoryCreatedToken = await ERC1155Token.attach(deployedContracts[0]);
      
      expect(await factoryCreatedToken.name()).to.equal(newTokenName);
      expect(await factoryCreatedToken.uri(1)).to.equal(newTokenUri);
      expect(await factoryCreatedToken.owner()).to.equal(await ownerWallet.getAddress());
      expect(await factoryCreatedToken.currentAuthoritySigner()).to.equal(await signerWallet.getAddress());
      
      const tokenDetails = await factoryCreatedToken.getTokenDetails();
      expect(tokenDetails.length).to.equal(1);
      expect(tokenDetails[0].name).to.equal(newTokensName[0]);
      expect(tokenDetails[0].maxSupply).to.equal(newTokensMaxSupply[0]);
    });
  });
});