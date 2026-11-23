#!/usr/bin/env python3
"""
VYROXX TRIAGE collector v1.0
Read-only incident-response triage for Windows, Linux and macOS. Collects:
system info, running processes, active network connections, event logs,
persistence locations and SHA-256/MD5 hashes of suspicious files, and writes a single
JSON bundle (+ a .sha256 file for chain of custody) for the VYROXX TRIAGE dashboard.

  python triage.py --case IR-2026-001 --analyst "Your Name"
  python triage.py --days 14 --hash C:\\Users\\Public --out bundle.json

Use ONLY on systems you own or are authorized to examine. It changes nothing on the system.
Run as Administrator/root for complete logs. Needs Python 3.7+ (standard library only).
"""
import argparse, ctypes, getpass, glob, hashlib, ipaddress, json, os, platform, re, socket, subprocess, sys, time
from datetime import datetime, timezone

VERSION = "1.1"
OS = platform.system()
ERR = []



def resolve_out(path, default_name):
    """absolute report path; a folder means <folder>/<default_name>"""
    path = os.path.abspath(os.path.expandvars(os.path.expanduser(path or default_name)))
    if os.path.isdir(path) or path.endswith(("/", "\\")) or not os.path.splitext(path)[1]:
        path = os.path.join(path, default_name)
    return path


def save_text(path, text, default_name):
    """write the file; if that folder is not writable, fall back to the home folder"""
    for p in (path, os.path.join(os.path.expanduser("~"), default_name)):
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                f.write(text)
            return p
        except OSError as e:
            print(f"Could not write {p}: {e}")
    sys.exit("Could not save the file anywhere. Run again with --out pointing to a writable folder.")


