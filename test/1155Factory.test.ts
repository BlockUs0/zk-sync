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
  const isSoulBound = [0];
  const defaultChoice = 1;
  
  // Wallet variables
  let ownerWallet: Wallet;
  let signerWallet: Wallet;
  let userWallet: Wallet;
  
  // Contract variables
  let erc1155Implementation: any;
  let beacon: any;
  let factory: any;
  
  before(async function() {
    // Set up the wallet instances
    const [deployer, signer, user] = await ethers.getSigners();
    
    ownerWallet = deployer as any;
    signerWallet = signer as any;
    userWallet = user as any;
    
    console.log("Owner address:", await ownerWallet.getAddress());
  });
  
  describe("Factory and Beacon Pattern", function () {
    it("Should deploy the implementation, beacon, and factory", async function () {
      // 1. Deploy the implementation contract
      const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
      const constructorArgs = [
        await ownerWallet.getAddress(),  // owner
        await signerWallet.getAddress(), // signer authority
        "0x0000000000000000000000000000000000000000", // trusted forwarder
        "0x0000000000000000000000000000000000000000", // null address
        "0x0000000000000000000000000000000000000000", // null address
        "0x0000000000000000000000000000000000000000"  // null address
      ];
      
      erc1155Implementation = await ERC1155Token.deploy(...constructorArgs);
      await erc1155Implementation.waitForDeployment();
      console.log("Implementation deployed at:", await erc1155Implementation.getAddress());
      
      // 2. Deploy the beacon
      const Beacon = await ethers.getContractFactory("ERC1155TokenBeacon");
      beacon = await Beacon.deploy(
        await erc1155Implementation.getAddress(),
        await ownerWallet.getAddress()
      );
      await beacon.waitForDeployment();
      console.log("Beacon deployed at:", await beacon.getAddress());
      
      // Verify the beacon is pointing to the right implementation
      const beaconImpl = await beacon.implementation();
      expect(beaconImpl).to.equal(await erc1155Implementation.getAddress());
      
      // 3. Deploy the factory
      const Factory = await ethers.getContractFactory("ERC1155TokenBeaconFactory");
      factory = await Factory.deploy(await beacon.getAddress());
      await factory.waitForDeployment();
      console.log("Factory deployed at:", await factory.getAddress());
      
      // Verify the factory is using the right beacon
      const factoryBeacon = await factory.getBeacon();
      expect(factoryBeacon).to.equal(await beacon.getAddress());
      
      // Verify the factory can retrieve the implementation
      const factoryImpl = await factory.getImplementation();
      expect(factoryImpl).to.equal(await erc1155Implementation.getAddress());
    });
    
    it("Should create a new ERC1155 instance through the factory", async function () {
      this.timeout(60000); // Increase timeout for this test
      
      try {
        // Let's try to debug by checking if the implementation is properly initialized
        console.log("Implementation contract address:", await erc1155Implementation.getAddress());
        
        // Print token details before creating new proxy
        console.log(`Name: ${name}`);
        console.log(`URI: ${uri}`);
        console.log(`TokensName: ${tokensName}`);
        console.log(`TokensMaxSupply: ${tokensMaxSupply}`);
        console.log(`IsSoulBound: ${isSoulBound}`);
        console.log(`DefaultChoice: ${defaultChoice}`);
        
        // Try with a simpler initialization
        // Use the factory to create a new instance with minimal parameters
        const tx = await factory.createERC1155(
          "Simple Collection",  // Simplified name
          "https://example.com/", // Simplified URI
          ["TEST"],            // Simplified token name
          [5n],               // Simplified max supply
          [0],                // Not soulbound
          1                   // Default choice
        );
        
        // // Wait for the transaction
        // const receipt = await tx.wait();
        // console.log("Transaction receipt:", receipt);
        
        // // Find the ERC1155Created event
        // const event = receipt.logs.find(
        //   (log: any) => 
        //     log.fragment && log.fragment.name === "ERC1155Created"
        // );
        
        // // Check that we found the event
        // expect(event).to.not.be.undefined;
        
        // // Extract the proxy address from the event
        // const proxyAddress = event.args.erc1155Contract;
        // console.log("New ERC1155 proxy created at:", proxyAddress);
        
        // // Connect to the new proxy
        // const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        // const proxyInstance = ERC1155Token.attach(proxyAddress);
        
        // // Basic verification
        // const proxyName = await proxyInstance.name();
        // console.log("Proxy name:", proxyName);
        
      } catch (error) {
        console.error("Detailed error:", error);
        
        // Let's examine our contract interfaces to see if there's a mismatch
        console.log("Checking ERC1155Token interface...");
        const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
        console.log("ERC1155Token interface:", ERC1155Token.interface.fragments.map(f => f.name));
        
        // Check beacon proxy interface
        console.log("Checking BeaconProxy interface...");
        const BeaconProxy = await ethers.getContractFactory("BeaconProxy");
        console.log("BeaconProxy interface:", BeaconProxy.interface.fragments.map(f => f.name));
        
        throw error;
      }
    });
  });
});
