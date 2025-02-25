// 1155Factory.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { Wallet } from "zksync-ethers";

describe("ERC1155Token Factory Tests", function () {
  // Basic constants for testing
  const name = "Tickets Tournament Collection";
  const uri = "https://example.com/token/{id}.json";
  const tokensName = ["GENESIS_CITY"];
  const tokensMaxSupply = [10n];
  const isSoulBound = [false];
  
  // Wallet variables
  let ownerWallet: Wallet;
  let signerWallet: Wallet;
  let userWallet: Wallet;
  
  // Contract variables
  let erc1155Implementation: any;
  let factory: any;
  
  before(async function() {
    // Set up the wallet instances
    const [deployer, signer, user] = await ethers.getSigners();
    
    ownerWallet = deployer as any;
    signerWallet = signer as any;
    userWallet = user as any;
    
    console.log("Owner address:", await ownerWallet.getAddress());
  });
  
  describe("ERC1155TokenFactory Tests", function () {
    it("Should deploy the implementation and factory", async function () {
      // 1. Deploy the implementation contract for reference
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      const constructorArgs = [
        await ownerWallet.getAddress(),  // owner
        await signerWallet.getAddress(), // signer authority
        "0x0000000000000000000000000000000000000000", // trusted forwarder
        name,
        uri,
        tokensName,
        tokensMaxSupply,
        isSoulBound
      ];
      
      erc1155Implementation = await ERC1155Token.deploy(...constructorArgs);
      await erc1155Implementation.waitForDeployment();
      console.log("Implementation deployed at:", await erc1155Implementation.getAddress());
      
      // 2. Deploy the factory
      const Factory = await ethers.getContractFactory("ERC1155TokenFactory");
      factory = await Factory.deploy(
        await signerWallet.getAddress(), // signer authority
        "0x0000000000000000000000000000000000000000" // trusted forwarder
      );
      await factory.waitForDeployment();
      console.log("Factory deployed at:", await factory.getAddress());
      
      // Verify the factory was deployed successfully
      const version = await factory.version();
      expect(version).to.equal("1.0.0");
      
      // Verify factory owner and signerAuthority
      expect(await factory.owner()).to.equal(await ownerWallet.getAddress());
      expect(await factory.signerAuthority()).to.equal(await signerWallet.getAddress());
    });
    
    it("Should create a new ERC1155 instance through the factory", async function () {
      this.timeout(60000); // Increase timeout for this test
      
      try {
        // Print token details before creating new instance
        console.log(`Name: ${name}`);
        console.log(`URI: ${uri}`);
        console.log(`TokensName: ${tokensName}`);
        console.log(`TokensMaxSupply: ${tokensMaxSupply}`);
        console.log(`IsSoulBound: ${isSoulBound}`);
        
        // Use the factory to create a new instance
        const tx = await factory.createERC1155(
          "Simple Collection",     // Name
          "https://example.com/",  // URI
          ["TEST"],                // Token name
          [5n],                    // Max supply
          [false]                  // Not soulbound
        );
        
        // Wait for the transaction
        const receipt = await tx.wait();
        
        // Find the ERC1155Created event
        const event = receipt.logs.find(
          (log: any) => 
            log.fragment && log.fragment.name === "ERC1155Created"
        );
        
        // Check that we found the event
        expect(event).to.not.be.undefined;
        
        // Extract the new contract address from the event
        const newContractAddress = event.args.erc1155Contract;
        console.log("New ERC1155 contract created at:", newContractAddress);
        
        // Connect to the new contract
        const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        const newTokenInstance = ERC1155Token.attach(newContractAddress);
        
        // Basic verification
        const contractName = await newTokenInstance.name();
        expect(contractName).to.equal("Simple Collection");
        
        // Test getting all deployed contracts
        const deployedContracts = await factory.getAllDeployedContracts();
        expect(deployedContracts).to.include(newContractAddress);
        expect(deployedContracts.length).to.equal(1);
        
      } catch (error) {
        console.error("Detailed error:", error);
        throw error;
      }
    });
    
    it("Should create multiple ERC1155 instances", async function() {
      // Create a second token
      const tx1 = await factory.createERC1155(
        "Second Collection",
        "https://example.com/second/",
        ["TOKEN1", "TOKEN2"],
        [100n, 200n],
        [false, true]
      );
      await tx1.wait();
      
      // Create a third token
      const tx2 = await factory.createERC1155(
        "Third Collection",
        "https://example.com/third/",
        ["RARE"],
        [50n],
        [true]
      );
      await tx2.wait();
      
      const deployedContracts = await factory.getAllDeployedContracts();
      expect(deployedContracts.length).to.equal(3);
      
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      const thirdInstance = ERC1155Token.attach(deployedContracts[2]);
      
      expect(await thirdInstance.name()).to.equal("Third Collection");
      
      const owner = await thirdInstance.owner();
      expect(owner).to.equal(await ownerWallet.getAddress());
      
      const tokenDetails = await thirdInstance.getTokenDetails();
      expect(tokenDetails[0].name).to.equal("RARE");
      expect(tokenDetails[0].maxSupply).to.equal(50n);
      expect(await thirdInstance.isSoulboundToken(1)).to.equal(true);
    });
    
    it("Should allow changing signerAuthority and trustedForwarder", async function() {
      const newSigner = userWallet;
      const newSignerAddress = await newSigner.getAddress();
      
      await factory.connect(ownerWallet).setSignerAuthority(newSignerAddress);
      expect(await factory.signerAuthority()).to.equal(newSignerAddress);
      
      const newForwarderAddress = "0x1111111111111111111111111111111111111111";
      await factory.connect(ownerWallet).setTrustedForwarder(newForwarderAddress);
      expect(await factory.trustedForwarder()).to.equal(newForwarderAddress);
      
      const tx = await factory.createERC1155(
        "Fourth Collection",
        "https://example.com/fourth/",
        ["NEW_TOKEN"],
        [25n],
        [false]
      );
      await tx.wait();
      
      const deployedContracts = await factory.getAllDeployedContracts();
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      const newInstance = ERC1155Token.attach(deployedContracts[3]);
      
      expect(await newInstance.currentAuthoritySigner()).to.equal(newSignerAddress);
    });
    
    it("Should transfer factory ownership", async function() {
      const newOwner = await userWallet.getAddress();
      
      await factory.connect(ownerWallet).transferOwnership(newOwner);
      expect(await factory.owner()).to.equal(newOwner);
      
      const randomAddress = "0x2222222222222222222222222222222222222222";
      
      await expect(
        factory.connect(ownerWallet).setSignerAuthority(randomAddress)
      ).to.be.revertedWith("Caller is not the owner");
      
      await factory.connect(userWallet).setSignerAuthority(randomAddress);
      expect(await factory.signerAuthority()).to.equal(randomAddress);
    });
  });
});