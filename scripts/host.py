"""Start or stop this Mac's detached explorer without changing login settings."""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
STATE = Path.home() / ".local/share/future/hosting"
RECORD = STATE / "current.json"


def process_command(pid):
    if type(pid) is not int or pid <= 1:
        raise ValueError("Invalid recorded process ID")
    result = subprocess.run(["ps", "-p", str(pid), "-o", "args="], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else None


def occupied_ports():
    occupied = []
    for port in (8000, 5173):
        with socket.socket() as probe:
            if probe.connect_ex(("127.0.0.1", port)) == 0:
                occupied.append(port)
    return occupied


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("start", "stop"))
    args = parser.parse_args()
    if args.command == "stop":
        record = json.loads(RECORD.read_bytes())
        current = process_command(record["pid"])
        if current is None:
            parser.error("The recorded process has already stopped. Inspect ports before starting.")
        cwd = subprocess.check_output(["lsof", "-a", "-p", str(record["pid"]), "-d", "cwd", "-F", "n"], text=True)
        if not current.endswith(" -m worldmodel dev") or f"n{ROOT}\n" not in cwd:
            parser.error("The recorded process does not run this checkout. No signal sent.")
        os.kill(record["pid"], signal.SIGTERM)
        for _ in range(100):
            if process_command(record["pid"]) is None and not occupied_ports():
                print("Explorer stopped; ports 8000 and 5173 are free.")
                return
            time.sleep(0.1)
        parser.error("Stop has not completed. Inspect the recorded process and listeners before another action.")

    ports = occupied_ports()
    if ports:
        parser.error(f"Ports {ports} are occupied. No second server started.")
    if RECORD.exists():
        previous = json.loads(RECORD.read_bytes())
        if process_command(previous["pid"]) is not None:
            parser.error("The recorded process still exists. Inspect it before starting.")
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / "stdout.log").open("ab") as out, (STATE / "stderr.log").open("ab") as err:
        process = subprocess.Popen([str(ROOT / ".venv/bin/python"), "-m", "worldmodel", "dev"],
                                   cwd=ROOT, stdin=subprocess.DEVNULL, stdout=out, stderr=err,
                                   start_new_session=True)
    if RECORD.exists():
        history = STATE / "history"
        history.mkdir(exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        with (history / f"{stamp}.json").open("xb") as snapshot:
            snapshot.write(RECORD.read_bytes())
    with RECORD.open("w") as record:
        json.dump({"pid": process.pid, "command": [str(ROOT / ".venv/bin/python"), "-m", "worldmodel", "dev"]}, record)
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.poll() is not None:
            parser.error(f"Explorer exited with {process.returncode}. Inspect {STATE / 'stderr.log'}.")
        try:
            for path in ("http://127.0.0.1:8000/api/definitions", "http://127.0.0.1:5173/"):
                with urllib.request.urlopen(path, timeout=1) as response:
                    if response.status != 200:
                        raise OSError("Service is not ready")
            break
        except OSError:
            time.sleep(0.1)
    else:
        parser.error(f"Startup remains unverified for PID {process.pid}. Inspect its logs before another action.")
    print(f"Explorer started: PID {process.pid}; http://127.0.0.1:5173/")


if __name__ == "__main__":
    main()
