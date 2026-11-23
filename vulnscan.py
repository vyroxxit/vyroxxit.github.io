#!/usr/bin/env python3
"""
VYROXX VULNTRACK live scanner v1.0
Looks up known CVEs for your software inventory in the official NVD database (NIST) and
writes a JSON report you can import into the VYROXX VULNTRACK dashboard.

  python vulnscan.py inventory.json                      # exported from the dashboard
  python vulnscan.py --add "openssl 1.0.1f" --add "nginx 1.18.0"
  python vulnscan.py requirements.txt                    # name==version lines or a package.json also work
  python vulnscan.py inventory.json --out ~/Downloads/vulnscan-report.json
  set NVD_API_KEY=...   (optional, free at nvd.nist.gov: raises the rate limit 10x)

Needs Python 3.7+ and an internet connection (standard library only).
Matching uses NVD's CPE version ranges, so always verify results on nvd.nist.gov before acting.
"""
import argparse, json, os, platform, re, subprocess, sys, time
import urllib.error, urllib.parse, urllib.request

VERSION = "1.1"
API = "https://services.nvd.nist.gov/rest/json/cves/2.0"
PRE = {"alpha", "beta", "rc", "pre", "m", "dev"}



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



def load_inventory(path):
    """dashboard inventory.json, a package.json, or text lines (name version / name==version / name@version)"""
    text = open(path, encoding="utf-8").read().strip()
    out = []
    if text[:1] in "[{":
        try:
            j = json.loads(text)
            if isinstance(j, list):
                return [x for x in j if isinstance(x, dict) and x.get("name") and x.get("version")]
            for k in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
                for n, v in (j.get(k) or {}).items():
                    m = re.match(r"\d[\w.\-+]*", re.sub(r"^[^\d]*", "", str(v)))
                    if m:
                        out.append({"name": n, "version": m.group(0), "exposure": "internal", "importance": "medium"})
            return out
        except ValueError:
            pass
    for line in text.splitlines():
        line = re.sub(r"#.*$", "", line).strip()
        m = re.match(r"^([A-Za-z0-9_.\-@/]+)\s*(?:===|==|~=|>=|=|@|:|\^|~)\s*v?(\d[\w.\-+]*)", line) or re.match(r"^(.*\S)\s+v?(\d[\w.\-+]*)$", line)
        if m:
            out.append({"name": m.group(1).strip(), "version": m.group(2), "exposure": "internal", "importance": "medium"})
    return out


def tok(v):
    return [int(t) if t.isdigit() else t.lower() for t in re.findall(r"\d+|[A-Za-z]+", v or "")]


def cmp(a, b):
    """Compare two version strings: -1, 0, 1 (handles 1.0.1f, 1.9.5p1, 2.0-beta9)."""
    x, y = tok(a), tok(b)
    for i in range(max(len(x), len(y))):
        if i >= len(x):
            return 1 if isinstance(y[i], str) and y[i] in PRE else -1
        if i >= len(y):
            return -1 if isinstance(x[i], str) and x[i] in PRE else 1
        p, q = x[i], y[i]
        if p == q:
            continue
        if isinstance(p, int) and isinstance(q, int):
            return -1 if p < q else 1
        if isinstance(p, str) and isinstance(q, str):
            return -1 if p < q else 1
        return 1 if isinstance(p, int) else -1
    return 0


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def in_range(ver, m):
    parts = m["criteria"].split(":")
    cv = parts[5] if len(parts) > 5 else "*"
    if cv not in ("*", "-"):
        return cmp(ver, cv) == 0
    lo_i, lo_e = m.get("versionStartIncluding"), m.get("versionStartExcluding")
    hi_i, hi_e = m.get("versionEndIncluding"), m.get("versionEndExcluding")
    if not any((lo_i, lo_e, hi_i, hi_e)):
        return cv == "*"  # every version affected
    return ((lo_i is None or cmp(ver, lo_i) >= 0) and (lo_e is None or cmp(ver, lo_e) > 0)
            and (hi_i is None or cmp(ver, hi_i) <= 0) and (hi_e is None or cmp(ver, hi_e) < 0))


