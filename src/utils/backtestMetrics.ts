import type { StrategyBacktestResult, Trade } from '@/types';

function getSortedTrades(trades: Trade[]): Trade[] {
  const sortedTrades = trades.slice().sort((a, b) => (a.profit_ratio ?? 0) - (b.profit_ratio ?? 0));
  return sortedTrades;
}

function getBestPair(trades: Trade[]) {
  const value = trades[trades.length - 1];
  if (!value) {
    return 'N/A';
  }
  return `${value.pair} ${formatPercent(value.profit_ratio, 2)}`;
}

function getWorstPair(trades: Trade[]) {
  const value = trades[0];
  if (!value) {
    return 'N/A';
  }
  return `${value.pair} ${formatPercent(value.profit_ratio, 2)}`;
}

function useFormatPriceStake(stake_currency_decimals: number, stake_currency: string) {
  const formatPriceStake = (price) => {
    return `${formatPrice(price, stake_currency_decimals)} ${stake_currency}`;
  };
  return formatPriceStake;
}

export function generateBacktestMetricRows(result: StrategyBacktestResult) {
  const sortedTrades = getSortedTrades(result.trades);
  const bestPair = getBestPair(sortedTrades);
  const worstPair = getWorstPair(sortedTrades);
  const pairSummary = result.results_per_pair[result.results_per_pair.length - 1];

  const formatPriceStake = useFormatPriceStake(
    result.stake_currency_decimals,
    result.stake_currency,
  );

  // Transpose Result into readable format
  const shortMetrics =
    result.trade_count_short && result.trade_count_short > 0
      ? [
          { '___ ': '___' },
          {
            '多头 / 空头': `${result.trade_count_long} / ${result.trade_count_short}`,
          },
          {
            多头总利润: `${formatPercent(
              result.profit_total_long || 0,
            )} | ${formatPriceStake(result.profit_total_long_abs)}`,
          },
          {
            空头总利润: `${formatPercent(
              result.profit_total_short || 0,
            )} | ${formatPriceStake(result.profit_total_short_abs)}`,
          },
        ]
      : [];

  const _b_append = ` (钱包余额)`;
  const walletBalanceMetrics = result.wallet_stats
    ? [
        { '--- 钱包余额指标 ---': '' },
        {
          [`最大回撤${_b_append}`]: formatPercent(result.wallet_stats.max_drawdown_account),
        },
        {
          [`绝对最大回撤${_b_append}`]: formatPriceStake(result.wallet_stats.max_drawdown_abs),
        },
        {
          [`回撤时长${_b_append}`]: result.wallet_stats.drawdown_duration ?? 'N/A',
        },
        {
          [`回撤开始 | 结束时的利润${_b_append}`]: `${formatPriceStake(result.wallet_stats.max_drawdown_high)} | ${formatPriceStake(
            result.wallet_stats.max_drawdown_low,
          )}`,
        },
        // { 'Max Drawdown dates (wallet balance)': formatPercent(result.wallet_stats.max_drawdown_account) },
        {
          [`回撤开始时间${_b_append}`]: timestampms(result.wallet_stats?.drawdown_start_ts ?? 0),
        },
        { [`回撤结束时间${_b_append}`]: timestampms(result.wallet_stats?.drawdown_end_ts ?? 0) },
        {
          [`索提诺比率${_b_append}`]: formatNumber(result.wallet_stats.sortino, 2),
        },
        {
          [`夏普比率${_b_append}`]: formatNumber(result.wallet_stats.sharpe, 2),
        },
        {
          [`卡玛比率${_b_append}`]: formatNumber(result.wallet_stats.calmar, 2),
        },
      ]
    : [];

  const tmp = [
    {
      总利润: `${formatPercent(result.profit_total)} | ${formatPriceStake(
        result.profit_total_abs,
      )}`,
    },
    {
      '年复合增长率 (CAGR)': `${result.cagr ? formatPercent(result.cagr) : 'N/A'}`,
    },
    {
      '索提诺比率 (Sortino)': formatNumber(result.sortino, 2),
    },
    {
      '夏普比率 (Sharpe)': formatNumber(result.sharpe, 2),
    },
    {
      '卡玛比率 (Calmar)': formatNumber(result.calmar, 2),
    },
    {
      '系统质量指数 (SQN)': formatNumber(result.sqn, 2),
    },
    {
      '平均利润 p 值': formatNumber(result.p_value, 3),
    },
    {
      [`期望值 ${result.expectancy_ratio ? '(比例)' : ''}`]: `${
        result.expectancy
          ? result.expectancy_ratio
            ? `${formatNumber(result.expectancy, 2)} (${formatNumber(result.expectancy_ratio, 2)})`
            : formatNumber(result.expectancy, 2)
          : 'N/A'
      }`,
    },
    {
      利润因子: formatNumber(result.profit_factor, 3),
    },
    {
      '总交易数 / 日均交易数': `${result.total_trades} / ${formatNumber(result.trades_per_day, 2)}`,
    },
    // { 'First trade': result.backtest_fi },
    // { 'First trade Pair': result.backtest_best_day },
    {
      单日最佳利润: `${formatPercent(result.backtest_best_day, 2)} | ${formatPriceStake(
        result.backtest_best_day_abs,
      )}`,
    },
    {
      单日最差利润: `${formatPercent(result.backtest_worst_day, 2)} | ${formatPriceStake(
        result.backtest_worst_day_abs,
      )}`,
    },

    {
      '胜 / 平 / 负': `${pairSummary?.wins} / ${pairSummary?.draws} / ${pairSummary?.losses} ${
        isNotUndefined(pairSummary?.winrate)
          ? '(胜率: ' +
            formatPercent(
              result.results_per_pair[result.results_per_pair.length - 1]?.winrate ?? 0,
              2,
            ) +
            ')'
          : ''
      }`,
    },
    {
      '获利天数 / 平局天数 / 亏损天数': `${result.winning_days} / ${result.draw_days} / ${result.losing_days}`,
    },
    {
      // TODO: min/max/avg trade duration should be aligned with the terminal output
      获利交易最短持仓时间: humanizeDurationFromSeconds(result.winner_holding_min_s),
    },
    {
      获利交易平均持仓时间: humanizeDurationFromSeconds(result.winner_holding_avg_s),
    },
    {
      获利交易最长持仓时间: humanizeDurationFromSeconds(result.winner_holding_max_s),
    },
    {
      亏损交易最短持仓时间: humanizeDurationFromSeconds(result.loser_holding_min_s),
    },
    {
      亏损交易平均持仓时间: humanizeDurationFromSeconds(result.loser_holding_avg_s),
    },
    {
      亏损交易最长持仓时间: humanizeDurationFromSeconds(result.loser_holding_max_s),
    },
    {
      '最大连续获利 / 亏损次数':
        result.max_consecutive_wins === undefined
          ? 'N/A'
          : `${result.max_consecutive_wins} / ${result.max_consecutive_losses}`,
    },
    { 拒绝的入场信号: result.rejected_signals },
    {
      '入场/出场超时': `${result.timedout_entry_orders} / ${result.timedout_exit_orders}`,
    },
    {
      取消的交易入场: result.canceled_trade_entries ?? 'N/A',
    },
    {
      取消的入场订单: result.canceled_entry_orders ?? 'N/A',
    },
    {
      替换的入场订单: result.replaced_entry_orders ?? 'N/A',
    },

    ...shortMetrics,

    { ___: '___' },
    {
      '最小/最大余额 (已结清交易)': `${formatPriceStake(result.csum_min)} / ${formatPriceStake(result.csum_max)}`,
    },
    {
      '最小/最大余额 (钱包余额)': `${formatPriceStake(result.wallet_stats?.low_balance)} / ${formatPriceStake(result.wallet_stats?.high_balance)}`,
    },
    { 市场涨跌幅: formatPercent(result.market_change) },
    { '___  ': '___' },
    {
      '最大回撤 (账户)': formatPercent(result.max_drawdown_account),
    },
    {
      绝对最大回撤: formatPriceStake(result.max_drawdown_abs),
    },
    {
      回撤时长: result.drawdown_duration ?? 'N/A',
    },
    {
      '回撤开始 | 结束时的利润': `${formatPriceStake(result.max_drawdown_high)} | ${formatPriceStake(
        result.max_drawdown_low,
      )}`,
    },
    { 回撤开始时间: timestampms(result.drawdown_start_ts) },
    { 回撤结束时间: timestampms(result.drawdown_end_ts) },
    ...walletBalanceMetrics,
    { '___    ': '___' },
    {
      最佳交易对: `${result.best_pair.key} ${formatPercent(result.best_pair.profit_total)}`,
    },
    {
      最差交易对: `${result.worst_pair.key} ${formatPercent(result.worst_pair.profit_total)}`,
    },
    { 最佳单笔交易: bestPair },
    { 最差单笔交易: worstPair },
  ];
  return tmp;
}

