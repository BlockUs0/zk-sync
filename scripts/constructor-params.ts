//##############------CREATE2DEPLOYER------##############
const create2deployerConstructorParameters = [
    "0x71B81e78F08c3f2d799e3C1d5D4cE877ab0c8804" // CREATE2_OWNER_ADDRESS
];

//##############------ERC1155 IMPL------##############
const erc1155TokenImplConstructorParametersDic = {
    //PROD
    1: {
        defaultOwner: "0x9aFCbe37C5C34562F04Fd55AF0f3421898635e11",
        defaultAuthoritySigner: "0x9aFCbe37C5C34562F04Fd55AF0f3421898635e11",
        defaultTrustedForwarder: "0x97015cD4C3d456997DD1C40e2a18c79108FCc412",
    },
    //STAGE 
    2: {
        defaultOwner: "0x71B81e78F08c3f2d799e3C1d5D4cE877ab0c8804",
        defaultAuthoritySigner: "0x67C9Ce97D99cCb55B58Fc5502C3dE426101095Af",
        defaultTrustedForwarder: "0x97015cD4C3d456997DD1C40e2a18c79108FCc412",
    }
};

const prodConfig = erc1155TokenImplConstructorParametersDic[1];
const stageConfig = erc1155TokenImplConstructorParametersDic[2];

const erc1155TokenImplConstructorParameters = [
    prodConfig.defaultOwner,
    prodConfig.defaultAuthoritySigner,
    prodConfig.defaultTrustedForwarder,
    stageConfig.defaultOwner,
    stageConfig.defaultAuthoritySigner,
    stageConfig.defaultTrustedForwarder,
];

//##############------ERC1155 BEACON------##############
// This will be dynamically set after implementation deployment
let lastERC1155ImplementationAddress: string;

const getERC1155TokenBeaconConstructorParameters = (implAddress: string) => [
    implAddress,
    "0xaF3c0d8C1FEF4547648Afa29D53d19A8340E5fa0" // BEACON_OWNER_ADDRESS
];

//##############------ERC1155 BEACON FACTORY------##############
// This will be dynamically set after beacon deployment
let erc1155BeaconAddress: string;

const getERC1155TokenBeaconFactoryConstructorParameters = (beaconAddress: string) => [
    beaconAddress
];

module.exports = {
    prodConfig,
    stageConfig,
    create2deployerConstructorParameters,
    erc1155TokenImplConstructorParametersDic,
    erc1155TokenImplConstructorParameters,
    getERC1155TokenBeaconConstructorParameters,
    getERC1155TokenBeaconFactoryConstructorParameters,
};