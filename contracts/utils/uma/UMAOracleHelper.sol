// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../../interfaces/uma/IOptimisticOracleV2.sol";
import "../../interfaces/uma/IdentifierWhitelistInterface.sol";
import "../../interfaces/uma/IUMAFinder.sol";
import "../../interfaces/uma/IAddressWhitelist.sol";
import "./OracleInterfaces.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UMAOracleHelper {
    struct LastRequest {
        uint256 timestamp;
        IOptimisticOracleV2.State state;
        uint256 resolvedPrice;
        address proposer;
    }

    // Finder for UMA contracts.
    IUMAFinder public finder;

    // Unique identifier for price feed ticker.
    bytes32 private priceIdentifier;

    // The collateral currency used to back the positions in this contract.
    IERC20 public collateralCurrency;

    LastRequest internal _lastRequest;

    constructor(
        address _collateralAddress,
        address _finderAddress,
        bytes32 _priceIdentifier
    ) {
        finder = IUMAFinder(_finderAddress);
        require(
            _getIdentifierWhitelist().isIdentifierSupported(_priceIdentifier),
            "Unsupported price identifier"
        );
        require(
            _getAddressWhitelist().isOnWhitelist(_collateralAddress),
            "Unsupported collateral type"
        );
        collateralCurrency = IERC20(_collateralAddress);
        priceIdentifier = _priceIdentifier;
    }

    // Requests a price for `priceIdentifier` at `requestedTime` from the Optimistic Oracle.
    function requestPrice() external {
        _checkLastRequest();

        uint256 requestedTime = block.timestamp;
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        oracle.requestPrice(
            priceIdentifier,
            requestedTime,
            "",
            IERC20(collateralCurrency),
            0
        );
        _resetLastRequest(requestedTime, IOptimisticOracleV2.State.Requested);
    }

    function requestPriceWithReward(uint256 rewardAmount) external {
        _checkLastRequest();
        require(
            collateralCurrency.allowance(msg.sender, address(this)) >=
                rewardAmount,
            "No erc20-approval"
        );
        IOptimisticOracleV2 oracle = _getOptimisticOracle();

        collateralCurrency.approve(address(oracle), rewardAmount);

        uint256 requestedTime = block.timestamp;

        oracle.requestPrice(
            priceIdentifier,
            requestedTime,
            "",
            IERC20(collateralCurrency),
            rewardAmount
        );

        _resetLastRequest(requestedTime, IOptimisticOracleV2.State.Requested);
    }

    function setCustomLivenessLastRequest(uint256 time) external {
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        oracle.setCustomLiveness(
            priceIdentifier,
            _lastRequest.timestamp,
            "",
            time
        );
    }

    function changeBondLastPriceRequest(uint256 bond) external {
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        oracle.setBond(priceIdentifier, _lastRequest.timestamp, "", bond);
    }

    function computeTotalBondLastRequest()
        public
        view
        returns (uint256 totalBond)
    {
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        IOptimisticOracleV2.Request memory request = oracle.getRequest(
            address(this),
            priceIdentifier,
            _lastRequest.timestamp,
            ""
        );
        totalBond = request.requestSettings.bond + request.finalFee;
    }

    function proposePriceLastRequest(uint256 proposedPrice) external {
        uint256 totalBond = computeTotalBondLastRequest();
        require(
            collateralCurrency.allowance(msg.sender, address(this)) >=
                totalBond,
            "No allowance for propose bond"
        );
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        collateralCurrency.approve(address(oracle), totalBond);
        oracle.proposePrice(
            address(this),
            priceIdentifier,
            _lastRequest.timestamp,
            "",
            int256(proposedPrice)
        );
        _lastRequest.proposer = msg.sender;
    }

    function settleAndGetPriceLastRequest() external {
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        int256 settledPrice = oracle.settleAndGetPrice(
            priceIdentifier,
            _lastRequest.timestamp,
            ""
        );
        require(settledPrice > 0, "Settle Price Error!");
        _lastRequest.resolvedPrice = uint256(settledPrice);
        collateralCurrency.transfer(
            _lastRequest.proposer,
            computeTotalBondLastRequest()
        );
    }

    function _checkLastRequest() internal {
        if (_lastRequest.timestamp != 0) {
            require(
                _lastRequest.state == IOptimisticOracleV2.State.Settled,
                "Last request not settled!"
            );
        }
    }

    function _resetLastRequest(
        uint256 requestedTime,
        IOptimisticOracleV2.State state
    ) internal {
        _lastRequest.timestamp = requestedTime;
        _lastRequest.state = state;
        _lastRequest.resolvedPrice = 0;
        _lastRequest.proposer = address(0);
    }

    function _getIdentifierWhitelist()
        internal
        view
        returns (IdentifierWhitelistInterface)
    {
        return
            IdentifierWhitelistInterface(
                finder.getImplementationAddress(
                    OracleInterfaces.IdentifierWhitelist
                )
            );
    }

    function _getAddressWhitelist() internal view returns (IAddressWhitelist) {
        return
            IAddressWhitelist(
                finder.getImplementationAddress(
                    OracleInterfaces.CollateralWhitelist
                )
            );
    }

    function _getOptimisticOracle()
        internal
        view
        returns (IOptimisticOracleV2)
    {
        return
            IOptimisticOracleV2(
                finder.getImplementationAddress("OptimisticOracleV2")
            );
    }
}
