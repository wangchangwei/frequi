#!/usr/bin/env python3
"""
Per-pair queued backtest for freqtrade futures.

Each pair is run as a SEPARATE freqtrade process (one `docker compose run` per pair).
A single worker consumes a queue.Queue; tqdm displays real-time progress.

Usage:
  # Dry-run (print commands, do not execute)
  python queue_backtest.py --pairlist user_data/data/binance-futures/liquid_pairs_final.txt --dry-run

  # Run all 16 pairs
  python queue_backtest.py --pairlist user_data/data/binance-futures/liquid_pairs_final.txt --skip-download

  # Run a few pairs inline
  python queue_backtest.py --pairs BTC/USDT:USDT,ETH/USDT:USDT --skip-download

  # Force re-run everything (ignore resume markers)
  python queue_backtest.py --pairlist my_pairs.txt --force

Outputs (per pair):
  backtest_queue/per_pair/<safe_pair>.json   freqtrade export
  backtest_queue/per_pair/<safe_pair>.out    captured stdout (for parsing)
  backtest_queue/per_pair/<safe_pair>.done   success marker
  user_data/logs/per_pair/<safe_pair>.log    freqtrade log (kept in user_data/)

Final aggregate:
  backtest_queue/queue_summary_<timestamp>.json
"""

import argparse
import concurrent.futures
import json
import os
import queue
import re
import subprocess
import sys
import threading
import time
import glob
from datetime import datetime

try:
    from tqdm import tqdm
except ImportError:
    print("[ERROR] tqdm is required: pip install tqdm", file=sys.stderr)
    sys.exit(1)

# === DEFAULTS ===
DEFAULT_COMPOSE_FILE = "docker-compose.tests.yml"
DEFAULT_TIMEFRAMES = "1m,5m,15m,1h,4h,1d"
DEFAULT_TIMERANGE = "20250101-"
DEFAULT_STRATEGY = "NostalgiaForInfinityX7"
DEFAULT_DATA_DIR = os.path.join("user_data", "data", "binance-futures")
# Per-pair backtest results go into a dedicated top-level directory
# (mounted from docker-compose.tests.yml as ./backtest_queue:/freqtrade/backtest_queue).
# Freqtrade's own .log files stay in user_data/logs/per_pair/ to keep them out of results.
DEFAULT_RESULTS_DIR = os.path.join("backtest_queue")
DEFAULT_PER_PAIR_DIR = os.path.join(DEFAULT_RESULTS_DIR, "per_pair")
DEFAULT_LOG_DIR = os.path.join("user_data", "logs", "per_pair")
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
# === END DEFAULTS ===


def log(msg, level="INFO"):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [{level}] {msg}", flush=True)


def safe_pair(pair: str) -> str:
    """BTC/USDT:USDT -> BTC_USDT_USDT"""
    return pair.replace("/", "_").replace(":", "_")


# === PARSING (inlined from parallel_backtest.py to keep that file untouched) ===
def parse_metrics(output: str) -> dict:
    m = {}
    r = re.search(
        r"NostalgiaForInfinityX7\s*│\s*(\d+)\s*│\s*([-\d.]+)\s*│\s*([-\d.]+)\s*│\s*([-\d.]+)\s*│",
        output,
    )
    if r:
        m["trades"] = int(r.group(1))
        m["avg_profit"] = float(r.group(2))
        m["tot_profit_usdt"] = float(r.group(3))
        m["tot_profit_pct"] = float(r.group(4))
    r = re.search(r"Total profit\s*%\s*│\s*([-\d.]+)", output)
    if r:
        m["total_profit_pct"] = float(r.group(1))
    r = re.search(r"Absolute profit\s*│\s*([-\d.]+)", output)
    if r:
        m["absolute_profit"] = float(r.group(1))
    r = re.search(r"Win\s+Draw\s+Loss\s*│\s*(\d+)\s*(\d+)\s*(\d+)\s*([\d.]+)", output)
    if r:
        m["wins"] = int(r.group(1))
        m["draws"] = int(r.group(2))
        m["losses"] = int(r.group(3))
        m["win_rate"] = float(r.group(4))
    r = re.search(r"Absolute drawdown\s*│\s*([-\d.]+)\s+USD[T]?\s+\(([\d.]+)\%", output)
    if r:
        m["drawdown_usdt"] = float(r.group(1))
        m["drawdown_pct"] = float(r.group(2))
    r = re.search(r"Best Pair\s*│\s*(\S+)\s+([-\d.]+)\%", output)
    if r:
        m["best_pair"] = r.group(1)
        m["best_pair_pct"] = float(r.group(2))
    r = re.search(r"Worst Pair\s*│\s*(\S+)\s+([-\d.]+)\%", output)
    if r:
        m["worst_pair"] = r.group(1)
        m["worst_pair_pct"] = float(r.group(2))
    m["per_pair"] = parse_per_pair(output)
    return m


