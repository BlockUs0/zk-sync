import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet } from "zksync-ethers";

describe("ERC1155Token Basic Tests", function () {
  const name = "Tickets Tournament Collection";
  const uri = "https://example.com/token/{id}.json";
  const tokensName = ["GENESIS_CITY"];
  const tokensMaxSupply = [10n];
  const isSoulBound = [true];
  const defaultChoice = 1;
  
  let ownerWallet: Wallet;
  let signer1Wallet: Wallet;
  let signer2Wallet: Wallet;
  let userWallet: Wallet;
  
  let erc1155Token: any;
  
  before(async function() {
    const [deployer, signer1, signer2, user] = await ethers.getSigners();
    
    ownerWallet = deployer as any;
    signer1Wallet = signer1 as any;
    signer2Wallet = signer2 as any;
    userWallet = user as any;
    
    console.log("Owner address:", await ownerWallet.getAddress());
    console.log("Signer1 address:", await signer1Wallet.getAddress());
    console.log("Signer2 address:", await signer2Wallet.getAddress());
    console.log("User address:", await userWallet.getAddress());
  });
  
  describe("Basic Deployment", function () {
    it("Should deploy ERC1155Token and verify basic properties", async function () {
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      
      const constructorArgs = [
        await ownerWallet.getAddress(),       // contractOwner
        await signer1Wallet.getAddress(),     // contractAuthoritySigner_1
        await signer2Wallet.getAddress(),     // contractAuthoritySigner_2
        defaultChoice,                        // defaultChoice
        "0x0000000000000000000000000000000000000000", // trusted forwarder
        name,                                 // contract name
        uri,                                  // token URI
        tokensName,                           // Array of token names
        tokensMaxSupply,                      // Array of max supplies
        isSoulBound                           // Array of soulbound flags
      ];
      
      erc1155Token = await ERC1155Token.deploy(...constructorArgs);
      await erc1155Token.waitForDeployment();
      
      // Verify basic properties
      expect(await erc1155Token.name()).to.equal(name);
      expect(await erc1155Token.uri(1)).to.equal(uri);
      expect(await erc1155Token.owner()).to.equal(await ownerWallet.getAddress());
      
      // Verify the current authority signer is based on defaultChoice
      const expectedSigner = defaultChoice === 1 ? 
        await signer1Wallet.getAddress() : 
        await signer2Wallet.getAddress();
      expect(await erc1155Token.currentAuthoritySigner()).to.equal(expectedSigner);
      
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
        await signer1Wallet.getAddress(),   // signerAuthority1
        await signer2Wallet.getAddress(),   // signerAuthority2
        "0x0000000000000000000000000000000000000000" // trusted forwarder
      );
      await factory.waitForDeployment();
      
      expect(await factory.owner()).to.equal(await ownerWallet.getAddress());
      
      // Check proper signers are set
      expect(await factory.signerAuthority1()).to.equal(await signer1Wallet.getAddress());
      expect(await factory.signerAuthority2()).to.equal(await signer2Wallet.getAddress());
      expect(await factory.defaultChoice()).to.equal(BigInt(defaultChoice));
      
      const newTokenName = "Factory Token";
      const newTokenUri = "https://example.com/factory-token/{id}.json";
      const newTokensName = ["FACTORY_ITEM"];
      const newTokensMaxSupply = [20n];
      const newIsSoulBound = [false];
      const defaultChoice = 1;
      
      await factory.connect(ownerWallet).createERC1155(
        newTokenName,
        newTokenUri,
        newTokensName,
        newTokensMaxSupply,
        newIsSoulBound,
        defaultChoice
      );
      
      const deployedContracts = await factory.getAllDeployedContracts();
      expect(deployedContracts.length).to.equal(1);
      
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      const factoryCreatedToken = await ERC1155Token.attach(deployedContracts[0]);
      
      expect(await factoryCreatedToken.name()).to.equal(newTokenName);
      expect(await factoryCreatedToken.uri(1)).to.equal(newTokenUri);
      expect(await factoryCreatedToken.owner()).to.equal(await ownerWallet.getAddress());
      
      // Verify the current authority signer is based on defaultChoice
      const expectedSigner = defaultChoice === 1 ? 
        await signer1Wallet.getAddress() : 
        await signer2Wallet.getAddress();
      expect(await factoryCreatedToken.currentAuthoritySigner()).to.equal(expectedSigner);
      
      const tokenDetails = await factoryCreatedToken.getTokenDetails();
      expect(tokenDetails.length).to.equal(1);
      expect(tokenDetails[0].name).to.equal(newTokensName[0]);
      expect(tokenDetails[0].maxSupply).to.equal(newTokensMaxSupply[0]);
    });
  });
});
