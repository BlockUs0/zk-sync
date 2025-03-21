import { ethers, network } from "hardhat";

async function deployContracts() {
  console.log(`Deploying contracts to ${network.name}`);
  
  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const BatchFactory = await ethers.getContractFactory("ERC721BatchTransfer");
  const factory = await BatchFactory.deploy();
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("BatchTransfer deployed to:", factoryAddress);
  
  // Update verification command with new parameters
  console.log("\nDeployment completed. Verify contracts with:");
  console.log(
    `npx hardhat verify --network ${network.name} ${factoryAddress} `
  );
  
  return {
    factory: factoryAddress,
  };
}

deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