def parse_per_pair(output: str) -> list:
    """Parse the per-pair summary table from freqtrade output."""
    result = []
    pattern = re.compile(
        r"(\S+/USDT:USDT)\s*│\s*(\d+)\s*│\s*([-\d.]+)\s*│\s*([-\d.]+)\s*│\s*([-\d.]+)\s*│\s*"
        r"([\d:]+)\s*│\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)"
    )
    for m in pattern.finditer(output):
        result.append({
            "pair": m.group(1).strip(),
            "trades": int(m.group(2)),
            "avg_profit": float(m.group(3)),
            "tot_profit_usdt": float(m.group(4)),
            "tot_profit_pct": float(m.group(5)),
            "avg_duration": m.group(6),
            "wins": int(m.group(7)),
            "draws": int(m.group(8)),
            "losses": int(m.group(9)),
            "win_rate": float(m.group(10)),
        })
    return result


# === RESUME / DONE MARKERS ===
def is_done(pair: str, per_pair_dir: str) -> bool:
    """A pair is considered done iff a .done marker exists."""
    return os.path.exists(os.path.join(per_pair_dir, f"{safe_pair(pair)}.done"))


def mark_done(pair: str, per_pair_dir: str, rc: int, elapsed: float) -> None:
    if rc == 0:
        with open(os.path.join(per_pair_dir, f"{safe_pair(pair)}.done"), "w") as f:
            f.write(f"ok elapsed_sec={elapsed:.0f}\n")


def load_cached_metrics(pair: str, per_pair_dir: str) -> dict:
    """Re-parse from the .out file if available, else return minimal stub."""
    out_file = os.path.join(per_pair_dir, f"{safe_pair(pair)}.out")
    if os.path.exists(out_file):
        with open(out_file) as f:
            return parse_metrics(f.read())
    return {"pair": pair, "trades": 0, "absolute_profit": 0.0, "from_cache": True}


# === DOCKER COMMAND ===
def build_cmd(pair: str, args, per_pair_dir: str, log_dir: str) -> str:
    sp = safe_pair(pair)
    # Map host abs path -> path relative to PROJECT_ROOT so it works inside the container
    # (docker-compose.tests.yml mounts ./user_data:/freqtrade/user_data)
    rel_export = os.path.relpath(os.path.join(per_pair_dir, f"{sp}.json"), PROJECT_ROOT)
    rel_log = os.path.relpath(os.path.join(log_dir, f"{sp}.log"), PROJECT_ROOT)
    export_file = f"/freqtrade/{rel_export}"
    log_file = f"/freqtrade/{rel_log}"
    # In-container datadir = host datadir's leaf subdir (e.g. "binance").
    # Use "binance" (not "binance-futures") since we have a symlink binance->binance-futures.
    data_leaf = "binance"
    tf_detail = (f"--timeframe-detail {args.timeframe_detail} "
                 if args.timeframe_detail else "")
    config_file = os.path.join(PROJECT_ROOT, "configs", f"trading_mode-{args.trading_mode}.json")
    config_arg = (f"--config configs/trading_mode-{args.trading_mode}.json "
                  if os.path.exists(config_file) else "")
    return (
        f"docker compose -f {args.compose_file} run --rm --entrypoint freqtrade backtesting "
        f"backtesting "
        f"--datadir /freqtrade/user_data/data/{data_leaf} "
        f"--strategy-path /freqtrade "
        f"--strategy-list {args.strategy} "
        f"{config_arg}"
        f"{tf_detail}"
        f"--cache none "
        f"--timerange {args.timerange} "
        f"--export {args.export_mode} "
        f"--export-filename {export_file} "
        f"--log-file {log_file} "
        f"--pairs {pair}"
    )


