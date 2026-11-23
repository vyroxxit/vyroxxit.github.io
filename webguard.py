#!/usr/bin/env python3
"""
VYROXX WEBGUARD scanner v1.0
Passive security check of a website: HTTPS/SSL, security headers, weak configuration,
and a short list of well-known exposed files. Defensive use only.

Scan ONLY websites you own or are explicitly authorized to test.
It sends ~40 ordinary GET/OPTIONS requests, never exploits anything and never prints file contents.
Needs Python 3.7+ (standard library only).

  python webguard.py https://example.com
  python webguard.py example.com --out report.json --no-files
  python webguard.py example.com --out ~/Downloads/webguard-report.json   # save where you can find it

The report is created ONLY when the check finishes; its full path is printed at the end.
Then open the VYROXX WEBGUARD dashboard and load the JSON report.
"""
import argparse, json, os, platform, random, re, socket, ssl, string, subprocess, sys, time
import urllib.error, urllib.request
from urllib.parse import urlparse

VERSION = "1.1"
UA = f"VYROXX-WebGuard/{VERSION} (defensive security check)"
ENV = r"(?m)^[A-Z][A-Z0-9_]{2,}\s*="
SQL = r"CREATE TABLE|INSERT INTO|DROP TABLE"
FILES = [("/.git/HEAD", r"^ref:\s", "critical"), ("/.git/config", r"\[core\]", "critical"),
         ("/.env", ENV, "critical"), ("/.env.local", ENV, "critical"),
         ("/wp-config.php.bak", r"DB_PASSWORD", "critical"), ("/wp-config.php~", r"DB_PASSWORD", "critical"),
         ("/backup.sql", SQL, "critical"), ("/db.sql", SQL, "critical"), ("/dump.sql", SQL, "critical"),
         ("/backup.zip", r"^PK", "high"), ("/site.zip", r"^PK", "high"), ("/www.zip", r"^PK", "high"),
         ("/phpinfo.php", r"phpinfo\(\)|PHP Version", "high"), ("/info.php", r"phpinfo\(\)|PHP Version", "high"),
         ("/.htpasswd", r"^[^:\s]+:\S+", "high"), ("/web.config", r"<configuration", "high"),
         ("/server-status", r"Apache Server Status", "medium"), ("/phpmyadmin/", r"phpMyAdmin", "medium"),
         ("/.DS_Store", r"Bud1", "medium"), ("/docker-compose.yml", r"(?m)^services:", "medium"),
         ("/Dockerfile", r"(?m)^FROM\s", "medium"), ("/crossdomain.xml", r"domain=\"\*\"", "medium"),
         ("/composer.json", r"\"require\"", "low"), ("/package.json", r"\"dependencies\"", "low")]
DIRS = ["/uploads/", "/images/", "/assets/", "/backup/", "/files/"]
ORDER = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1, "pass": 0}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch(url, timeout, method="GET", follow=True, verify=True, maxb=200000):
    ctx = ssl.create_default_context()
    if not verify:
        ctx.check_hostname, ctx.verify_mode = False, ssl.CERT_NONE
    hs = [urllib.request.HTTPSHandler(context=ctx)] + ([] if follow else [NoRedirect()])
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
    try:
        r = urllib.request.build_opener(*hs).open(req, timeout=timeout)
    except urllib.error.HTTPError as e:
        r = e
    except Exception as e:
        return {"error": str(e)}
    body = b"" if method in ("HEAD", "OPTIONS") else r.read(maxb)
    return {"code": r.getcode(), "headers": r.headers, "body": body.decode("latin-1"), "url": r.geturl()}


