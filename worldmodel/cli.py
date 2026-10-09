import argparse
import json
from pathlib import Path
import signal
import socket
import subprocess
import sys

from .contracts import ApiContract, Scenario
from .storage import export_run, load_run, record_run


def main():
    parser = argparse.ArgumentParser(prog="future")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("schema")
    sub.add_parser("dev")
    serve = sub.add_parser("serve")
    serve.add_argument("--port", type=int, default=8000)
    run = sub.add_parser("run")
    run.add_argument("scenario", type=Path)
    export = sub.add_parser("export")
    export.add_argument("run_id")
    export.add_argument("--format", choices=["csv", "xlsx"], required=True)
    export.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "schema":
        print(json.dumps(ApiContract.model_json_schema()))
    elif args.command == "serve":
        import uvicorn
        uvicorn.run("worldmodel.api:app", host="127.0.0.1", port=args.port)
    elif args.command == "dev":
        from .storage import ROOT
        for port in (8000, 5173):
            with socket.socket() as probe:
                if probe.connect_ex(("127.0.0.1", port)) == 0:
                    parser.error(f"Port {port} is already in use. Stop its owner before starting a new session.")
        if not (ROOT / "apps/web/node_modules").is_dir():
            parser.error("Install frontend dependencies with npm ci --prefix apps/web")
        processes = []
        try:
            for command, cwd in [
                ([sys.executable, "-m", "uvicorn", "worldmodel.api:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], ROOT),
                (["npm", "run", "dev"], ROOT / "apps/web"),
            ]:
                processes.append(subprocess.Popen(command, cwd=cwd, start_new_session=True))
            print("Explorer: http://127.0.0.1:5173/", flush=True)
            while all(p.poll() is None for p in processes):
                try:
                    processes[0].wait(timeout=0.5)
                except subprocess.TimeoutExpired:
                    pass
        except KeyboardInterrupt:
            pass
        finally:
            import os
            for process in processes:
                if process.poll() is None:
                    os.killpg(process.pid, signal.SIGTERM)
                    process.wait()
    elif args.command == "run":
        scenario = Scenario.model_validate_json(args.scenario.read_bytes())
        result = record_run(scenario)
        print(result.run_id)
    elif args.command == "export":
        contents = export_run(load_run(args.run_id), args.format)
        with args.output.open("xb") as out:
            out.write(contents)
        print(args.output)


if __name__ == "__main__":
    main()
