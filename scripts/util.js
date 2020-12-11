const hre = require("hardhat");
const airnodeAbi = require("airnode-abi");

async function createProvider(airnode, providerAdminSigner) {
  // No need to understand what exactly is happening here.
  // Airnode does this automatically after being deployed.
  // https://github.com/api3dao/api3-docs/blob/master/guides/deploying-airnode.md#deployment
  const providerMnemonic = hre.ethers.Wallet.createRandom().mnemonic.phrase;
  const hdNode = hre.ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  const xpub = hdNode.neuter().extendedKey;
  const masterWallet = hre.ethers.Wallet.fromMnemonic(providerMnemonic, 'm').connect(airnode.provider);
  await providerAdminSigner.sendTransaction({
    to: masterWallet.address,
    value: ethers.utils.parseEther('0.1'),
  });
  const response = await airnode.connect(masterWallet).createProvider(providerAdminSigner.address, xpub);
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  return {
    providerId: parsedLog.args.providerId,
    providerMnemonic
  };
}

async function createTemplate(airnode, providerId) {
  // This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#create-template
  const response = await airnode.createTemplate(
    providerId,                                                           // providerId
    "0x2605589dfc93c8f9c35eecdfe1e666c2193df30a8b13e1e0dd72941f59f9064c", // endpointId
    "123",                                                                // requesterInd
    "0x67bc6ed2f24b978a429bd7836790ce70e63be644",                         // designatedWallet
    "0x398aabad0ae5c17cba05a837cf5de9313e973014",                         // fulfillAddress
    "0x52c2ebc9",                                                         // fulfillFunctionId
    airnodeAbi.encode([{name: "name1", type: "bytes32", value: "value1"}])
  );
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  return parsedLog.args.templateId;
}

async function createRequester(airnode, requesterAdminSigner) {
  // This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#create-requester
  const response = await airnode.connect(requesterAdminSigner).createRequester(
    requesterAdminSigner.address
  );
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  return parsedLog.args.requesterInd;
}

async function deriveDesignatedWalletAddress(airnode, providerId, requesterIndex) {
  // This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#derive-designated-wallet
  const provider = await airnode.getProvider(providerId);
  const hdNode = ethers.utils.HDNode.fromExtendedKey(provider.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

async function fulfillRegularRequest(airnode, requestId, providerMnemonic) {
  // No need to understand what exactly is happening here.
  // Airnode does this automatically.
  const logs = await airnode.provider.getLogs({
    address: airnode.address,
    fromBlock: 0,
    topics: [
      ethers.utils.id('ClientRequestCreated(bytes32,bytes32,uint256,address,bytes32,uint256,address,address,bytes4,bytes)'),
      null,
      requestId,
    ],
  });
  const parsedLog = airnode.interface.parseLog(logs[0]);

  const masterHdNode = ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  const designatedHdNode = masterHdNode.derivePath(`m/0/${parsedLog.args.requesterInd}`);
  const designatedWallet = new ethers.Wallet(designatedHdNode.privateKey, hre.waffle.provider);

  await airnode.connect(designatedWallet).fulfill(
    requestId,
    parsedLog.args.providerId,
    0,
    hre.ethers.utils.formatBytes32String('API response'),
    parsedLog.args.fulfillAddress,
    parsedLog.args.fulfillFunctionId
    );
}

module.exports = { createProvider, createTemplate, createRequester, deriveDesignatedWalletAddress, fulfillRegularRequest };
