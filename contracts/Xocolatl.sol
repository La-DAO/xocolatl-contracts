// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IERC2612.sol";

contract Xocolatl is ERC20, ERC20FlashMint, AccessControl, Pausable, IERC2612 {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    bytes32 public constant FLASH_ROLE = keccak256("FLASH_ROLE");

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant UNPAUSE_ROLE = keccak256("UNPAUSE_ROLE");

    bytes32 public constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    
    bytes32 public immutable DOMAIN_SEPARATOR;

    uint256 public routerLimit;

    uint256 public flashloanFee;

    address public immutable underlying; // Required by AnyswapV4Router

    /**
     * See IER2612.
     */
    mapping (address => uint256) public override nonces;

    constructor() ERC20("Xocolatl MXN Stablecoin", "XOC") {

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender);
        _setupRole(FLASH_ROLE, msg.sender);
        _setupRole(ROUTER_ROLE, msg.sender);
        _setupRole(PAUSE_ROLE, msg.sender);
        _setupRole(UNPAUSE_ROLE, msg.sender);

        underlying = address(0);

        routerLimit = 5000 * 10 ** 18;

        uint chainId;

        assembly {chainId := chainid()}

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes("XOC")),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        require(deadline >= block.timestamp, 'Deadline: Expired!');
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'Invalid Signature!');
        _approve(owner, spender, value);
    }

    function mint(address to, uint256 amount) public {
        require(hasRole(MINTER_ROLE, msg.sender) || hasRole(ROUTER_ROLE, msg.sender), "Not authorized!");

        if (hasRole(ROUTER_ROLE, msg.sender)) {
            require(
                !paused() &&
                amount < routerLimit,
                "Cannot route!"
            );
            _mint(to, amount);
        } else {
            _mint(to, amount);
        }
    }

    function burn(address to, uint256 amount) public {
        require(hasRole(BURNER_ROLE, msg.sender) || hasRole(ROUTER_ROLE, msg.sender), "Not authorized!");

        if (hasRole(ROUTER_ROLE, msg.sender)) {
            require(
                !paused(),
                "Cannot route!"
            );
            _burn(to, amount);
        } else {
            _burn(to, amount);
        }
    }

    function flashFee(address token, uint256 amount) public view override returns (uint256) {
        amount;
        require(token == address(this), "ERC20FlashMint: wrong token");
        if (hasRole(FLASH_ROLE, msg.sender)) {
            return 0;
        } else {
            return flashloanFee;
        }
    }

    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(UNPAUSE_ROLE) {
        _unpause();
    }

}
