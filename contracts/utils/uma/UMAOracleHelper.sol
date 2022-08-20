// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../../interfaces/uma/IOptimisticOracleV2.sol";
import "../../interfaces/uma/IdentifierWhitelistInterface.sol";
import "../../interfaces/uma/IUMAFinder.sol";
import "../../interfaces/uma/IAddressWhitelist.sol";
import "./UMAOracleInterfaces.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/chainlink/IAggregatorV3.sol";

contract UMAOracleHelper {
    /**
     * @dev emitted after the {acceptableUMAPriceObsolence} changes
     * @param newTime of acceptable UMA price obsolence
     **/
    event AcceptableUMAPriceTimeChange(uint256 newTime);

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
    IERC20 public stakeCollateralCurrency;
    
    uint256 public acceptableUMAPriceObselence;

    LastRequest internal _lastRequest;

    constructor(
        address _stakeCollateralCurrency,
        address _finderAddress,
        bytes32 _priceIdentifier,
        uint256 _acceptableUMAPriceObselence
    ) {
        finder = IUMAFinder(_finderAddress);
        require(
            _getIdentifierWhitelist().isIdentifierSupported(_priceIdentifier),
            "Unsupported price identifier"
        );
        require(
            _getAddressWhitelist().isOnWhitelist(_stakeCollateralCurrency),
            "Unsupported collateral type"
        );
        stakeCollateralCurrency = IERC20(_stakeCollateralCurrency);
        priceIdentifier = _priceIdentifier;
        setAcceptableUMAPriceObsolence(_acceptableUMAPriceObselence);
    }

    /**
     * Returns computed price in 8 decimal places.
     * @dev Requires chainlink price feed address for reserve asset.
     * Requires:
     * - price settled time is not greater than acceptableUMAPriceObselence.
     * - last request proposed price is settled according to UMA process: 
     *   https://docs.umaproject.org/protocol-overview/how-does-umas-oracle-work
     */
    function getLastRequest(address addrChainlinkReserveAsset_)
        external
        view
        returns (
            uint256 computedPrice
        )
    {
        uint256 priceObsolence = block.timestamp > _lastRequest.timestamp
            ? block.timestamp - _lastRequest.timestamp
            : type(uint256).max;
        require(_lastRequest.state == IOptimisticOracleV2.State.Settled, "Not settled!");
        require(
            priceObsolence < acceptableUMAPriceObselence,
            "Price too old!"
        );
        (, int256 usdreserve, , , ) = IAggregatorV3(addrChainlinkReserveAsset_).latestRoundData();
        computedPrice = uint256(usdreserve) * 1e18  / _lastRequest.resolvedPrice;
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
            IERC20(stakeCollateralCurrency),
            0
        );
        _resetLastRequest(requestedTime, IOptimisticOracleV2.State.Requested);
    }

    function requestPriceWithReward(uint256 rewardAmount) external {
        _checkLastRequest();
        require(
            stakeCollateralCurrency.allowance(msg.sender, address(this)) >=
                rewardAmount,
            "No erc20-approval"
        );
        IOptimisticOracleV2 oracle = _getOptimisticOracle();

        stakeCollateralCurrency.approve(address(oracle), rewardAmount);

        uint256 requestedTime = block.timestamp;

        oracle.requestPrice(
            priceIdentifier,
            requestedTime,
            "",
            IERC20(stakeCollateralCurrency),
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

    /**
     * @dev Proposed price should be in 18 decimals per specification: 
     * https://github.com/UMAprotocol/UMIPs/blob/master/UMIPs/umip-139.md
     */
    function proposePriceLastRequest(uint256 proposedPrice) external {
        uint256 totalBond = computeTotalBondLastRequest();
        require(
            stakeCollateralCurrency.allowance(msg.sender, address(this)) >=
                totalBond,
            "No allowance for propose bond"
        );
        stakeCollateralCurrency.transferFrom(msg.sender, address(this), totalBond);
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        stakeCollateralCurrency.approve(address(oracle), totalBond);
        oracle.proposePrice(
            address(this),
            priceIdentifier,
            _lastRequest.timestamp,
            "",
            int256(proposedPrice)
        );
        _lastRequest.proposer = msg.sender;
        _lastRequest.state = IOptimisticOracleV2.State.Proposed;
    }

    function settleLastRequestAndGetPrice() external returns (uint256 price) {
        IOptimisticOracleV2 oracle = _getOptimisticOracle();
        int256 settledPrice = oracle.settleAndGetPrice(
            priceIdentifier,
            _lastRequest.timestamp, 
            ""
        );
        require(settledPrice > 0, "Settle Price Error!");
        _lastRequest.resolvedPrice = uint256(settledPrice);
        _lastRequest.state = IOptimisticOracleV2.State.Settled;
        stakeCollateralCurrency.transfer(
            _lastRequest.proposer,
            computeTotalBondLastRequest()
        );
        price = uint256(settledPrice);
    }

    /**
     * @notice Sets a new acceptable UMA price feed obsolence time.
     * @dev Restricted to admin only.
     * @param _newTime for acceptable UMA price feed obsolence.
     * Emits a {AcceptableUMAPriceTimeChange} event.
     */
    function setAcceptableUMAPriceObsolence(uint256 _newTime) public {
        if (_newTime < 10 minutes) {
            // NewTime is too small
            revert("Invalid input");
        }
        acceptableUMAPriceObselence = _newTime;
        emit AcceptableUMAPriceTimeChange(_newTime);
    }

    function _checkLastRequest() internal view {
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
                    UMAOracleInterfaces.IdentifierWhitelist
                )
            );
    }

    function _getAddressWhitelist() internal view returns (IAddressWhitelist) {
        return
            IAddressWhitelist(
                finder.getImplementationAddress(
                    UMAOracleInterfaces.CollateralWhitelist
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
