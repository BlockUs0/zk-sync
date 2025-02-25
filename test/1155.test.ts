import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet } from "zksync-ethers";

describe("ERC1155Token Basic Tests", function () {
  // Basic constants for testing
  const name = "Tickets Tournament Collection";
  const uri = "https://example.com/token/{id}.json";
  const tokensName = ["GENESIS_CITY"];
  const tokensMaxSupply = [10n];
  const isSoulBound = [0];
  
  // Wallet variables
  let ownerWallet: Wallet;
  let signerWallet: Wallet;
  let userWallet: Wallet;
  
  // Contract variables
  let erc1155Token: any;
  
  before(async function() {
    // Set up the wallet instances
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
      
      // For simplicity, combining constructor and initialization
      // If you're using upgradeable contracts, this would be different
      const constructorArgs = [
        await ownerWallet.getAddress(),  // owner
        await signerWallet.getAddress(), // signer authority
        "0x0000000000000000000000000000000000000000", // trusted forwarder
        "0x0000000000000000000000000000000000000000", // null address
        "0x0000000000000000000000000000000000000000", // null address
        "0x0000000000000000000000000000000000000000"  // null address
      ];
      
      erc1155Token = await ERC1155Token.deploy(...constructorArgs);
      await erc1155Token.waitForDeployment();
      
      // Initialize if your contract has an initialize function
      if (erc1155Token.initialize) {
        await erc1155Token.initialize(
          name, 
          uri, 
          [], 
          [], 
          [],
          1  // default choice
        );
      }
      
      // Verify basic properties
      expect(await erc1155Token.name()).to.equal(name);
      expect(await erc1155Token.uri(1)).to.equal(uri);
      expect(await erc1155Token.owner()).to.equal(await ownerWallet.getAddress());
      expect(await erc1155Token.currentAuthoritySigner()).to.equal(
        await signerWallet.getAddress()
      );
      
      // Add a token type
      await erc1155Token.connect(ownerWallet).addSupportedTokens(
        tokensName, 
        tokensMaxSupply, 
        isSoulBound
      );
      
      // Verify token was added
      const tokenDetails = await erc1155Token.getTokenDetails();
      expect(tokenDetails.length).to.equal(1);
      expect(tokenDetails[0].name).to.equal(tokensName[0]);
      expect(tokenDetails[0].maxSupply).to.equal(tokensMaxSupply[0]);
    });
  });
});