function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTradingMode(result: StrategyBacktestResult) {
  if (!result.trading_mode || !result.margin_mode) {
    return {};
  }
  const modeMap: Record<string, string> = {
    spot: '现货',
    margin: '杠杆',
    futures: '期货',
  };
  const marginMap: Record<string, string> = {
    isolated: '逐仓',
    cross: '全仓',
  };

  const mode = result.trading_mode.toLowerCase();
  const margin = result.margin_mode.toLowerCase();

  const translatedMode = modeMap[mode] || capitalizeFirstLetter(result.trading_mode);
  const translatedMargin = marginMap[margin] || capitalizeFirstLetter(result.margin_mode);

  const value = mode === 'spot' ? translatedMode : `${translatedMargin} ${translatedMode}`;
  return { 交易模式: value };
}

export function generateBacktestSettingRows(result: StrategyBacktestResult) {
  const formatPriceStake = useFormatPriceStake(
    result.stake_currency_decimals,
    result.stake_currency,
  );
  const tradingMode = formatTradingMode(result);

  return [
    { 回测开始时间: timestampms(result.backtest_start_ts) },
    { 回测结束时间: timestampms(result.backtest_end_ts) },
    ...(Object.keys(tradingMode).length !== 0 ? [tradingMode] : []),
    {
      回测执行时间: humanizeDurationFromSeconds(
        result.backtest_run_end_ts - result.backtest_run_start_ts,
      ),
    },
    { 最大活跃交易数: result.max_open_trades },
    { 时间周期: result.timeframe },
    { 详细时间周期: result.timeframe_detail || 'N/A' },
    { 时间范围: result.timerange },
    { 止损比例: formatPercent(result.stoploss, 2) },
    { 追踪止损: result.trailing_stop },
    {
      仅在达到偏移量时追踪: result.trailing_only_offset_is_reached,
    },
    { 正向追踪止损: formatNumber(result.trailing_stop_positive) },
    {
      正向追踪止损偏移量: formatNumber(result.trailing_stop_positive_offset),
    },
    { 自定义止损: result.use_custom_stoploss },
    { '投资回报率 (ROI)': JSON.stringify(result.minimal_roi) },
    {
      使用出场信号: result.use_exit_signal ?? result.use_sell_signal,
    },
    {
      仅限盈利出场: result.exit_profit_only ?? result.sell_profit_only,
    },
    {
      出场盈利偏移量: formatNumber(result.exit_profit_offset ?? result.sell_profit_offset),
    },
    { 启用保护机制: result.enable_protections },
    {
      初始资金: formatPriceStake(result.starting_balance),
    },
    {
      最终余额: formatPriceStake(result.final_balance),
    },
    {
      平均开仓金额: formatPriceStake(result.avg_stake_amount),
    },
    {
      总交易额: formatPriceStake(result.total_volume),
    },
  ];
}

/** Selectable options for backtest charts.
 * selection happens through the settings page
 */
export const availableBacktestMetrics = ref([
  { field: 'sqn', header: '系统质量指数 (SQN)' },
  { field: 'cagr', header: '年复合增长率 (CAGR)' },
  { field: 'calmar', header: '卡玛比率 (Calmar)' },
  { field: 'p_value', header: '平均利润 p 值' },
  { field: 'expectancy', header: '期望值' },
  { field: 'profit_factor', header: '利润因子' },
  { field: 'sharpe', header: '夏普比率 (Sharpe)' },
  { field: 'sortino', header: '索提诺比率 (Sortino)' },
  { field: 'max_drawdown_account', header: '最大回撤', is_ratio: true },
]);