def open_folder(path):
    try:
        if platform.system() == "Windows":
            os.startfile(path)  # type: ignore[attr-defined]
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", path])
        elif os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"):
            subprocess.Popen(["xdg-open", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


def announce(label, path, dash, no_open):
    print("=" * 64)
    print(f"{label} SAVED TO:")
    print(f"  {path}")
    print("=" * 64)
    print(f"Open the VYROXX {dash} dashboard (vyroxxit.github.io/{dash.lower()}.html) and load this file.")
    if not no_open:
        open_folder(os.path.dirname(path))
    if platform.system() == "Windows" and len(sys.argv) == 1:
        input("\nPress Enter to close this window...")


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def run(cmd, timeout=90):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, errors="replace").stdout
    except Exception as e:
        ERR.append(f"{cmd[0]}: {str(e)[:120]}")
        return ""


def ps(script, timeout=150):
    return run(["powershell", "-NoProfile", "-NonInteractive", "-Command", script], timeout)


def js(text):
    try:
        d = json.loads(text)
        return d if isinstance(d, list) else [d]
    except Exception:
        return []


def is_admin():
    try:
        return os.geteuid() == 0 if OS != "Windows" else bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


# ---------------------------------------------------------------- system
def boot_time():
    try:
        if OS == "Linux":
            return int(next(l for l in open("/proc/stat") if l.startswith("btime")).split()[1])
        if OS == "Darwin":
            return int(re.search(r"sec = (\d+)", run(["sysctl", "-n", "kern.boottime"])).group(1))
        if OS == "Windows":
            s = ps("(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o')").strip()[:19]
            return int(datetime.strptime(s, "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc).timestamp())
    except Exception as e:
        ERR.append(f"boot_time: {e}")
    return None


def sysinfo(boot):
    h = socket.gethostname()
    ips = set()
    try:
        ips |= {a[4][0] for a in socket.getaddrinfo(h, None)}
    except OSError:
        pass
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
    except OSError:
        pass
    finally:
        s.close()
    users = []
    if OS in ("Linux", "Darwin"):
        try:
            for l in open("/etc/passwd"):
                p = l.strip().split(":")
                if len(p) >= 7 and not l.startswith("#"):
                    users.append({"name": p[0], "uid": p[2], "home": p[5], "shell": p[6]})
        except OSError:
            pass
    else:
        users = [{"name": u} for u in run(["net", "user"]).split("\n") if u.strip()][4:-2]
    logged = run(["query", "user"] if OS == "Windows" else ["who"]).strip().splitlines()
    return {"hostname": h, "os": platform.platform(), "arch": platform.machine(), "user": getpass.getuser(), "admin": is_admin(),
            "boot_time": iso(boot) if boot else "", "collected_tz": time.strftime("%z"), "ips": sorted(i for i in ips if not i.startswith("127.") and i != "::1"),
            "local_users": users[:200], "logged_in": logged[:50]}


# ---------------------------------------------------------------- processes
def procs_linux(boot):
    import pwd
    clk, out = os.sysconf("SC_CLK_TCK"), []
    for d in glob.glob("/proc/[0-9]*"):
        try:
            st = open(d + "/stat").read()
            i = st.rfind(")")
            f = st[i + 2:].split()
            uid = next(l.split()[1] for l in open(d + "/status") if l.startswith("Uid:"))
            try:
                user = pwd.getpwuid(int(uid)).pw_name
            except KeyError:
                user = uid
            try:
                exe = os.readlink(d + "/exe")
            except OSError:
                exe = ""
            cmd = open(d + "/cmdline", "rb").read().replace(b"\0", b" ").decode(errors="replace").strip()
            out.append({"pid": int(d.split("/")[-1]), "ppid": int(f[1]), "name": st[st.find("(") + 1:i], "exe": exe, "cmd": cmd, "user": user,
                        "start": iso(boot + int(f[19]) / clk) if boot else ""})
        except Exception:
            continue
    return out


def procs_windows():
    q = ("Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,"
         "@{n='S';e={if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')}}} | ConvertTo-Json -Compress")
    return [{"pid": p.get("ProcessId"), "ppid": p.get("ParentProcessId"), "name": p.get("Name"), "exe": p.get("ExecutablePath") or "",
             "cmd": p.get("CommandLine") or "", "user": "", "start": (p.get("S") or "")[:19] + "Z" if p.get("S") else ""} for p in js(ps(q))]


def procs_ps():
    out = []
    for l in run(["ps", "-axo", "pid=,ppid=,user=,lstart=,args="]).splitlines():
        m = re.match(r"\s*(\d+)\s+(\d+)\s+(\S+)\s+(\w{3} \w{3}\s+\d+ [\d:]+ \d{4})\s+(.*)", l)
        if m:
            try:
                t = iso(datetime.strptime(" ".join(m.group(4).split()), "%a %b %d %H:%M:%S %Y").timestamp())
            except ValueError:
                t = ""
            cmd = m.group(5)
            out.append({"pid": int(m.group(1)), "ppid": int(m.group(2)), "name": os.path.basename(cmd.split(" ")[0]), "exe": cmd.split(" ")[0],
                        "cmd": cmd, "user": m.group(3), "start": t})
    return out


# ---------------------------------------------------------------- connections
def hexaddr(h):
    ip, port = h.split(":")
    b = bytes.fromhex(ip)
    a = ipaddress.IPv4Address(b[::-1]) if len(b) == 4 else ipaddress.IPv6Address(b"".join(b[i:i + 4][::-1] for i in range(0, 16, 4)))
    return str(a.ipv4_mapped or a) if a.version == 6 else str(a), int(port, 16)


def conns_linux():
    inode = {}
    for fd in glob.glob("/proc/[0-9]*/fd/*"):
        try:
            l = os.readlink(fd)
            if l.startswith("socket:["):
                inode[l[8:-1]] = int(fd.split("/")[2])
        except OSError:
            pass
    states = {"01": "ESTABLISHED", "02": "SYN_SENT", "03": "SYN_RECV", "04": "FIN_WAIT1", "05": "FIN_WAIT2", "06": "TIME_WAIT", "07": "CLOSE",
              "08": "CLOSE_WAIT", "09": "LAST_ACK", "0A": "LISTEN", "0B": "CLOSING"}
    out = []
    for proto in ("tcp", "tcp6", "udp", "udp6"):
        try:
            lines = open("/proc/net/" + proto).read().splitlines()[1:]
        except OSError:
            continue
        for l in lines:
            p = l.split()
            try:
                la, lp = hexaddr(p[1])
                ra, rp = hexaddr(p[2])
            except Exception:
                continue
            st = states.get(p[3], p[3]) if proto.startswith("tcp") else ("UNCONN" if p[3] == "07" else "ESTABLISHED")
            out.append({"proto": proto, "laddr": la, "lport": lp, "raddr": ra, "rport": rp, "state": st, "pid": inode.get(p[9])})
    return out


def split_addr(a):
    a = a.strip()
    if ":" not in a:
        return a, 0
    h, _, p = a.rpartition(":")
    return h.strip("[]"), int(p) if p.isdigit() else 0


def conns_windows():
    out = []
    for l in run(["netstat", "-ano"]).splitlines():
        p = l.split()
        if len(p) >= 4 and p[0] in ("TCP", "UDP"):
            la, lp = split_addr(p[1])
            ra, rp = split_addr(p[2])
            out.append({"proto": p[0].lower(), "laddr": la, "lport": lp, "raddr": ra if ra != "*" else "", "rport": rp,
                        "state": p[3] if p[0] == "TCP" else "UNCONN", "pid": int(p[-1]) if p[-1].isdigit() else None})
    return out


def conns_mac():
    out = []
    for l in run(["lsof", "-nP", "-iTCP", "-iUDP"]).splitlines()[1:]:
        p = l.split()
        if len(p) < 9:
            continue
        name = " ".join(p[8:])
        m = re.match(r"(\S+?)(?:->(\S+))?(?:\s+\((\w+)\))?$", name)
        if not m:
            continue
        la, lp = split_addr(m.group(1))
        ra, rp = split_addr(m.group(2)) if m.group(2) else ("", 0)
        out.append({"proto": p[7].lower(), "laddr": la, "lport": lp, "raddr": ra, "rport": rp, "state": m.group(3) or "UNCONN",
                    "pid": int(p[1]) if p[1].isdigit() else None})
    return out


# ---------------------------------------------------------------- logs
def tz_iso(s, fmt):
    try:
        return datetime.strptime(s, fmt).astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return ""


def logs_linux(days, maxn):
    ev = []
    for l in run(["journalctl", "--since", f"{days} days ago", "--no-pager", "-o", "short-iso", "-n", str(maxn)], 120).splitlines():
        m = re.match(r"^(\d{4}-\d\d-\d\dT[\d:]+[+-]\d{4})\s+\S+\s+([^:\s\[]+)(?:\[\d+\])?:\s*(.*)$", l)
        if m:
            ev.append({"time": tz_iso(m.group(1), "%Y-%m-%dT%H:%M:%S%z"), "source": m.group(2), "id": "", "level": "", "msg": m.group(3)[:300]})
    for path in ("/var/log/auth.log", "/var/log/secure"):
        try:
            lines = open(path, errors="replace").read().splitlines()[-maxn:]
        except OSError:
            continue
        yr = datetime.now().year
        for l in lines:
            m = re.match(r"^(\w{3}\s+\d+ [\d:]+)\s+\S+\s+([^:\s\[]+)(?:\[\d+\])?:\s*(.*)$", l)
            if m:
                t = tz_iso(f"{yr} {' '.join(m.group(1).split())}", "%Y %b %d %H:%M:%S")
                if t and t > time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()):
                    t = tz_iso(f"{yr - 1} {' '.join(m.group(1).split())}", "%Y %b %d %H:%M:%S")
                ev.append({"time": t, "source": path.split("/")[-1] + ":" + m.group(2), "id": "", "level": "", "msg": m.group(3)[:300]})
    if not ev:
        ERR.append("no journald or auth log readable (try sudo)")
    return ev + logins()


def logins():
    ev = []
    for l in run(["last", "-F", "-n", "60"]).splitlines():
        m = re.search(r"(\w{3} \w{3}\s+\d+ [\d:]+ \d{4})", l)
        if m and not l.startswith(("reboot", "wtmp")):
            t = tz_iso(" ".join(m.group(1).split()), "%a %b %d %H:%M:%S %Y")
            ev.append({"time": t, "source": "last", "id": "login", "level": "", "msg": " ".join(l.split())[:200]})
    return ev


def logs_windows(days, maxn):
    ev = []
    for log in ("Security", "System", "Application", "Microsoft-Windows-PowerShell/Operational", "Microsoft-Windows-Sysmon/Operational"):
        q = (f"Get-WinEvent -FilterHashtable @{{LogName='{log}';StartTime=(Get-Date).AddDays(-{days})}} -MaxEvents {maxn} -ErrorAction Stop | "
             "Select-Object Id,LevelDisplayName,ProviderName,@{n='T';e={$_.TimeCreated.ToUniversalTime().ToString('o')}},"
             "@{n='M';e={(($_.Message -split \"`n\")[0])}} | ConvertTo-Json -Compress")
        r = js(ps(q))
        if not r:
            ERR.append(f"log {log}: empty or access denied")
        ev += [{"time": (e.get("T") or "")[:19] + "Z", "source": log.split("/")[0], "id": str(e.get("Id")), "level": e.get("LevelDisplayName") or "",
                "msg": (e.get("M") or "")[:300]} for e in r]
    return ev


def logs_mac(days):
    ev = logins()
    pred = '(process == "sudo") || (process == "sshd") || (eventMessage CONTAINS "authentication")'
    for l in run(["log", "show", "--last", f"{days}d", "--style", "syslog", "--predicate", pred], 180).splitlines()[:3000]:
        m = re.match(r"^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\S*\s+\S+\s+(.*)$", l)
        if m:
            ev.append({"time": tz_iso(m.group(1), "%Y-%m-%d %H:%M:%S"), "source": "unified-log", "id": "", "level": "", "msg": m.group(2)[:300]})
    return ev


# ---------------------------------------------------------------- persistence
def mt(p):
    try:
        return iso(os.path.getmtime(p))
    except OSError:
        return ""


def persistence():
    out = []

    def add(t, loc, detail="", m=""):
        out.append({"type": t, "location": loc, "detail": detail[:300], "mtime": m})
    if OS == "Linux":
        for p in ["/etc/crontab"] + glob.glob("/etc/cron.d/*") + glob.glob("/var/spool/cron/**/*", recursive=True):
            try:
                body = " | ".join(l.strip() for l in open(p, errors="replace") if l.strip() and not l.startswith("#"))
            except OSError:
                continue
            add("cron", p, body, mt(p))
        for p in glob.glob("/home/*/.ssh/authorized_keys") + ["/root/.ssh/authorized_keys"]:
            try:
                add("ssh-authorized-keys", p, f"{sum(1 for l in open(p) if l.strip())} key(s)", mt(p))
            except OSError:
                pass
        for l in run(["systemctl", "list-unit-files", "--state=enabled", "--no-pager"]).splitlines()[1:]:
            if ".service" in l:
                add("systemd-enabled", l.split()[0])
    elif OS == "Darwin":
        for d in ("/Library/LaunchAgents", "/Library/LaunchDaemons", os.path.expanduser("~/Library/LaunchAgents")):
            for p in glob.glob(d + "/*.plist"):
                add("launchd", p, "", mt(p))
    else:
        for k in (r"HKLM\Software\Microsoft\Windows\CurrentVersion\Run", r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                  r"HKLM\Software\Microsoft\Windows\CurrentVersion\RunOnce"):
            for l in run(["reg", "query", k]).splitlines():
                if "REG_" in l:
                    add("run-key", k, " ".join(l.split()))
        for d in (os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"), r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp"):
            for p in glob.glob(d + "\\*"):
                add("startup-folder", p, "", mt(p))
        for l in run(["schtasks", "/query", "/fo", "csv", "/nh"]).splitlines():
            c = [x.strip('"') for x in l.split('","')]
            if len(c) >= 3 and not c[0].startswith("\\Microsoft"):
                add("scheduled-task", c[0].strip('"'), f"next={c[1]} status={c[2]}")
    return out


# ---------------------------------------------------------------- hashes
def hash_file(p):
    s, m = hashlib.sha256(), hashlib.md5()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            s.update(c)
            m.update(c)
    return s.hexdigest(), m.hexdigest()


def default_dirs():
    home = os.path.expanduser("~")
    if OS == "Windows":
        return [os.path.expandvars("%TEMP%"), os.path.join(home, "Downloads"), r"C:\Users\Public", os.path.expandvars(r"%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup")]
    if OS == "Darwin":
        return ["/tmp", os.path.join(home, "Downloads"), "/Library/LaunchAgents", "/Library/LaunchDaemons", os.path.join(home, "Library/LaunchAgents")]
    return ["/tmp", "/var/tmp", "/dev/shm", os.path.join(home, "Downloads"), "/etc/cron.d", os.path.join(home, ".ssh")]


def hash_files(procs, dirs, days, maxf):
    out, seen = [], set()

    def add(p, src):
        if p in seen or len(out) >= maxf:
            return
        seen.add(p)
        try:
            st = os.stat(p)
            if not os.path.isfile(p) or st.st_size > 200 << 20:
                return
            sha, md5 = hash_file(p)
            out.append({"path": p, "sha256": sha, "md5": md5, "size": st.st_size, "mtime": iso(st.st_mtime), "source": src})
        except OSError:
            pass
    for p in sorted({x["exe"] for x in procs if x.get("exe") and not x["exe"].endswith("(deleted)")}):
        add(p, "process")
    cutoff = time.time() - days * 86400
    for d in dirs:
        for root, sub, files in os.walk(d, onerror=lambda e: None):
            if root[len(d):].count(os.sep) > 3:
                sub[:] = []
            for f in files:
                p = os.path.join(root, f)
                try:
                    if os.path.getmtime(p) >= cutoff:
                        add(p, "recent-file")
                except OSError:
                    pass
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description="VYROXX TRIAGE collector")
    ap.add_argument("--case", default="")
    ap.add_argument("--analyst", default="")
    ap.add_argument("--days", type=int, default=7, help="log / recent-file window (default 7)")
    ap.add_argument("--max-files", type=int, default=300)
    ap.add_argument("--max-events", type=int, default=1500)
    ap.add_argument("--hash", action="append", default=[], help="extra directory to scan for recent files (repeatable)")
    ap.add_argument("--no-logs", action="store_true")
    ap.add_argument("--no-hash", action="store_true")
    ap.add_argument("--out", default="", help="file or folder where the bundle is saved (default: current folder)")
    ap.add_argument("--no-open", action="store_true", help="do not open the folder when finished")
    ap.add_argument("--yes", action="store_true")
    a = ap.parse_args()
    print(f"VYROXX TRIAGE v{VERSION} | {platform.platform()}\nREAD-ONLY collection. Use only on systems you own or are authorized to examine.")
    if not a.yes and input("I am authorized to collect data from this system. Type y and press Enter [y/N]: ").strip().lower() not in ("y", "yes"):
        sys.exit("Cancelled. No bundle was created.")
    if not is_admin():
        print("! Not running as Administrator/root: some logs and process details will be missing.")
    t0 = time.time()
    steps = []

    def step(name, fn):
        print(f"  [{name}]", end=" ", flush=True)
        r = fn()
        print(len(r) if hasattr(r, "__len__") else "ok")
        return r
    boot = boot_time()
    info = step("system", lambda: sysinfo(boot))
    procs = step("processes", lambda: procs_linux(boot) if OS == "Linux" else procs_windows() if OS == "Windows" else procs_ps())
    conns = step("connections", lambda: conns_linux() if OS == "Linux" else conns_windows() if OS == "Windows" else conns_mac())
    logs = [] if a.no_logs else step("event logs", lambda: logs_linux(a.days, a.max_events) if OS == "Linux" else logs_windows(a.days, a.max_events) if OS == "Windows" else logs_mac(a.days))
    pers = step("persistence", persistence)
    files = [] if a.no_hash else step("file hashes", lambda: hash_files(procs, default_dirs() + a.hash, a.days, a.max_files))
    bundle = {"tool": "VYROXX TRIAGE", "version": VERSION, "case": a.case, "analyst": a.analyst, "days": a.days,
              "started": iso(t0), "finished": iso(time.time()), "system": info, "processes": procs, "connections": conns,
              "logs": logs, "persistence": pers, "files": files, "errors": ERR}
    default_name = f"triage-{info['hostname']}-{time.strftime('%Y%m%d-%H%M%S')}.json"
    out = save_text(resolve_out(a.out, default_name), json.dumps(bundle, ensure_ascii=False, indent=1), default_name)
    digest = hash_file(out)[0]
    open(out + ".sha256", "w").write(f"{digest}  {os.path.basename(out)}\n")
    print(f"\nDone in {time.time() - t0:.1f}s.\nSHA-256: {digest}  (saved to {out}.sha256 - keep it separately for chain of custody)")
    print("NOTE: treat the bundle as evidence. It may contain sensitive data (commands, logs, usernames).")
    if ERR:
        print(f"{len(ERR)} non-fatal warning(s) recorded in the bundle.")
    announce("BUNDLE", out, "TRIAGE", a.no_open)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nStopped. No file was created.")
