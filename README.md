# Blockus ZKSync Smart Contracts

Smart contracts for Blockus platform deployed on ZKSync network.

## Project Layout

- `/contracts`: Solidity smart contracts
  - `ERC1155Token.sol`: Main token implementation
  - `ERC1155TokenBeacon.sol`: Beacon for upgradeable pattern
  - `ERC1155TokenBeaconFactory.sol`: Factory for creating new token instances
- `/scripts`: Deployment and interaction scripts
  - `blockus.ts`: Main deployment script
  - `constructors-params.ts`: Configuration for contract deployment
- `/test`: Contract test files

## Available Scripts

- `npm run compile`: Compiles the smart contracts
- `npm run deploy`: Deploys the contracts using `scripts/blockus.ts`
- `npm run clean`: Cleans the build artifacts
- `npm run test`: Runs tests on hardhat network

## Dependencies

- `@openzeppelin/contracts-upgradeable`: ^4.9.3
- `@matterlabs/hardhat-zksync`: ^1.3.0
- `zksync-ethers`: ^6.15.3
- `hardhat`: ^2.22.17

## Deployment

The deployment script (`scripts/blockus.ts`) will deploy:
1. ERC1155Token implementation
2. ERC1155TokenBeacon
3. ERC1155TokenBeaconFactory

To deploy:
```bash
npm run deploy