def run_one(pair: str, args, per_pair_dir: str, log_dir: str) -> tuple:
    """Run a single backtest for one pair. Returns (rc, stdout_text, elapsed_sec)."""
    cmd = build_cmd(pair, args, per_pair_dir, log_dir)
    sp = safe_pair(pair)
    out_file = os.path.join(per_pair_dir, f"{sp}.out")

    t0 = time.time()
    proc = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=args.timeout)
    elapsed = time.time() - t0
    rc = proc.returncode
    stdout = proc.stdout or ""

    # Always persist stdout (for resume + debugging)
    with open(out_file, "w") as f:
        f.write(stdout)

    mark_done(pair, per_pair_dir, rc, elapsed)
    return rc, stdout, elapsed


# === DATA PRESENCE CHECK ===
def have_data(pairs: list, data_dir: str, timeframes: list) -> list:
    """Return subset of pairs that are MISSING data on at least one timeframe."""
    missing = []
    futures_dir = os.path.join(data_dir, "futures")
    for p in pairs:
        sp = safe_pair(p)
        for tf in timeframes:
            fpath = os.path.join(futures_dir, f"{sp}-{tf}-futures.feather")
            if not os.path.exists(fpath):
                missing.append(p)
                break
    return missing


def download_data(pairs: list, timeframes: list, timerange: str, compose_file: str,
                  exchange: str, trading_mode: str) -> bool:
    pairs_str = " ".join(pairs)
    tf_str = " ".join(timeframes)
    log(f"Downloading {len(pairs)} pairs × {len(timeframes)} timeframes...")
    cmd = (
        f"docker compose -f {compose_file} run --rm --entrypoint /bin/sh backtesting -c "
        f'"freqtrade download-data '
        f'--exchange {exchange} --trading-mode {trading_mode} '
        f'--pairs {pairs_str} '
        f'--timeframes {tf_str} '
        f'--timerange {timerange} '
        f'--datadir /freqtrade/user_data/data/{exchange} '
        f'2>&1"'
    )
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=7200)
    log(f"Download rc={r.returncode}")
    return r.returncode == 0


# === AGGREGATION ===
def aggregate(per_pair_metrics: dict) -> dict:
    """Sum trade-level metrics across pairs; keep worst drawdown."""
    pairs = [v for k, v in per_pair_metrics.items() if v]
    merged = {}
    merged["trades"] = sum(p.get("trades", 0) for p in pairs)
    merged["absolute_profit"] = round(sum(p.get("absolute_profit", 0) for p in pairs), 2)
    merged["tot_profit_usdt"] = merged["absolute_profit"]
    dd_usdt = [p["drawdown_usdt"] for p in pairs if p.get("drawdown_usdt") is not None]
    dd_pct = [p["drawdown_pct"] for p in pairs if p.get("drawdown_pct") is not None]
    merged["drawdown_usdt"] = max(dd_usdt) if dd_usdt else None
    merged["drawdown_pct"] = max(dd_pct) if dd_pct else None

    # Use parsed per_pair from each pair's stdout (single-pair runs return 1 row).
    flat_pp = []
    for p in pairs:
        flat_pp.extend(p.get("per_pair", []))
    flat_pp.sort(key=lambda x: -x.get("tot_profit_usdt", 0))
    merged["per_pair"] = flat_pp
    if flat_pp:
        best = max(flat_pp, key=lambda x: x.get("tot_profit_pct", 0))
        worst = min(flat_pp, key=lambda x: x.get("tot_profit_pct", 0))
        merged["best_pair"] = best["pair"]
        merged["best_pair_pct"] = best["tot_profit_pct"]
        merged["worst_pair"] = worst["pair"]
        merged["worst_pair_pct"] = worst["tot_profit_pct"]
    return merged