def cert_check(host, port, timeout):
    ctx = ssl.create_default_context()
    try:
        with socket.create_connection((host, port), timeout=timeout) as s:
            with ctx.wrap_socket(s, server_hostname=host) as t:
                c = t.getpeercert()
                iss = dict(x[0] for x in c.get("issuer", ()))
                days = int((ssl.cert_time_to_seconds(c["notAfter"]) - time.time()) / 86400)
                return {"valid": True, "days": days, "issuer": iss.get("organizationName") or iss.get("commonName", ""),
                        "version": t.version()}
    except ssl.SSLCertVerificationError as e:
        return {"valid": False, "error": e.verify_message}
    except (ssl.SSLError, OSError) as e:
        return {"unreachable": str(e)}


def legacy_tls(host, port, timeout):
    """Returns (tested, accepted_version)."""
    try:
        c = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        c.check_hostname, c.verify_mode = False, ssl.CERT_NONE
        c.minimum_version, c.maximum_version = ssl.TLSVersion.TLSv1, ssl.TLSVersion.TLSv1_1
        try:
            c.set_ciphers("ALL:@SECLEVEL=0")
        except ssl.SSLError:
            pass
    except (ValueError, ssl.SSLError, AttributeError):
        return False, None
    try:
        with socket.create_connection((host, port), timeout=timeout) as s:
            with c.wrap_socket(s, server_hostname=host) as t:
                return True, t.version()
    except Exception:
        return True, None



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


