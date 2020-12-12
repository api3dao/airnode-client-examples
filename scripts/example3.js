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
  const ExampleClient3 = await hre.ethers.getContractFactory('ExampleClient3');
  const exampleClient3 = await ExampleClient3.deploy(airnode.address);
  // ...and endorses it. This is normally done using airnode-admin
  // https://github.com/api3dao/airnode-admin#endorse-client
  await airnode
    .connect(requesterAdminSigner)
    .updateClientEndorsementStatus(requesterIndex, exampleClient3.address, true);

  // Now we can trigger a request. Note that the requester provides all parameters at request-time.
  const response = await exampleClient3.makeRequest(
    providerId,
    '0x2605589dfc93c8f9c35eecdfe1e666c2193df30a8b13e1e0dd72941f59f9064c', // Example endpointId (randomly generated)
    requesterIndex,
    designatedWalletAddress,
    airnodeAbi.encode([
      { name: 'name1', type: 'bytes32', value: 'value1' },
      { name: 'name2', type: 'bytes32', value: 'value2' },
    ])
  );
  const receipt = await hre.waffle.provider.getTransactionReceipt(response.hash);
  const parsedLog = airnode.interface.parseLog(receipt.logs[0]);
  const requestId = parsedLog.args.requestId;
  // And we are done! Provider's Airnode will detect the request, and call fulfill() with
  // the response to fulfill it.

  // For the sake of completeness, let us mock the provider Airnode fulfilling the request,
  await util.fulfillFullRequest(airnode, requestId, providerMnemonic);
  // ...and print the returned data.
  const fulfilledData = await exampleClient3.fulfilledData(requestId);
  console.log(hre.ethers.utils.parseBytes32String(fulfilledData));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
