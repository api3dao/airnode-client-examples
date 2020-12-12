# Airnode client examples

This repo houses Airnode client examples that use various request types and design patterns.
See the contracts in `/contracts` and their accompanying scripts in `/scripts`.

To run an example
```sh
npm run example1
```

You are recommended to read the [protocol docs](https://github.com/api3dao/api3-docs#requestreponse-protocol) before reading the contracts to get a grasp of the terminology.

## Example 1

This example uses a [regular request](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/request.md#1-regular-request), meaning that it refers to a [template](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/template.md), but also allows the [requester](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/requester.md) to provide their own `requesterInd`, `designatedWallet`, `fulfillAddress` and `fulfillFunctionId`.

## Example 2

This example uses a [short request](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/request.md#2-short-request), meaning that it refers to a [template](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/template.md) for all parameters.
Differently from Example 1, the requester deploys the client contract first, then uses its address while creating the template

## Example 3

This example uses a [full request](https://github.com/api3dao/api3-docs/blob/master/request-response-protocol/request.md#3-full-request), meaning that all parameters are passed at request-time.
As a result, no template is used.
