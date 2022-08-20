// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
* @title Assets accountant contract.
* @author daigaro.eth
* @notice Keeps records of all deposits, withdrawals, and minted assets by users using ERC1155 tokens.
* @dev Contracts are split into state and functionality.
* @dev At time of deployment, deployer is DEFAULT_ADMIN, however, this role should be transferred to a governance system.
* @dev Users do not interact directly with this contract. 
*/

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IHouseOfReserve.sol";
import "./interfaces/IHouseOfCoinState.sol";

contract AssetsAccountantState {

    // reserveTokenID => houseOfReserve 
    mapping(uint => address) public houseOfReserves;

    // reserveAsset => backAsset => reserveTokenID
    mapping(address => mapping(address => uint)) public reservesIds;

    // backedAsset  => houseOfCoin
    mapping(address => address) public houseOfCoins;

    mapping(address => bool) internal _isARegisteredHouse;

    // Contract Token name
    string internal constant NAME = "AssetAccountant";

    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");

}

contract AssetsAccountant is ERC1155, AccessControl, AssetsAccountantState {

    // AssetsAccountant Events

    /**  
    * @dev Emit when a HouseOfReserve is registered with AssetsAccountant
    * @param house Address of house registered.
    * @param typeOfHouse Either HouseOfReserve or HouseOfCoin.
    * @param asset ERC20 address of either reserve asset or backed asset.
    */
    event HouseRegistered(address house, bytes32 indexed typeOfHouse, address indexed asset);

    constructor() ERC1155("https://xocolatl.finance/") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(URI_SETTER_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
        _setupRole(LIQUIDATOR_ROLE, msg.sender);
    }

    /**  
    * @dev Register a house address in this contract.
    * @dev Requires caller to have DEFAULT_ADMIN_ROLE.
    * @param houseAddress Address of house registered.
    * @param asset ERC20 address of either reserve asset or backed asset.
    */
    function registerHouse(address houseAddress, address asset) 
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Check if House has been previously registered.
        require(!_isARegisteredHouse[houseAddress], "House already registered!");

        // Check type of House being registered and proceed accordingly

        if(IHouseOfReserve(houseAddress).HOUSE_TYPE() == keccak256("RESERVE_HOUSE")) {

            IHouseOfReserve hOfReserve = IHouseOfReserve(houseAddress);
            uint reserveTokenID = hOfReserve.reserveTokenID();
            address bAsset = hOfReserve.backedAsset();

            // Check that asset has NOT a house address assigned
            require(houseOfReserves[reserveTokenID] == address(0), "ReserveAsset already registered!");

            // Check intended asset matches House
            require(
                hOfReserve.reserveAsset() == asset,
                "Asset input does not matche reserveAsset in houseAddress!"
            );

            // Register mappings
            houseOfReserves[reserveTokenID] = houseAddress;
            _isARegisteredHouse[houseAddress] = true;
            reservesIds[asset][bAsset] = reserveTokenID;

            // Assign Roles
            _setupRole(MINTER_ROLE, houseAddress);
            _setupRole(BURNER_ROLE, houseAddress);

            emit HouseRegistered(houseAddress, hOfReserve.HOUSE_TYPE(), asset);
            
        } else if (IHouseOfCoinState(houseAddress).HOUSE_TYPE() == keccak256("COIN_HOUSE")) {

            IHouseOfCoinState hOfCoin = IHouseOfCoinState(houseAddress);

            // Check that asset has NOT a house address assigned
            require(houseOfCoins[asset] == address(0), "backedAsset already registered!");

            // Check intended asset matches House
            require(
                hOfCoin.backedAsset() == asset,
                "Asset input does not matche backedAsset in houseAddress!"
            );

            // Register mappings
            houseOfCoins[asset] = houseAddress;
            _isARegisteredHouse[houseAddress] = true;

            // Assign Roles
            _setupRole(MINTER_ROLE, houseAddress);
            _setupRole(BURNER_ROLE, houseAddress);

            emit HouseRegistered(houseAddress, hOfCoin.HOUSE_TYPE(), asset);

        } else {
            revert("house address type invalid!");
        }
    }

    /**
     * @dev Returns _name.
     */
    function name() public pure returns (string memory) {
        return NAME;
    }

    /**  
    * @dev Sets the URI for this contract.
    * @dev Requires caller to have URI_SETTER_ROLE.
    * @dev Since URI is not specified per Token Id this function does not emit {URI} event.
    * @param newuri String of the new URI.
    */
    function setURI(string memory newuri) public onlyRole(URI_SETTER_ROLE) {
        _setURI(newuri);
    }

    /**  
    * @notice Mints 'amount' of token Id for specified 'account' address.
    * @dev Requires caller to have MINTER_ROLE.
    * @param account User address
    * @param id Token Id
    * @param amount to mint
    * @param data Not use in this implementation, pass empty string "".
    */
    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mint(account, id, amount, data);
    }

    /**
    * @dev Batch implementation of {mint} function. Refer to {mint}.
    */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        external
        onlyRole(MINTER_ROLE)
    {
        _mintBatch(to, ids, amounts, data);
    }

    /**  
    * @notice Burns 'amount' of token Id for specified 'account' address.
    * @dev Requires caller to have BURNER_ROLE.
    * @param account User address
    * @param id Token Id
    * @param amount to burn
    */
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public onlyRole(BURNER_ROLE) {
        _burn(account, id, amount);
    }

    /**
    * @dev Batch implementation of {burn} function. Refer to {burn}.
    */
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public onlyRole(BURNER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /**
    * @dev Function override added to restrict transferability of tokens in this contract.
    * @dev Accounting assets are not meant to be transferable. 
    */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) public override onlyRole(LIQUIDATOR_ROLE) {
        _safeTransferFrom(from, to, id, amount, data);
    }

    /**
    * @dev See {safeTransferFrom}.
    */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) public pure override {
        from;
        to;
        ids;
        amounts;
        data;
        revert("Non-transferable!");
    }

    /**
    * @dev Function override required by Solidity.
    */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}