def nvd_query(keyword, key=None):
    out, start = [], 0
    while True:
        qs = urllib.parse.urlencode({"keywordSearch": keyword, "resultsPerPage": 2000, "startIndex": start})
        req = urllib.request.Request(f"{API}?{qs}", headers={"User-Agent": "VYROXX-Vulntrack/1.0", **({"apiKey": key} if key else {})})
        for attempt in range(4):  # NVD answers 403/429/503 when you go too fast: wait and retry
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    d = json.load(r)
                break
            except urllib.error.HTTPError as e:
                if e.code in (403, 429, 503) and attempt < 3:
                    print(f"  ... NVD is busy (HTTP {e.code}), waiting {10 * (attempt + 1)}s")
                    time.sleep(10 * (attempt + 1))
                    continue
                raise
        out += d.get("vulnerabilities", [])
        start += d.get("resultsPerPage", 0)
        if start >= d.get("totalResults", 0) or not d.get("resultsPerPage"):
            return out
        time.sleep(0.7 if key else 6.5)


def cvss_of(cve):
    for k in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV40", "cvssMetricV2"):
        if cve.get("metrics", {}).get(k):
            return cve["metrics"][k][0]["cvssData"]["baseScore"]
    return None


def match_asset(asset, vulns):
    name, ver = norm(asset["name"]), asset["version"]
    res = []
    for v in vulns:
        c = v["cve"]
        hit = None
        for cfg in c.get("configurations", []):
            for node in cfg.get("nodes", []):
                for m in node.get("cpeMatch", []):
                    if not m.get("vulnerable"):
                        continue
                    parts = m["criteria"].split(":")
                    if len(parts) < 6 or parts[2] not in ("a", "o"):
                        continue
                    prod = norm(parts[4])
                    if prod and (prod == name or prod in name) and in_range(ver, m):
                        hit = hit or m
        if hit:
            desc = next((d["value"] for d in c.get("descriptions", []) if d["lang"] == "en"), "")
            res.append({"asset": asset["name"], "version": ver, "id": c["id"], "cvss": cvss_of(c),
                        "kev": bool(c.get("cisaExploitAdd")), "summary": desc[:320],
                        "fix": hit.get("versionEndExcluding", ""), "published": c.get("published", "")[:10]})
    return res


def main():
    ap = argparse.ArgumentParser(description="VYROXX VULNTRACK live CVE scanner")
    ap.add_argument("inventory", nargs="?", help="inventory.json (from the dashboard), requirements.txt or package.json")
    ap.add_argument("--add", action="append", default=[], help='e.g. --add "openssl 1.0.1f"')
    ap.add_argument("--out", default="vulnscan-report.json", help="file or folder where the report is saved")
    ap.add_argument("--no-open", action="store_true", help="do not open the report folder when finished")
    a = ap.parse_args()
    try:
        assets = load_inventory(a.inventory) if a.inventory else []
    except OSError as e:
        sys.exit(f"Cannot read {a.inventory}: {e}")
    for s in a.add:
        n, _, v = s.strip().rpartition(" ")
        assets.append({"name": n, "version": v, "exposure": "internal", "importance": "medium"})
    if not assets:
        sys.exit("Nothing to scan. Give an inventory.json or use --add \"name version\".")
    key = os.environ.get("NVD_API_KEY")
    print(f"VYROXX VULNTRACK v{VERSION}: querying NVD for {len(assets)} item(s)" + ("" if key else " (no API key: about 7 seconds per software, please wait)"))
    matches, cache = [], {}
    for i, asset in enumerate(assets):
        kw = asset["name"]
        try:
            if kw not in cache:
                if cache:
                    time.sleep(0.7 if key else 6.5)
                cache[kw] = nvd_query(kw, key)
            found = match_asset(asset, cache[kw])
        except (urllib.error.URLError, OSError) as e:
            print(f"  ! {asset['name']}: network error ({e})")
            continue
        print(f"  {asset['name']} {asset['version']}: {len(found)} CVE(s)")
        matches += found
    rep = {"tool": "VYROXX VULNTRACK", "version": VERSION, "time": time.strftime("%Y-%m-%d %H:%M:%S"), "source": "NVD", "matches": matches}
    out_path = save_text(resolve_out(a.out, "vulnscan-report.json"), json.dumps(rep, ensure_ascii=False, indent=2), "vulnscan-report.json")
    print(f"\n{len(matches)} match(es) for {len(assets)} item(s).")
    announce("REPORT", out_path, "VULNTRACK", a.no_open)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("\nStopped. No file was created.")
