import { ethers, network } from "hardhat";
import {
  erc1155TokenImplConstructorParameters,
  getERC1155TokenBeaconConstructorParameters,
  getERC1155TokenBeaconFactoryConstructorParameters,
} from "./constructor-params";

async function deployContracts() {
  console.log(`Deploying contracts to ${network.name}`);

  // Deploy ERC1155Token Implementation
  const ERC1155Token = await ethers.getContractFactory("ERC1155Token");
  const erc1155Implementation = await ERC1155Token.deploy(
    ...erc1155TokenImplConstructorParameters
  );
  await erc1155Implementation.waitForDeployment();
  const implAddress = await erc1155Implementation.getAddress();
  console.log("ERC1155Token implementation deployed to:", implAddress);

  // Deploy ERC1155TokenBeacon
  const ERC1155TokenBeacon = await ethers.getContractFactory("ERC1155TokenBeacon");
  const beacon = await ERC1155TokenBeacon.deploy(
    ...getERC1155TokenBeaconConstructorParameters(implAddress)
  );
  await beacon.waitForDeployment();
  const beaconAddress = await beacon.getAddress();
  console.log("ERC1155TokenBeacon deployed to:", beaconAddress);

  // Deploy ERC1155TokenBeaconFactory
  const ERC1155TokenBeaconFactory = await ethers.getContractFactory("ERC1155TokenBeaconFactory");
  const factory = await ERC1155TokenBeaconFactory.deploy(
    ...getERC1155TokenBeaconFactoryConstructorParameters(beaconAddress)
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("ERC1155TokenBeaconFactory deployed to:", factoryAddress);

  // Verify the deployment
  console.log("\nDeployment completed. Verify contracts with:");
  console.log(`npx hardhat verify --network ${network.name} ${implAddress} ${erc1155TokenImplConstructorParameters.join(" ")}`);
  console.log(`npx hardhat verify --network ${network.name} ${beaconAddress} ${getERC1155TokenBeaconConstructorParameters(implAddress).join(" ")}`);
  console.log(`npx hardhat verify --network ${network.name} ${factoryAddress} ${getERC1155TokenBeaconFactoryConstructorParameters(beaconAddress).join(" ")}`);

  return {
    implementation: implAddress,
    beacon: beaconAddress,
    factory: factoryAddress
  };
}

deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