def merge_json_exports(per_pair_dir: str, strategy: str, timestamp_str: str):
    """Merge individual per-pair JSON exports into a single standard Freqtrade result."""
    json_files = glob.glob(os.path.join(per_pair_dir, "*.json"))
    if not json_files:
        return
        
    merged = {
        "strategy": {strategy: {"trades": [], "locks": [], "results_per_pair": []}},
        "strategy_comparison": [],
        "metadata": {strategy: {}}
    }
    
    strat_obj = merged["strategy"][strategy]
    strat_obj["total_trades"] = 0
    strat_obj["profit_total_abs"] = 0.0
    strat_obj["profit_total"] = 0.0
    
    base_meta = None
    first_strat = None
    
    for jf in json_files:
        with open(jf) as f:
            data = json.load(f)
            
        if "strategy" not in data or strategy not in data["strategy"]:
            continue
            
        sdata = data["strategy"][strategy]
        if first_strat is None:
            first_strat = sdata
            
        strat_obj["trades"].extend(sdata.get("trades", []))
        strat_obj["locks"].extend(sdata.get("locks", []))
        
        # Add all pairs except the TOTAL row
        pairs_res = [p for p in sdata.get("results_per_pair", []) if p.get("key") != "TOTAL"]
        strat_obj["results_per_pair"].extend(pairs_res)
        
        strat_obj["total_trades"] += sdata.get("total_trades", 0)
        strat_obj["profit_total_abs"] += sdata.get("profit_total_abs", 0.0)
        strat_obj["profit_total"] += sdata.get("profit_total", 0.0)
        
        if base_meta is None and "metadata" in data and strategy in data["metadata"]:
            base_meta = data["metadata"][strategy]

    if first_strat:
        # Copy scalar/metadata keys
        for k in ["backtest_start_ts", "backtest_end_ts", "timerange", "timeframe", "timeframe_detail", 
                  "starting_balance", "final_balance", "max_open_trades", "strategy_name", 
                  "enable_protections", "stoploss", "trailing_stop", "backtest_days"]:
            if k in first_strat:
                strat_obj[k] = first_strat[k]

    if base_meta:
        merged["metadata"][strategy] = base_meta
        
    # Re-calculate best/worst pair
    valid_pairs = [p for p in strat_obj["results_per_pair"] if p.get("key") != "TOTAL"]
    if valid_pairs:
        best_pair = max(valid_pairs, key=lambda x: x.get("profit_total_abs", 0))
        worst_pair = min(valid_pairs, key=lambda x: x.get("profit_total_abs", 0))
        strat_obj["best_pair"] = best_pair
        strat_obj["worst_pair"] = worst_pair
        
        # Calculate TOTAL pair
        total_p = {
            "key": "TOTAL",
            "trades": strat_obj["total_trades"],
            "profit_total_abs": strat_obj["profit_total_abs"],
            "profit_total": strat_obj["profit_total"],
            "profit_total_pct": strat_obj["profit_total"] * 100,
        }
        strat_obj["results_per_pair"].append(total_p)

    out_dir = os.path.join("user_data", "backtest_results")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"backtest-result-{timestamp_str}.json")
    
    # Update filename in metadata
    if strategy in merged["metadata"]:
        merged["metadata"][strategy]["filename"] = f"backtest-result-{timestamp_str}"
        
    with open(out_file, "w") as f:
        json.dump(merged, f)
    
    meta_file = out_file.replace(".json", ".meta.json")
    with open(meta_file, "w") as f:
        json.dump(merged["metadata"], f)
        
    log(f"[+] Merged freqtrade results to {out_file}")


# === CLI ===
def parse_args():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--pairlist", help="Path to a file with one pair per line")
    src.add_argument("--pairs", help="Comma-separated pair list (alternative to --pairlist)")
    ap.add_argument("--timeframes", default=DEFAULT_TIMEFRAMES)
    ap.add_argument("--timerange", default=DEFAULT_TIMERANGE)
    ap.add_argument("--strategy", default=DEFAULT_STRATEGY)
    ap.add_argument("--compose-file", default=DEFAULT_COMPOSE_FILE)
    ap.add_argument("--data-dir", default=DEFAULT_DATA_DIR)
    ap.add_argument("--exchange", default="binance",
                    help="Exchange (used for data dir + download)")
    ap.add_argument("--trading-mode", default="futures",
                    help="Trading mode (used to pick configs/trading_mode-*.json)")
    ap.add_argument("--per-pair-dir", default=DEFAULT_PER_PAIR_DIR)
    ap.add_argument("--log-dir", default=DEFAULT_LOG_DIR)
    ap.add_argument("--output",
                    default=os.path.join(DEFAULT_RESULTS_DIR,
                                         f"queue_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"))
    ap.add_argument("--skip-download", action="store_true",
                    help="Skip data download (default; assumes data exists)")
    ap.add_argument("--download", action="store_true",
                    help="Download missing data before backtesting")
    ap.add_argument("--force", action="store_true",
                    help="Re-run pairs even if .done marker exists")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print commands that would be run, do not execute")
    ap.add_argument("--timeout", type=int, default=1800,
                    help="Per-pair docker timeout in seconds (default: 1800)")
    ap.add_argument("--workers", type=int, default=2,
                    help="Parallel queue workers (each runs one freqtrade process). "
                         "Default 2; tune based on Docker VM memory (each ~500MB-1GB).")
    ap.add_argument("--jobs", type=int, default=0,
                    help="Reserved (freqtrade backtesting has no -j flag). Kept for "
                         "backwards-compat; ignored.")
    ap.add_argument("--timeframe-detail", default="1m",
                    help="freqtrade --timeframe-detail value. Default '1m' for accurate "
                         "intra-candle stop-loss simulation. Pass empty string '' to "
                         "disable (faster but stop-loss uses 5m candle close).")
    ap.add_argument("--export-mode", default="none",
                    choices=["none", "trades", "signals"],
                    help="freqtrade --export value. Default 'none' (no JSON written). "
                         "Pass 'trades' to write per-trade JSON to "
                         "user_data/backtest_results/ (needed for entry/exit signal detail).")
    ap.add_argument("--status-file", default=None,
                    help="Path to a JSON file where real-time progress status is written. "
                         "Used by external polling systems to monitor the run.")
    ap.add_argument("--stop", action="store_true",
                    help="Check for a stop marker file (path = --status-file with .stop "
                         "extension) at startup and exit gracefully if present. "
                         "Used by external systems to signal graceful shutdown.")
    return ap.parse_args()


