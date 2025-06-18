// Instruction Discriminators
export const DISCRIMINATORS = {
  JUPITER: {
    ROUTE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 64, 198, 205, 232, 38, 8, 113, 226]),
  },
  JUPITER_DCA: {
    FILLED: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 134, 4, 17, 63, 221, 45, 177, 173]), //FulfillFlashFill
    CLOSE_DCA: new Uint8Array([22, 7, 33, 98, 168, 183, 34, 243]), // closeDca
    OPEN_DCA: new Uint8Array([36, 65, 185, 54, 1, 210, 100, 163]), // openDca
    OPEN_DCA_V2: new Uint8Array([142, 119, 43, 109, 162, 52, 11, 177]), // openDcaV2
  },
  JUPITER_LIMIT_ORDER: {
    CANCEL_ORDER: new Uint8Array([95, 129, 237, 240, 8, 49, 223, 132]), // CancelOrder
    CREATE_ORDER: new Uint8Array([133, 110, 74, 175, 112, 159, 245, 159]), // initializeOrder
    TRADE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 189, 219, 127, 211, 78, 230, 97, 238]), //TradeEvent
    UNKNOWN: new Uint8Array([232, 122, 115, 25, 199, 143, 136, 162]), // Unknown
    FLASH_FILL_ORDER: new Uint8Array([252, 104, 18, 134, 164, 78, 18, 140]), // FlashFillOrder
  },
  JUPITER_LIMIT_ORDER_V2: {
    CANCEL_ORDER: new Uint8Array([95, 129, 237, 240, 8, 49, 223, 132]), // CancelOrder
    CREATE_ORDER_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 49, 142, 72, 166, 230, 29, 84, 84]), // CreateOrderEvent
    TRADE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 189, 219, 127, 211, 78, 230, 97, 238]), //TradeEvent
    UNKNOWN: new Uint8Array([232, 122, 115, 25, 199, 143, 136, 162]), // Unknown
    FLASH_FILL_ORDER: new Uint8Array([252, 104, 18, 134, 164, 78, 18, 140]), // FlashFillOrder
  },
  JUPITER_VA: {
    FILL_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 78, 225, 199, 154, 86, 219, 224, 169]), //fill event
    OPEN_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 104, 220, 224, 191, 87, 241, 132, 61]), //open event
    CLOSE_EVENT: new Uint8Array([]), // TODO: close event
    DEPOSIT_EVENT: new Uint8Array([]), // TODO: Deposit event
    WITHDRAW_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 192, 241, 201, 217, 70, 150, 90, 247]), //withdraw event
  },
  PUMPFUN: {
    CREATE: new Uint8Array([24, 30, 200, 40, 5, 28, 7, 119]),
    MIGRATE: new Uint8Array([155, 234, 231, 146, 236, 158, 162, 30]),
    BUY: new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
    SELL: new Uint8Array([51, 230, 133, 164, 1, 127, 131, 173]),

    TRADE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 189, 219, 127, 211, 78, 230, 97, 238]),
    CREATE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 27, 114, 169, 77, 222, 235, 99, 118]),
    COMPLETE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 95, 114, 97, 156, 212, 46, 152, 8]),
  },
  PUMPSWAP: {
    CREATE_POOL: new Uint8Array([233, 146, 209, 142, 207, 104, 64, 188]),
    ADD_LIQUIDITY: new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182]),
    REMOVE_LIQUIDITY: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
    BUY: new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
    SELL: new Uint8Array([51, 230, 133, 164, 1, 127, 131, 173]),

    CREATE_POOL_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 177, 49, 12, 210, 160, 118, 167, 116]),
    ADD_LIQUIDITY_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 120, 248, 61, 83, 31, 142, 107, 144]),
    REMOVE_LIQUIDITY_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 22, 9, 133, 26, 160, 44, 71, 192]),
    BUY_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 103, 244, 82, 31, 44, 245, 119, 119]),
    SELL_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 62, 47, 55, 10, 165, 3, 220, 42]),
  },
  MOONSHOT: {
    BUY: new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
    SELL: new Uint8Array([51, 230, 133, 164, 1, 127, 131, 173]),
  },
  RAYDIUM: {
    CREATE: new Uint8Array([1]),
    ADD_LIQUIDITY: new Uint8Array([3]),
    REMOVE_LIQUIDITY: new Uint8Array([4]), // 4, 226, 190, 68, 43,   0,   0,  0
  },
  RAYDIUM_CL: {
    CREATE: {
      openPosition: new Uint8Array([135, 128, 47, 77, 15, 152, 240, 49]), // openPosition
      openPositionV2: new Uint8Array([77, 184, 74, 214, 112, 86, 241, 199]), // openPositionV2
      openPositionWithToken22Nft: new Uint8Array([77, 255, 174, 82, 125, 29, 201, 46]), // openPositionWithToken22Nft
    },
    ADD_LIQUIDITY: {
      increaseLiquidity: new Uint8Array([46, 156, 243, 118, 13, 205, 251, 178]), // increaseLiquidity
      increaseLiquidityV2: new Uint8Array([133, 29, 89, 223, 69, 238, 176, 10]), // increaseLiquidityV2
    },
    REMOVE_LIQUIDITY: {
      decreaseLiquidity: new Uint8Array([160, 38, 208, 111, 104, 91, 44, 1]), // decreaseLiquidity
      decreaseLiquidityV2: new Uint8Array([58, 127, 188, 62, 79, 82, 196, 96]), // decreaseLiquidityV2
    },
  },
  RAYDIUM_CPMM: {
    CREATE: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]), // initialize
    ADD_LIQUIDITY: new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182]), // deposit
    REMOVE_LIQUIDITY: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]), // withdraw
  },
  RAYDIUM_LCP: {
    CREATE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 151, 215, 226, 9, 118, 161, 115, 174]), // PoolCreateEvent
    TRADE_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 189, 219, 127, 211, 78, 230, 97, 238]), // TradeEvent
    MIGRATE_TO_AMM: new Uint8Array([207, 82, 192, 145, 254, 207, 145, 223]), // complete: migrate_to_amm
    MIGRATE_TO_CPSWAP: new Uint8Array([136, 92, 200, 103, 28, 218, 144, 140]), // complete: migrate_to_cpswap
    BUY_EXACT_IN: new Uint8Array([250, 234, 13, 123, 213, 156, 19, 236]), // buyExactIn
    BUY_EXACT_OUT: new Uint8Array([24, 211, 116, 40, 105, 3, 153, 56]), // buyExactOut
    SELL_EXACT_IN: new Uint8Array([149, 39, 222, 155, 211, 124, 152, 26]), // sellExactIn
    SELL_EXACT_OUT: new Uint8Array([95, 200, 71, 34, 8, 9, 11, 166]), // sellExactOut
  },
  METEORA_DLMM: {
    ADD_LIQUIDITY: {
      addLiquidity: new Uint8Array([181, 157, 89, 67, 143, 182, 52, 72]), //addLiquidity
      addLiquidityByStrategy: new Uint8Array([7, 3, 150, 127, 148, 40, 61, 200]), // addLiquidityByStrategy
      addLiquidityByStrategy2: new Uint8Array([3, 221, 149, 218, 111, 141, 118, 213]), // addLiquidityByStrategy2
      addLiquidityByStrategyOneSide: new Uint8Array([41, 5, 238, 175, 100, 225, 6, 205]), //addLiquidityByStrategyOneSide
      addLiquidityOneSide: new Uint8Array([94, 155, 103, 151, 70, 95, 220, 165]), //addLiquidityOneSide
      addLiquidityOneSidePrecise: new Uint8Array([161, 194, 103, 84, 171, 71, 250, 154]), //addLiquidityOneSidePrecise
      addLiquidityByWeight: new Uint8Array([28, 140, 238, 99, 231, 162, 21, 149]), //addLiquidityByWeight
    },
    REMOVE_LIQUIDITY: {
      removeLiquidity: new Uint8Array([80, 85, 209, 72, 24, 206, 177, 108]), //removeLiquidity
      removeLiquidityByRange: new Uint8Array([26, 82, 102, 152, 240, 74, 105, 26]), // removeLiquidityByRange
      removeLiquidityByRange2: new Uint8Array([204, 2, 195, 145, 53, 145, 145, 205]), // removeLiquidityByRange2
      removeAllLiquidity: new Uint8Array([10, 51, 61, 35, 112, 105, 24, 85]), // removeAllLiquidity
      claimFee: new Uint8Array([169, 32, 79, 137, 136, 232, 70, 137]), //claimFee
      claimFeeV2: new Uint8Array([112, 191, 101, 171, 28, 144, 127, 187]), //claimFeeV2
    },
    LIQUIDITY_EVENT: {
      compositionFeeEvent: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 128, 151, 123, 106, 17, 102, 113, 142]), //CompositionFee
      addLiquidityEvent: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 31, 94, 125, 90, 227, 52, 61, 186]), //AddLiquidity
      removeLiquidityEvent: new Uint8Array([
        228, 69, 165, 46, 81, 203, 154, 29, 151, 113, 115, 164, 224, 159, 112, 193,
      ]), //RemoveLiquidity
    },
  },
  METEORA_POOLS: {
    CREATE: new Uint8Array([7, 166, 138, 171, 206, 171, 236, 244]), // initializePermissionlessConstantProductPoolWithConfig
    ADD_LIQUIDITY: new Uint8Array([168, 227, 50, 62, 189, 171, 84, 176]), // addBalanceLiquidity
    REMOVE_LIQUIDITY: new Uint8Array([133, 109, 44, 179, 56, 238, 114, 33]), // removeBalanceLiquidity
    ADD_IMBALANCE_LIQUIDITY: new Uint8Array([79, 35, 122, 84, 173, 15, 93, 191]), //addImbalanceLiquidity
  },
  METEORA_DAMM: {
    INITIALIZE_POOL: new Uint8Array([95, 180, 10, 172, 84, 174, 232, 40]), // initialize_pool
    INITIALIZE_CUSTOM_POOL: new Uint8Array([20, 161, 241, 24, 189, 221, 180, 2]), // initialize_customizable_pool
    ADD_LIQUIDITY: new Uint8Array([181, 157, 89, 67, 143, 182, 52, 72]), // add_liquidity
    CLAIM_POSITION_FEE: new Uint8Array([180, 38, 154, 17, 133, 33, 162, 211]), // claim_position_fee
    REMOVE_LIQUIDITY: new Uint8Array([80, 85, 209, 72, 24, 206, 177, 108]), //remove_liquidity
    REMOVE_ALL_LIQUIDITY: new Uint8Array([10, 51, 61, 35, 112, 105, 24, 85]), // remove_all_liquidity
    CREATE_POSITION_EVENT: new Uint8Array([228, 69, 165, 46, 81, 203, 154, 29, 156, 15, 119, 198, 29, 181, 221, 55]), // EvtCreatePosition
  },
  ORCA: {
    CREATE: new Uint8Array([242, 29, 134, 48, 58, 110, 14, 60]), // openPositionWithMetadata
    CREATE2: new Uint8Array([212, 47, 95, 92, 114, 102, 131, 250]), // openPositionWithTokenExtensions
    ADD_LIQUIDITY: new Uint8Array([46, 156, 243, 118, 13, 205, 251, 178]), // increaseLiquidity
    ADD_LIQUIDITY2: new Uint8Array([133, 29, 89, 223, 69, 238, 176, 10]), // increaseLiquidityV2
    REMOVE_LIQUIDITY: new Uint8Array([160, 38, 208, 111, 104, 91, 44, 1]), // decreaseLiquidity
    OTHER1: new Uint8Array([164, 152, 207, 99, 30, 186, 19, 182]), // collectFees
    OTHER2: new Uint8Array([70, 5, 132, 87, 86, 235, 177, 34]), //collectReward
  },
  BOOPFUN: {
    CREATE: new Uint8Array([84, 52, 204, 228, 24, 140, 234, 75]),
    DEPLOY: new Uint8Array([180, 89, 199, 76, 168, 236, 217, 138]), //deploy_bonding_curve
    COMPLETE: new Uint8Array([45, 235, 225, 181, 17, 218, 64, 130]),
    BUY: new Uint8Array([138, 127, 14, 91, 38, 87, 115, 105]),
    SELL: new Uint8Array([109, 61, 40, 187, 230, 176, 135, 174]),
  },
} as const;
