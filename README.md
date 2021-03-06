# ERC1404 Security Token
Implementation of Regulated Token Standard (R-Token) and ERC 1404 with Regulator Service and Service Registry

## RegulatedTokenERC1404
It's ERC20 compatible token. It will work with any wallet that can interact with ERC20 standard.

## RegulatorService
Stores permissions for the token. It has similar features to whitelist. 
Features:
### 1. Lock the token (disallow all transfers) - in case of emergency or needed transfer freeze to calculate dividents
To lock the token, one needs to call following funcion:
`setLocked` with following parameters:
* `_token` The address of the token, the RegulatedTokenERC1404 contract
* `_locked` `true` to lock, `false` to unlock

### 2. Forbid partial transfers. Require full token trasnfers only. It disallows to transfer fractions of token.
To allow/disallow partial token transfers, one needs to call following funcion:
`setPartialTransfers` with following parameters:
* `_token` The address of the token, the RegulatedTokenERC1404 contract
* `_enabled` `true` to allow partial transfers, `false` to disallow partial transfers

### 3. Set permissions for each user (whitelist)
Each user needs to be assigned proper permission by owner/admin before he/she can trade tokens. Permissions are as follows:
1 - Permission for allowing a participant to send tokens
2 - Permission for allowing a participant to receive tokens
3 - Permission for allowing a participant to send and receive tokens

To assign permission, one needs to call the funciton `setPermission` with following parameters:
* `_token` The address of the token, the RegulatedTokenERC1404 contract
* `_participant` The address of the trade participant
* `_permission` Permission to be set

## ServiceRegistry
`RegulatedTokenERC1404` stores a reference to a service registry. That registry stores address to `RegulatorService` that holds all permissions for token. The purpose of registry is to allow update/change of `RegulatorService` contract in case when we want to use third-party service for transfers validation.
To update `RegulatorService` one needs to call `replaceService` function with parameter `_service` that is address of a contract that implements new `RegulatorService` service.

-----------------

# Tutorials for most common scenarios
### Helpful links
### Rinkeby network
* RegulatedTokenERC1404 https://rinkeby.etherscan.io/address/0x09D9e4A7ADe5e7c32623E3794093d09cbc8865f5#code
* RegulatorService https://rinkeby.etherscan.io/address/0xA325ed31365fdbB5E32fcedF36933081184EC74d#code
* ServiceRegistry https://rinkeby.etherscan.io/address/0x5Fd808eb0C513dDE84FE949e73a4b28b0AB5f27b#code
### Main network
* RegulatedTokenERC1404 https://etherscan.io/address/0xae4eae7899d62c000d6fca7d7e1ab83bc4a54f5e#code
* RegulatorService https://etherscan.io/address/0x7dc8f1c5f3966872c06107c75cccfdd1082a470b#code
* ServiceRegistry https://etherscan.io/address/0xe25c51e2f3659f44eda877c143ae91630d9a531c#code
## Mint tokens
* Video tutorial: https://youtu.be/voRP7OCTMTA
#### Prepare for interaction
* Open https://www.myetherwallet.com/#contracts and RegulatedTokenERC1404 on https://rinkeby.etherscan.io/address/0x09D9e4A7ADe5e7c32623E3794093d09cbc8865f5#code
* Copy address and ABI to form and click `access`
#### Mint tokens
* Choose `mint` function from dropdown
* `_to` is an address (wallet) that token will be minted to
* `_amount` is the amount of token minted. Remember to include 18 decimal point zeros. If you want to mint 1 EVK, you need to put number `1000000000000000000` as `_amount` - 1 and 18 following zeros, if 1.5 then 15 and 17 following zeros and so on.
* Connect the wallet you are using
* Make sure all variables are correct and click `write` and approve transaction on your wallet
## Whitelist an address (wallet) with send, receiver or send & receiver permissions
* Video tutorial: https://youtu.be/eVizeg9-vZg
#### Prepare for interaction
* Open https://www.myetherwallet.com/#contracts and RegulatorService on https://rinkeby.etherscan.io/address/0xA325ed31365fdbB5E32fcedF36933081184EC74d#code
### Set permission
* Choose `setPermission` function from dropdown
* `_token` is an address of our token => `0x09D9e4A7ADe5e7c32623E3794093d09cbc8865f5`
* `_participant` is the address (wallet) we are assigning permissions for
* `_permission` is the permission to be set.
** 1 - Permission for allowing a participant to send tokens
** 2 - Permission for allowing a participant to receive tokens
** 3 - Permission for allowing a participant to send and receive tokens
* Connect the wallet you are using
* Make sure all variables are correct and click `write` and approve transaction on your wallet
## Lock and unlock the token
* Video tutorial: https://youtu.be/g2oNX8F7zqg
#### Prepare for interaction
* Open https://www.myetherwallet.com/#contracts and RegulatorService on https://rinkeby.etherscan.io/address/0xA325ed31365fdbB5E32fcedF36933081184EC74d#code
* Copy address and ABI to form and click `access`
#### Lock or unlock the token
* Choose `setLocked` function from dropdown
* `_token` is an address of our token => `0x09D9e4A7ADe5e7c32623E3794093d09cbc8865f5`
* `_locked` is `true` or `false`. It `true`, token will be locked, if `false` token will be unlocked
* Connect the wallet you are using
* Make sure all variables are correct and click `write` and approve transaction on your wallet
## Error message query - find out the reason of an unsuccessful transfer
* Video tutorial: https://youtu.be/OnG6zPpe75U
#### Get TX hash
* TX hash should be delivered by user, without it we cannot do anything
#### Get error code
* Open TX on etherscan and go to `event logs` tab
* Find `CheckStatus` event and look at `Data` section. Choose `number` from dropbox on first row. It should return a single number. Copy it.
#### Get error message
* Open `RegulatorService` contract on etherscan and click `Read Contract` tab.
* Find `messageForReason` function and paste error code (the number you copided) to `_reason` input.
* Click query and read the reason.
## Token burn
#### Prepare for interaction
* Open https://www.myetherwallet.com/#contracts and RegulatedTokenERC1404 on https://rinkeby.etherscan.io/address/0x09D9e4A7ADe5e7c32623E3794093d09cbc8865f5#code
* Copy address and ABI to form and click `access`
#### Run `burn` function
* Choose `burn` function from dropbox
* As `_value` put number of tokens you want to burn. Remember about 18 decinal points so if you want to burn 1 EVK, you need to put number `1000000000000000000` as `_value`
