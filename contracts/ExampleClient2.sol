//SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "airnode-protocol/contracts/AirnodeClient.sol";


contract ExampleClient2 is AirnodeClient, Ownable {
    // When a request is made, a flag is set for it. When the request is
    // fulfilled, the flag is reset. As a result, fulfill() will only run when
    // there is an active request.
    mapping(bytes32 => bool) public incomingFulfillments;
    // The data used to fulfill the request is stored in fulfilledData. This is
    // not a requirement, you can do anything you want with the received data.
    mapping(bytes32 => bytes32) public fulfilledData;

    constructor (address airnodeAddress)
        AirnodeClient(airnodeAddress)
        public
    {}

    // The request is made by referring to a template, and providing
    // request-time parameters.
    function makeRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        bytes32 requestId = airnode.makeShortRequest(
            templateId,
            parameters
            );
        incomingFulfillments[requestId] = true;
    }

    // Provider's Airnode calls Airnode.sol, which calls back this method.
    // This is why this method is behind onlyAirnode.
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
