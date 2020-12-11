//SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "airnode-protocol/contracts/AirnodeClient.sol";


contract ExampleClient1 is AirnodeClient, Ownable {
    mapping(bytes32 => bool) public incomingFulfillments;
    mapping(bytes32 => bytes32) public fulfilledData;
    uint256 public requesterInd;
    address public designatedWallet;

    constructor (address airnodeAddress)
        AirnodeClient(airnodeAddress)
        public
    {}

    function updateRequester(
        uint256 _requesterInd,
        address _designatedWallet
        )
        external
        onlyOwner
    {
        requesterInd = _requesterInd;
        designatedWallet = _designatedWallet;
    }

    function makeRequest(
        bytes32 templateId,
        bytes calldata parameters
        )
        external
    {
        bytes32 requestId = airnode.makeRequest(
            templateId,
            requesterInd,
            designatedWallet,
            address(this),
            this.fulfill.selector,
            parameters
            );
        incomingFulfillments[requestId] = true;
    }

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
        if (statusCode == 0)
        {
            fulfilledData[requestId] = data;
        }
    }
}
