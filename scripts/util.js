const hre = require('hardhat');

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
    value: hre.ethers.utils.parseEther('0.1'),
  });
  const response = await airnode.connect(masterWallet).createProvider(providerAdminSigner.address, xpub);
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  return {
    providerId: parsedLog.args.providerId,
    providerMnemonic,
  };
}

async function createTemplate(
  airnode,
  providerId,
  endpointId,
  requesterInd,
  designatedWallet,
  fulfillAddress,
  fulfillFunctionId,
  parameters
) {
  const response = await airnode.createTemplate(
    providerId,
    endpointId,
    requesterInd,
    designatedWallet,
    fulfillAddress,
    fulfillFunctionId,
    parameters
  );
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  return parsedLog.args.templateId;
}

async function createRequester(airnode, requesterAdminSigner) {
  // This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#create-requester
  const response = await airnode.connect(requesterAdminSigner).createRequester(requesterAdminSigner.address);
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  return parsedLog.args.requesterInd;
}

async function deriveDesignatedWalletAddress(airnode, providerId, requesterIndex) {
  // This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#derive-designated-wallet
  const provider = await airnode.getProvider(providerId);
  const hdNode = hre.ethers.utils.HDNode.fromExtendedKey(provider.xpub);
  const designatedWalletNode = hdNode.derivePath(`m/0/${requesterIndex}`);
  return designatedWalletNode.address;
}

async function fulfillRegularRequest(airnode, requestId, providerMnemonic) {
  // No need to understand what exactly is happening here.
  // Airnode does this automatically when it detects a request.
  const logs = await airnode.provider.getLogs({
    address: airnode.address,
    fromBlock: 0,
    topics: [
      hre.ethers.utils.id(
        'ClientRequestCreated(bytes32,bytes32,uint256,address,bytes32,uint256,address,address,bytes4,bytes)'
      ),
      null,
      requestId,
    ],
  });
  const parsedLog = airnode.interface.parseLog(logs[0]);

  const masterHdNode = hre.ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  const designatedHdNode = masterHdNode.derivePath(`m/0/${parsedLog.args.requesterInd}`);
  const designatedWallet = new hre.ethers.Wallet(designatedHdNode.privateKey, hre.waffle.provider);

  await airnode
    .connect(designatedWallet)
    .fulfill(
      requestId,
      parsedLog.args.providerId,
      0,
      hre.ethers.utils.formatBytes32String('API response'),
      parsedLog.args.fulfillAddress,
      parsedLog.args.fulfillFunctionId
    );
}

async function fulfillShortRequest(airnode, requestId, providerMnemonic) {
  // No need to understand what exactly is happening here.
  // Airnode does this automatically when it detects a request.
  const logs = await airnode.provider.getLogs({
    address: airnode.address,
    fromBlock: 0,
    topics: [
      hre.ethers.utils.id('ClientShortRequestCreated(bytes32,bytes32,uint256,address,bytes32,bytes)'),
      null,
      requestId,
    ],
  });
  const parsedLog = airnode.interface.parseLog(logs[0]);
  const template = await airnode.getTemplate(parsedLog.args.templateId);

  const masterHdNode = hre.ethers.utils.HDNode.fromMnemonic(providerMnemonic);
  const designatedHdNode = masterHdNode.derivePath(`m/0/${template.requesterInd}`);
  const designatedWallet = new hre.ethers.Wallet(designatedHdNode.privateKey, hre.waffle.provider);

  await airnode
    .connect(designatedWallet)
    .fulfill(
      requestId,
      template.providerId,
      0,
      hre.ethers.utils.formatBytes32String('API response'),
      template.fulfillAddress,
      template.fulfillFunctionId
    );
}

module.exports = {
  createProvider,
  createTemplate,
  createRequester,
  deriveDesignatedWalletAddress,
  fulfillRegularRequest,
  fulfillShortRequest,
};