def main():
    ap = argparse.ArgumentParser(description="VYROXX WEBGUARD scanner")
    ap.add_argument("url")
    ap.add_argument("--out", default="webguard-report.json")
    ap.add_argument("--timeout", type=float, default=8)
    ap.add_argument("--no-files", action="store_true", help="skip the exposed-files check")
    ap.add_argument("--yes", action="store_true", help="confirm you are authorized to test this site")
    ap.add_argument("--no-open", action="store_true", help="do not open the report folder when finished")
    a = ap.parse_args()
    url = a.url if "://" in a.url else "https://" + a.url
    u = urlparse(url)
    host, port = u.hostname, u.port or (80 if u.scheme == "http" else 443)
    print(f"VYROXX WEBGUARD v{VERSION}\nScan ONLY sites you own or are authorized to test.\nTarget: {host}")
    if not a.yes and input("I am authorized to test this site. Type y and press Enter [y/N]: ").strip().lower() not in ("y", "yes"):
        sys.exit("Cancelled. No report was created.")
    F, T = [], a.timeout

    def add(id_, sev, **data):
        F.append({"id": id_, "sev": sev, "data": data})

    try:
        ip = socket.gethostbyname(host)
    except OSError:
        sys.exit("Cannot resolve host.")
    # --- HTTPS / SSL
    c = cert_check(host, port if u.scheme == "https" else 443, T)
    https_ok = "unreachable" not in c
    if not https_ok:
        add("https", "critical", error=c["unreachable"][:120])
    else:
        add("https", "pass")
        if not c["valid"]:
            add("cert", "critical", error=c["error"])
        else:
            d = c["days"]
            add("cert", "critical" if d < 0 else "high" if d <= 14 else "medium" if d <= 30 else "pass", days=d, issuer=c["issuer"])
            weak = c["version"] in ("TLSv1", "TLSv1.1")
            tested, leg = legacy_tls(host, 443, T)
            if weak or leg:
                add("tls", "high", version=leg or c["version"])
            elif tested:
                add("tls", "pass", version=c["version"])
        r = fetch(f"http://{host}/", T, follow=False)
        loc = (r.get("headers") or {}).get("Location", "") if "code" in r else ""
        add("redirect", "pass" if r.get("code") in (301, 302, 307, 308) and loc.startswith("https://") else "high")
    # --- main page
    base = f"{'https' if https_ok else 'http'}://{u.netloc}"
    r = fetch(base + "/", T, verify=False)
    if "error" in r:
        sys.exit("Could not fetch the site: " + r["error"])
    H, body = r["headers"], r["body"]
    low = {k.lower(): v for k, v in H.items()}
    sc = H.get_all("Set-Cookie") or []
    if https_ok:
        m = re.search(r"max-age=(\d+)", low.get("strict-transport-security", ""))
        add("hsts", "medium" if not m else "low" if int(m.group(1)) < 15552000 else "pass", max_age=int(m.group(1)) if m else 0)
    csp = low.get("content-security-policy", "")
    add("csp", "medium" if not csp else "low" if re.search(r"unsafe-inline|unsafe-eval|\*", csp) else "pass")
    add("xfo", "pass" if "x-frame-options" in low or "frame-ancestors" in csp else "medium")
    add("xcto", "pass" if low.get("x-content-type-options", "").lower() == "nosniff" else "low")
    add("refpol", "pass" if "referrer-policy" in low else "low")
    add("perm", "pass" if "permissions-policy" in low else "low")
    sv = low.get("server", "")
    add("server", "low" if re.search(r"\d", sv) else "pass", value=sv)
    add("xpb", "low" if "x-powered-by" in low else "pass", value=low.get("x-powered-by", ""))
    if sc:
        bad = [x.split("=")[0] for x in sc if not (re.search(r"(?i);\s*secure", x) and re.search(r"(?i);\s*httponly", x) and re.search(r"(?i);\s*samesite", x))]
        add("cookie", "medium" if bad else "pass", names=", ".join(bad)[:100])
    ac = low.get("access-control-allow-origin", "")
    if ac == "*":
        add("cors", "high" if low.get("access-control-allow-credentials", "").lower() == "true" else "low")
    if r["url"].startswith("https://"):
        n = len(re.findall(r"(?i)(?:src|data-src)=[\"']http://", body))
        add("mixed", "medium" if n else "pass", count=n)
    o = fetch(base + "/", T, method="OPTIONS", verify=False)
    allow = (o.get("headers") or {}).get("Allow", "") if "code" in o else ""
    if allow:
        dang = [m for m in ("TRACE", "PUT", "DELETE") if m in allow.upper()]
        add("methods", "medium" if dang else "pass", allow=allow[:80])
    s = fetch(base + "/.well-known/security.txt", T, follow=False, verify=False)
    add("secuTxt", "pass" if s.get("code") == 200 and "contact:" in s.get("body", "").lower() else "info")
    # --- exposed files
    if not a.no_files:
        rnd = "/" + "".join(random.choices(string.ascii_lowercase, k=14))
        soft = fetch(base + rnd, T, follow=False, verify=False).get("code") == 200
        print(f"Checking {len(FILES) + len(DIRS)} well-known paths (soft-404: {'yes' if soft else 'no'})...")
        found = 0
        for path, sig, sev in FILES:
            time.sleep(0.15)
            x = fetch(base + path, T, follow=False, verify=False, maxb=4096)
            if x.get("code") == 200 and re.search(sig, x["body"]):
                add("file", sev, path=path)
                found += 1
        for d in DIRS:
            time.sleep(0.15)
            x = fetch(base + d, T, follow=False, verify=False, maxb=8192)
            if x.get("code") == 200 and ("Index of /" in x["body"] or "Directory listing for" in x["body"]):
                add("listing", "medium", path=d)
                found += 1
        if not found:
            add("file", "pass")
    F.sort(key=lambda f: -ORDER[f["sev"]])
    rep = {"tool": "VYROXX WEBGUARD", "version": VERSION, "time": time.strftime("%Y-%m-%d %H:%M:%S"), "target": host,
           "ip": ip, "final_url": r["url"], "findings": F}
    out_path = save_text(resolve_out(a.out, "webguard-report.json"), json.dumps(rep, ensure_ascii=False, indent=2), "webguard-report.json")
    print(f"\n{'SEVERITY':<10}CHECK")
    for f in F:
        d = " ".join(f"{k}={v}" for k, v in f["data"].items() if v != "")
        print(f"{f['sev'].upper():<10}{f['id']} {d}")
    announce("REPORT", out_path, "WEBGUARD", a.no_open)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nStopped. No file was created.")
