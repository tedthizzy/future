# Private phone access

The explorer uses Tailscale Serve on this Mac. The phone must connect to the same tailnet. Open https://macbook-air-7.taild8ef36.ts.net/.

Serve proxies HTTPS port 443 to Vite at 127.0.0.1:5173. Vite proxies `/api` to Python at 127.0.0.1:8000. The hostname has an explicit entry in `apps/web/vite.config.ts`. The route stays private to the tailnet. No Funnel route is configured.

The server runs the existing development command as a detached process. It continues after the agent session ends. The Mac must stay awake and online. Changes to source files reload the app. Reload the page if its model definitions have changed. Never start a second development session on these ports.

## Check

```sh
curl --max-time 5 -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/api/definitions
curl --max-time 5 -I http://127.0.0.1:5173/
/Users/ted/bin/tailscale serve status
curl --max-time 10 -I https://macbook-air-7.taild8ef36.ts.net/
```

Logs append to `~/.local/share/future/hosting/stdout.log` and `stderr.log`. Run artifacts stay in `~/.local/share/future/runs/`. Stopping hosting preserves both.

## Start and stop

Use `python3 scripts/host.py start` from this checkout. It starts the existing `worldmodel dev` command in a new process session and appends logs outside Git. It records the process ID and exact command in `~/.local/share/future/hosting/current.json`. Previous records are preserved before replacement. Starting a second server produces an error.

Use `python3 scripts/host.py stop` to stop that recorded process. It verifies the process command and checkout directory before sending SIGTERM. The development command stops its own child processes. Run `lsof -nP -iTCP:8000 -iTCP:5173 -sTCP:LISTEN` to verify that its listeners stopped. An unfamiliar listener requires its own review.

Enable the private route with `/Users/ted/bin/tailscale serve --bg http://127.0.0.1:5173`. Disable that route with `/Users/ted/bin/tailscale serve --https=443 off`. These commands change only the selected HTTPS route. Inspect `tailscale serve status` before either change.

## Automatic startup

Automatic startup at login remains pending. The LaunchAgent trial on October 9, 2026 waited for a macOS Documents permission dialog. The locked desktop prevented completing it. The trial was stopped and its plist was preserved outside `~/Library/LaunchAgents/`. No login job remains installed from that trial. Recheck with `launchctl print gui/$(id -u)/com.ted.future`.

The detached server has been restored. A reboot requires starting it again. A future login service must complete the interpreter's Documents permission and pass an actual stop/start check before replacing this process.

The frontend is a development build. Public deployment and static result publication remain future work. Saved inputs belong to each browser, so the phone and Mac have separate saved-scenario lists.
