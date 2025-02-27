import { ethers, network } from "hardhat";
import { prodConfig, stageConfig } from "./constructor-params";

async function deployContracts() {
  console.log(`Deploying contracts to ${network.name}`);
  
  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const signerAuthority1 = prodConfig.defaultAuthoritySigner;
  const signerAuthority2 = stageConfig.defaultAuthoritySigner;
  const trustedForwarder = prodConfig.defaultTrustedForwarder;
  const defaultChoice = 1;
  
  const ERC1155TokenFactory = await ethers.getContractFactory("ERC1155TokenFactory");
  const factory = await ERC1155TokenFactory.deploy(
    signerAuthority1,
    signerAuthority2,
    trustedForwarder
  );
  
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ERC1155TokenFactory deployed to:", factoryAddress);
  
  // Update verification command with new parameters
  console.log("\nDeployment completed. Verify contracts with:");
  console.log(
    `npx hardhat verify --network ${network.name} ${factoryAddress} ` +
    `${signerAuthority1} ${signerAuthority2} ${trustedForwarder}`
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