def write_status(status_file: str, status: str, started_at: str,
                 current: int, total: int, current_pair: str,
                 finished_at=None, result_file=None, error=None) -> None:
    """Write a JSON status file with current run progress. Best-effort: errors are swallowed."""
    if not status_file:
        return
    payload = {
        "status": status,
        "progress": {
            "current": current,
            "total": total,
            "current_pair": current_pair,
        },
        "started_at": started_at,
        "finished_at": finished_at,
        "result_file": result_file,
        "error": error,
    }
    try:
        with open(status_file, "w") as f:
            json.dump(payload, f, indent=2)
    except Exception as e:
        log(f"[WARN] Failed to write status file {status_file}: {e}", "ERROR")


def stop_marker_path(status_file: str) -> str:
    """Return the stop-marker path: status_file with .stop extension instead of original."""
    base, _ = os.path.splitext(status_file)
    return base + ".stop"


def load_pairs(args) -> list:
    if args.pairlist:
        path = (args.pairlist if os.path.isabs(args.pairlist)
                else os.path.join(PROJECT_ROOT, args.pairlist))
        if not os.path.exists(path):
            log(f"Pairlist file not found: {path}", "ERROR")
            sys.exit(1)
        with open(path) as f:
            pairs = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]
        log(f"Loaded {len(pairs)} pairs from {path}")
    else:
        pairs = [p.strip() for p in args.pairs.split(",") if p.strip()]
        log(f"Loaded {len(pairs)} pairs from --pairs argument")
    if not pairs:
        log("No pairs loaded.", "ERROR")
        sys.exit(1)
    return pairs


def main():
    args = parse_args()

    # Early-exit stop check: if --stop is passed AND a stop marker file exists,
    # honor the stop request and exit cleanly. This lets an external supervisor
    # gracefully terminate a running worker between pair runs.
    if args.stop and args.status_file:
        marker = stop_marker_path(args.status_file)
        if os.path.exists(marker):
            print("[STOP] Stop requested")
            sys.exit(0)

    pairs = load_pairs(args)
    timeframes = [t.strip() for t in args.timeframes.split(",") if t.strip()]

    # Resolve compose-file path
    if not os.path.isabs(args.compose_file):
        args.compose_file = os.path.join(PROJECT_ROOT, args.compose_file)
    # Resolve data-dir
    if not os.path.isabs(args.data_dir):
        args.data_dir = os.path.join(PROJECT_ROOT, args.data_dir)

    # Resolve per_pair_dir / log_dir as absolute (these need to exist as host paths)
    if not os.path.isabs(args.per_pair_dir):
        args.per_pair_dir = os.path.join(PROJECT_ROOT, args.per_pair_dir)
    if not os.path.isabs(args.log_dir):
        args.log_dir = os.path.join(PROJECT_ROOT, args.log_dir)
    os.makedirs(args.per_pair_dir, exist_ok=True)
    os.makedirs(args.log_dir, exist_ok=True)

    log(f"Config: timerange={args.timerange}  strategy={args.strategy}  "
        f"dry_run={args.dry_run}  force={args.force}")
    log(f"Per-pair outputs -> {args.per_pair_dir}")
    log(f"Per-pair logs    -> {args.log_dir}")

    # Initial status snapshot so external pollers see the run started.
    started_at = datetime.now().isoformat()
    write_status(args.status_file, "running", started_at,
                 current=0, total=len(pairs), current_pair="")

    try:
        _run_backtest(args, pairs, timeframes, started_at)
    except SystemExit:
        raise
    except Exception as e:
        log(f"Fatal error: {e}", "ERROR")
        write_status(args.status_file, "error", started_at,
                     current=0, total=len(pairs), current_pair="",
                     finished_at=datetime.now().isoformat(),
                     error=str(e))
        raise


