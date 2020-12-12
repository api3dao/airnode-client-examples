const hre = require('hardhat');
const airnodeAbi = require('airnode-abi');
const util = require('./util');

async function main() {
  // We will pretend that there are two sides here, a provider admin and a requester admin.
  const signers = await hre.ethers.getSigners();
  const providerAdminSigner = signers[0];
  const requesterAdminSigner = signers[1];

  // Since we are running this locally, we have to deploy our own Airnode contract.
  // Normally, we would use the one that was already deployed
  // https://github.com/api3dao/airnode/tree/master/packages/protocol/deployments
  const Airnode = await hre.ethers.getContractFactory('Airnode');
  const airnode = await Airnode.deploy();

  // The provider has deployed an Airnode, which created a provider record:
  const { providerId, providerMnemonic } = await util.createProvider(airnode, providerAdminSigner);

  // Let us assume someone has created a template using airnode-admin
  // https://github.com/api3dao/airnode-admin#create-template
  const templateId = await util.createTemplate(airnode, providerId);
  // ...and then shared the templateId with the requester.

  // ~~~~~We have set the stage, the example begins here~~~~~

  // The first thing that the requester needs to do is to create a record,
  const requesterIndex = await util.createRequester(airnode, requesterAdminSigner);
  // ...derive their designated wallet associated with the provider,
  const designatedWalletAddress = await util.deriveDesignatedWalletAddress(airnode, providerId, requesterIndex);
  // ...and fund it.
  await requesterAdminSigner.sendTransaction({
    to: designatedWalletAddress,
    value: hre.ethers.utils.parseEther('0.1'),
  });

  // Then, the requester deploys a client contract that will use the template to make requests
  const ExampleClient1 = await hre.ethers.getContractFactory('ExampleClient1');
  const exampleClient1 = await ExampleClient1.deploy(airnode.address);
  // ...and endorses it. This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#endorse-client
  await airnode
    .connect(requesterAdminSigner)
    .updateClientEndorsementStatus(requesterIndex, exampleClient1.address, true);

  // The template is created with someone else's requesterInd and designatedWallet.
  // The client contract overrides these with the requester's values, but these values
  // need to be provided to the contract first.
  await exampleClient1.updateRequester(requesterIndex, designatedWalletAddress);

  // The template also has someone else's fulfillAddress and fulfillFunctionId. However,
  // the client already overrides these with its own address and the signature of its fulfill() function.

  // Now we can trigger a request. Note that in addition to the templateId, the request
  // can include additional parameters encoded in Airnode ABI.
  const response = await exampleClient1.makeRequest(
    templateId,
    airnodeAbi.encode([{ name: 'name2', type: 'bytes32', value: 'value2' }])
  );
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  const requestId = parsedLog.args.requestId;
  // And we are done! Provider's Airnode will detect the request, and call fulfill() with
  // the response to fulfill it.

  // For the sake of completeness, let us mock the provider Airnode fulfilling the request,
  await util.fulfillRegularRequest(airnode, requestId, providerMnemonic);
  // ...and print the returned data.
  const fulfilledData = await exampleClient1.fulfilledData(requestId);
  console.log(hre.ethers.utils.parseBytes32String(fulfilledData));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
