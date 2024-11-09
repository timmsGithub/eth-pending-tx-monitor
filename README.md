# Eth pending tx monitor

Monitoring the transactions which are currently in the Ethereum memPool. Only NFT mint transactions will be picked up by the monitor. If the monitor recognized more than a pre set number of mints in a pre set time it will notify the user.

## Important notice

The monitor will only work with an own Ethereum RPC.

## Available Commands

Here are the available commands you can use within the system:

### `/showfilters`
- **Description**: Show the filters you have chosen.

### `/resetfilters`
- **Description**: Reset all filters to their default state.

### `/filtercurrentpendingtransactions`
- **Description**: Filter the amount of pending transactions for the contract.

### `/filterprice`
- **Description**: Filter the price per NFT.

### `/filtermaxsupply`
- **Description**: Filter the maximum supply of the collection.