def _run_backtest(args, pairs, timeframes, started_at):

    # 1) Optional download
    if args.download and not args.skip_download:
        missing = have_data(pairs, args.data_dir, timeframes)
        if missing:
            log(f"{len(missing)}/{len(pairs)} pairs missing data, downloading...")
            ok = download_data(missing, timeframes, args.timerange,
                               args.compose_file, args.exchange, args.trading_mode)
            if not ok:
                log("Download failed.", "ERROR")
                sys.exit(1)
        else:
            log("All pairs have data; skipping download.")
    else:
        log("Skipping download (default).")

    # 2) Build the queue
    q: "queue.Queue[str]" = queue.Queue()
    for p in pairs:
        q.put(p)

    # 3) Dry-run path
    if args.dry_run:
        log("\n=== DRY-RUN: commands that would be executed ===\n")
        for p in pairs:
            print(build_cmd(p, args, args.per_pair_dir, args.log_dir))
        log(f"\nTotal: {len(pairs)} commands. No execution performed.")
        return

    # 4) Resume filter
    skipped = 0
    if not args.force:
        kept = []
        while not q.empty():
            p = q.get()
            if is_done(p, args.per_pair_dir):
                skipped += 1
            else:
                kept.append(p)
        for p in kept:
            q.put(p)
        log(f"Resume: {skipped} already done, {len(kept)} to run")
        if not kept:
            log("Nothing to do. Use --force to re-run.")
            return

    # 5) Parallel consumer with tqdm (N workers)
    n_workers = max(1, args.workers)
    log(f"\n=== Backtesting {q.qsize()} pairs ({n_workers} parallel workers) ===\n")
    t_start = time.time()
    results: dict = {}
    failed: list = []
    pbar = tqdm(total=q.qsize(), desc="pairs", unit="pair", dynamic_ncols=True,
                mininterval=0.5)

    # Live aggregation snapshot for postfix
    cum_trades = 0
    cum_profit = 0.0
    state_lock = threading.Lock()
    last_pair = [None]  # mutable container so workers can update current label

    def worker(pair: str) -> dict:
        """Run one backtest; record result under lock. Returns metrics dict."""
        nonlocal cum_trades, cum_profit
        sp = safe_pair(pair)
        last_pair[0] = pair

        # Check stop marker before starting work
        if args.status_file and os.path.exists(stop_marker_path(args.status_file)):
            with state_lock:
                failed.append({"pair": pair, "reason": "stopped"})
            log(f"[{pair}] STOP requested — skipping", "WARN")
            return None

        try:
            rc, out, elapsed = run_one(pair, args, args.per_pair_dir, args.log_dir)
        except subprocess.TimeoutExpired:
            with state_lock:
                failed.append({"pair": pair, "reason": "timeout"})
            log(f"[{pair}] TIMEOUT after {args.timeout}s", "ERROR")
            return None
        except Exception as e:
            with state_lock:
                failed.append({"pair": pair, "reason": str(e)})
            log(f"[{pair}] EXCEPTION: {e}", "ERROR")
            return None

        metrics = parse_metrics(out) if rc == 0 else {"pair": pair, "trades": 0,
                                                       "absolute_profit": 0.0, "rc": rc}
        metrics["pair"] = pair
        metrics["rc"] = rc
        metrics["elapsed_sec"] = round(elapsed, 1)

        with state_lock:
            results[pair] = metrics
            if rc == 0:
                cum_trades += metrics.get("trades", 0)
                cum_profit += metrics.get("absolute_profit", 0.0)
            else:
                log(f"[{pair}] rc={rc} (see {os.path.join(args.per_pair_dir, sp + '.out')})",
                    "ERROR")
                failed.append({"pair": pair, "reason": f"rc={rc}"})
            completed = len(results) + len(failed)
        # Status file update outside the lock — best-effort and independent.
        write_status(args.status_file, "running", started_at,
                     current=completed, total=len(pairs), current_pair=pair)
        return metrics

    # Drain the queue into a plain list — ThreadPoolExecutor.map will iterate.
    pending = list(q.queue)  # type: ignore[attr-defined]

    with concurrent.futures.ThreadPoolExecutor(max_workers=n_workers) as pool:
        futures = {pool.submit(worker, p): p for p in pending}
        for fut in concurrent.futures.as_completed(futures):
            # Update tqdm label to reflect the most recently-active pair.
            if last_pair[0]:
                pbar.set_description(f"pairs (current: {last_pair[0]})")
            with state_lock:
                pbar.set_postfix_str(
                    f"trades={cum_trades} profit=${cum_profit:.1f}"
                )
                pbar.update(1)

    pbar.close()
    # NB: q.join() would block here on resume because skipped pairs never get
    # task_done() called (they were never consumed). q.empty() exit is sufficient.
    elapsed_total = time.time() - t_start
    log(f"\nAll done in {elapsed_total:.0f}s ({len(results)} pairs, "
        f"{len(failed)} failed)")

    # 6) Aggregate & save
    summary = aggregate(results)
    summary["failed_pairs"] = failed
    output = {
        "config": {
            "pairlist": args.pairlist or "(inline)",
            "n_pairs": len(pairs),
            "n_skipped_resume": skipped,
            "timerange": args.timerange,
            "timeframes": timeframes,
            "strategy": args.strategy,
        },
        "elapsed_sec": round(elapsed_total, 1),
        "summary": summary,
    }

    out_dir = os.path.dirname(args.output) or "."
    os.makedirs(out_dir, exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(output, f, indent=2, default=str)
    log(f"[+] Saved summary to {args.output}")

    # Merge individual JSONs into standard Freqtrade result format
    if args.export_mode != "none":
        timestamp_str = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        merge_json_exports(args.per_pair_dir, args.strategy, timestamp_str)
        result_file_path = os.path.join(
            "user_data", "backtest_results",
            f"backtest-result-{timestamp_str}.json",
        )
    else:
        result_file_path = None

    # Final status snapshot — all pairs completed, aggregation done.
    write_status(args.status_file, "done", started_at,
                 current=len(pairs), total=len(pairs), current_pair="",
                 finished_at=datetime.now().isoformat(),
                 result_file=result_file_path)

    # 7) Print final summary
    s = summary
    log(f"\n========== SUMMARY ==========")
    log(f"  Total pairs      : {len(pairs)} (ran {len(results)}, "
        f"failed {len(failed)}, skipped {skipped})")
    log(f"  Total trades     : {s.get('trades', 'N/A')}")
    log(f"  Total profit USD : ${s.get('absolute_profit', 'N/A')}")
    log(f"  Max drawdown USD : ${s.get('drawdown_usdt', 'N/A')}")
    log(f"  Max drawdown %   : {s.get('drawdown_pct', 'N/A')}%")
    if s.get("best_pair"):
        log(f"  Best pair        : {s['best_pair']} ({s.get('best_pair_pct', 'N/A')}%)")
    if s.get("worst_pair"):
        log(f"  Worst pair       : {s['worst_pair']} ({s.get('worst_pair_pct', 'N/A')}%)")
    if s.get("per_pair"):
        log(f"\n--- Per-pair breakdown ({len(s['per_pair'])} pairs) ---")
        log(f"  {'pair':<22s} {'trades':>7s} {'profit_usdt':>12s} {'avg%':>7s} {'total%':>7s} {'rc':>3s}")
        for p in s["per_pair"]:
            log(f"  {p.get('pair','?'):<22s} {p.get('trades',0):>7d} "
                f"{p.get('tot_profit_usdt',0):>11.1f} {p.get('avg_profit',0):>6.2f}% "
                f"{p.get('tot_profit_pct',0):>6.2f}% "
                f"{results.get(p.get('pair',''), {}).get('rc', '?'):>3}")
    if failed:
        log(f"\n--- Failed pairs ({len(failed)}) ---")
        for f_entry in failed:
            log(f"  {f_entry['pair']:<22s} reason={f_entry['reason']}")


if __name__ == "__main__":
    main()
