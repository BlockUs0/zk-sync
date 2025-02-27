import { ethers, artifacts, network } from "hardhat";
import { prodConfig, stageConfig } from "./constructor-params";
import { utils, Wallet, Provider } from "zksync-ethers";
import { Contract, ContractFactory } from "ethers";

// Get the hardhat runtime environment
const hre = require("hardhat");

async function deployContracts() {
  console.log(`Deploying contracts to ${network.name}`);
  
  // Get the deployer's private key from environment or hardhat config
  const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || hre.network.config.accounts[0];
  
  // Setup provider and wallet for zkSync
  const provider = new Provider(hre.network.config.url);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  console.log(`Deploying contracts with the account: ${wallet.address}`);
  
  // First, load the artifacts for both contracts
  const erc1155Artifact = await artifacts.readArtifact("ERC1155Token");
  const factoryArtifact = await artifacts.readArtifact("ERC1155TokenFactory");
  
  // Calculate bytecode hash for the ERC1155Token
  const tokenBytecodeHash = utils.hashBytecode(erc1155Artifact.bytecode);
  console.log("ERC1155Token bytecode hash:", tokenBytecodeHash);
  
  // Extract updated constructor parameters
  const signerAuthority1 = prodConfig.defaultAuthoritySigner;
  const signerAuthority2 = stageConfig.defaultAuthoritySigner;
  const trustedForwarder = prodConfig.defaultTrustedForwarder;
  const defaultChoice = 1;

  // Create a ContractFactory for the ERC1155TokenFactory contract
  const factory = new ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    wallet
  );
  
  console.log("Deploying ERC1155TokenFactory...");
  
  // Deploy with updated constructor arguments and factory dependencies
  const deploymentTx = await wallet.sendTransaction({
    to: ethers.ZeroAddress,  // null address indicates contract creation
    data: factory.interface.encodeDeploy([signerAuthority1, signerAuthority2, defaultChoice, trustedForwarder]),
    customData: {
      factoryDeps: [erc1155Artifact.bytecode]
    }
  });
  
  // Wait for deployment
  const receipt = await deploymentTx.wait();
  
  // Get the deployed contract address from the receipt
  const factoryAddress = receipt.contractAddress;
  console.log("ERC1155TokenFactory deployed to:", factoryAddress);
  
  // Verify the deployment
  console.log("\nDeployment completed. Verify contracts with:");
  console.log(
    `npx hardhat verify --network ${network.name} ${factoryAddress} ` + 
    `${signerAuthority1} ${signerAuthority2} ${defaultChoice} ${trustedForwarder}`
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
