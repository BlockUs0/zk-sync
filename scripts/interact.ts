import { ethers, network } from "hardhat";

async function deployTokenFromFactory() {
  console.log(`Exploring ERC1155TokenBeaconFactory on ${network.name}`);
  
  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Using account: ${deployer.address}`);
  
  // Factory address
  const factoryAddress = "0x2317FFeD6Fd42976A3383B7bEAA9A578cDAB4AE2";
  
  try {
    // First, let's get the bytecode to verify the contract exists
    const code = await ethers.provider.getCode(factoryAddress);
    if (code === '0x') {
      console.error("No contract deployed at the specified address!");
      return;
    }
    
    console.log("Contract exists at the specified address.");
    
    // Let's try to examine the factory interface
    // We'll try with a generic ERC1155TokenBeaconFactory interface
    const factory = await ethers.getContractAt("ERC1155TokenFactory", factoryAddress);
    
    console.log("\n=== Available Functions ===");
    // List all functions on the contract interface
    for (const key in factory.functions) {
      if (typeof factory.functions[key] === 'function' && !key.includes('(')) {
        console.log(`- ${key}`);
      }
    }
    
    // Define parameters for ERC1155Token creation
    const contractName = "MyERC1155Token";
    const uri = "https://example.com/api/token/{id}";
    const tokensName = ["Token1", "Token2", "Token3"];
    const tokensMaxSupply = [1000, 500, 0]; // 0 means unlimited
    const isSoulbound = [false, true, false];
    
    // Try to identify the deployment function
    let deployFunctionName = null;
    const possibleFunctionNames = [
      "createERC1155Token", 
      "deployERC1155Token", 
      "createToken", 
      "deployToken", 
      "create",
      "deploy",
      "createProxy"
    ];
    
    for (const funcName of possibleFunctionNames) {
      if (funcName in factory.functions) {
        deployFunctionName = funcName;
        console.log(`\nFound deployment function: ${deployFunctionName}`);
        break;
      }
    }
    
    if (!deployFunctionName) {
      console.log("\nCouldn't automatically identify the deployment function.");
      console.log("Please inspect the available functions listed above and update your script with the correct function name.");
      return;
    }
    
    // Now attempt to call the identified deployment function
    console.log(`\nAttempting to call ${deployFunctionName} with parameters...`);
    
    // This is a generic approach - adjust parameters as needed based on the actual function signature
    const tx = await factory[deployFunctionName](
      contractName,
      uri,
      tokensName,
      tokensMaxSupply,
      isSoulbound
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction confirmation...");
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    console.log("Transaction confirmed!");
    
    // Log all events to help find the token address
    console.log("\n=== Events emitted ===");
    if (receipt.events && receipt.events.length > 0) {
      for (const event of receipt.events) {
        try {
          const decodedEvent = factory.interface.parseLog(event);
          console.log(`Event: ${decodedEvent.name}`);
          console.log("Arguments:", decodedEvent.args);
          
          // Try to identify the token address from various possible event argument names
          const possibleAddressArgs = ['token', 'tokenAddress', 'proxy', 'instance', 'implementation', 'clone'];
          for (const arg of possibleAddressArgs) {
            if (decodedEvent.args[arg] && ethers.utils.isAddress(decodedEvent.args[arg])) {
              console.log(`\nPossible token address found: ${decodedEvent.args[arg]}`);
            }
          }
        } catch (e) {
          console.log("Raw event log:", event);
        }
      }
    } else {
      console.log("No events found in the transaction receipt");
    }
    
    return { txHash: tx.hash };
    
  } catch (error) {
    console.error("Error:", error);
  }
}

deployTokenFromFactory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
