//SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "airnode-protocol/contracts/AirnodeClient.sol";


contract ExampleClient1 is AirnodeClient, Ownable {
    // When a request is made, a flag is set for it. When the request is
    // fulfilled, the flag is reset. As a result, fulfill() will only run when
    // there is an active request.
    mapping(bytes32 => bool) public incomingFulfillments;
    // The data used to fulfill the request is stored in fulfilledData. This is
    // not a requirement, you can do anything you want with the received data.
    mapping(bytes32 => bytes32) public fulfilledData;
    // The requester sets the requesterIndex and designatedWallet variables
    // to specify the designated wallet that the provider should use to fulfill
    // the client's request.
    uint256 public requesterIndex;
    address public designatedWallet;

    constructor (address airnodeAddress)
        AirnodeClient(airnodeAddress)
        public
    {}

    // Note that this is put behind onlyOwner. Usually, the client contract
    // would be deployed by the requester, and thus only the requester can
    // update these values (but alternative patterns are also possible).
    function updateRequester(
        uint256 _requesterIndex,
        address _designatedWallet
        )
        external
        onlyOwner
    {
        requesterIndex = _requesterIndex;
        designatedWallet = _designatedWallet;
    }

    // The request is made by referring to a template, and providing
    // request-time parameters. Note that both of these values could also have
    // been hardcoded to the contract.
    function makeRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        bytes32 requestId = airnode.makeRequest(
            templateId,
            requesterIndex,
            designatedWallet,
            address(this),
            this.fulfill.selector,
            parameters
            );
        incomingFulfillments[requestId] = true;
    }

    // Provider's Airnode calls Airnode.sol, which calls back this method.
    // This is why this method is behin onlyAirnode.
    function fulfill(
        bytes32 requestId,
        uint256 statusCode,
        bytes32 data
        )
        external
        onlyAirnode()
    {
        require(incomingFulfillments[requestId], "No such request made");
        delete incomingFulfillments[requestId];
        // A statusCode of 0 means the request has been fulfilled sucessfully.
        // You can handle errors by making the same request, making another 
        // request, refunding the user, etc.
        if (statusCode == 0)
        {
            fulfilledData[requestId] = data;
        }
    }
}
