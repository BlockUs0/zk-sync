import { ethers, network } from "hardhat";
import { erc1155TokenImplConstructorParameters } from "./constructor-params";

async function deployContracts() {
  console.log(`Deploying contracts to ${network.name}`);
  
  // Get the deployer's address
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  const signerAuthority = erc1155TokenImplConstructorParameters[1];
  const trustedForwarder = erc1155TokenImplConstructorParameters[2];
  
  // Deploy ERC1155TokenFactory first
  const ERC1155TokenFactory = await ethers.getContractFactory("ERC1155TokenFactory");
  const factory = await ERC1155TokenFactory.deploy(
    signerAuthority,
    trustedForwarder
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ERC1155TokenFactory deployed to:", factoryAddress);
  
  // Verify the deployment
  console.log("\nDeployment completed. Verify contracts with:");
  console.log(`npx hardhat verify --network ${network.name} ${factoryAddress} ${signerAuthority} ${trustedForwarder}`);
  
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