#!/usr/bin/env python3
"""
VYROXX NETGUARD scanner v1.1
Inventory of devices on YOUR local network + check of risky open ports.
Defensive use only: scan networks you own or are authorized to test.
Safety: this tool REFUSES to scan anything that is not a private network
(192.168.x.x, 10.x.x.x, 172.16-31.x.x).
Needs only Python 3.7+ (no extra packages). Works on Windows, macOS, Linux, Android (Termux).

  python netguard.py                 # auto-detect your /24 network
  python netguard.py --subnet 192.168.1.0/24 --out report.json
Then open the VYROXX NETGUARD dashboard and load the JSON report.
"""
import argparse, errno, ipaddress, json, platform, re, socket, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

VERSION = "1.1"
# port: (service, risk)
PORTS = {21: ("FTP", "high"), 22: ("SSH", "low"), 23: ("Telnet", "high"), 53: ("DNS", "info"),
         80: ("HTTP", "info"), 139: ("NetBIOS", "medium"), 443: ("HTTPS", "info"), 445: ("SMB", "medium"),
         554: ("RTSP camera", "medium"), 1883: ("MQTT", "medium"), 3306: ("MySQL", "medium"),
         3389: ("RDP", "high"), 5900: ("VNC", "high"), 8080: ("HTTP-alt", "info"),
         8554: ("RTSP camera", "medium"), 9100: ("Printer", "low"), 37777: ("DVR/Camera", "medium")}
# a few well-known vendor prefixes (hint only, not exhaustive)
OUI = {"B8:27:EB": "Raspberry Pi", "DC:A6:32": "Raspberry Pi", "E4:5F:01": "Raspberry Pi",
       "24:0A:C4": "Espressif (IoT)", "30:AE:A4": "Espressif (IoT)", "84:CC:A8": "Espressif (IoT)",
       "A4:CF:12": "Espressif (IoT)", "3C:07:54": "Apple", "F0:18:98": "Apple", "00:03:93": "Apple",
       "8C:77:12": "Samsung", "CC:07:AB": "Samsung", "50:C7:BF": "TP-Link", "F4:F2:6D": "TP-Link",
       "98:DA:C4": "TP-Link", "3C:5A:B4": "Google", "F4:F5:D8": "Google", "44:65:0D": "Amazon",
       "FC:A1:83": "Amazon", "48:46:FB": "Huawei", "28:6E:D4": "Huawei"}
TCP_PROBE = (80, 443, 445, 22, 62078, 8080, 53)
WIN, MAC = platform.system() == "Windows", platform.system() == "Darwin"


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # UDP connect: no packet is actually sent
        return s.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return None
    finally:
        s.close()


def ping(ip):
    if WIN:
        cmd = ["ping", "-n", "1", "-w", "700", ip]
    elif MAC:
        cmd = ["ping", "-c", "1", "-t", "1", ip]
    else:
        cmd = ["ping", "-c", "1", "-W", "1", ip]
    try:
        return subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=4).returncode == 0
    except Exception:
        return False


def tcp_alive(ip):
    for p in TCP_PROBE:
        s = socket.socket()
        s.settimeout(0.25)
        try:
            r = s.connect_ex((ip, p))
            if r == 0 or r in (errno.ECONNREFUSED, 10061):  # refused = host answered
                return True
        except OSError:
            pass
        finally:
            s.close()
    return False


def alive(ip):
    return ping(ip) or tcp_alive(ip)


def norm_mac(m):
    return ":".join(x.zfill(2) for x in re.split(r"[:-]", m)).upper()


def arp_table():
    table = {}
    for cmd in (["arp", "-a"], ["ip", "neigh"]):
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=6).stdout
        except Exception:
            continue
        for line in out.splitlines():
            m = re.search(r"(\d+\.\d+\.\d+\.\d+).*?([0-9a-fA-F]{1,2}(?:[:-][0-9a-fA-F]{1,2}){5})", line)
            if m:
                mac = norm_mac(m.group(2))
                if mac not in ("FF:FF:FF:FF:FF:FF", "00:00:00:00:00:00") and not mac.startswith("01:00:5E"):
                    table[m.group(1)] = mac
    return table


def hostname(ip):
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return ""


def check_port(ip, port, timeout):
    s = socket.socket()
    s.settimeout(timeout)
    try:
        return s.connect_ex((ip, port)) == 0
    except OSError:
        return False
    finally:
        s.close()


def scan_ports(ip, timeout):
    with ThreadPoolExecutor(16) as ex:
        res = list(ex.map(lambda p: check_port(ip, p, timeout), PORTS))
    return [{"port": p, "service": PORTS[p][0], "risk": PORTS[p][1]} for p, ok in zip(PORTS, res) if ok]


def main():
    ap = argparse.ArgumentParser(description="VYROXX NETGUARD scanner")
    ap.add_argument("--subnet", help="e.g. 192.168.1.0/24 (default: auto-detect /24)")
    ap.add_argument("--out", default="netguard-report.json")
    ap.add_argument("--timeout", type=float, default=0.6, help="port timeout in seconds")
    ap.add_argument("--yes", action="store_true", help="skip the authorization prompt")
    ap.add_argument("--no-ports", action="store_true", help="only list devices, skip the port checks (faster, quieter)")
    a = ap.parse_args()

    print(f"VYROXX NETGUARD v{VERSION}\nScan ONLY networks you own or are authorized to test.")
    if not a.yes and input("Continue? [y/N] ").strip().lower() != "y":
        sys.exit("Cancelled.")
    me = local_ip()
    if not a.subnet:
        if not me:
            sys.exit("Could not detect your network. Use --subnet 192.168.1.0/24")
        a.subnet = ".".join(me.split(".")[:3]) + ".0/24"
    try:
        net = ipaddress.ip_network(a.subnet, strict=False)
    except ValueError:
        sys.exit("Invalid subnet. Example: --subnet 192.168.1.0/24")
    if net.version != 4 or not net.is_private:
        sys.exit("Refused: NETGUARD only scans private IPv4 networks (192.168.x.x, 10.x.x.x, 172.16-31.x.x). "
                 "Never scan networks you do not own or are not authorized to test.")
    if net.num_addresses > 1024:
        sys.exit("Subnet too large (max /22).")
    hosts_ip = [str(h) for h in net.hosts()]
    print(f"Your IP: {me}  |  Network: {net}  |  Discovering {len(hosts_ip)} addresses...")
    t0 = time.time()
    with ThreadPoolExecutor(64) as ex:
        live = [ip for ip, ok in zip(hosts_ip, ex.map(alive, hosts_ip)) if ok]
    arp = arp_table()
    live = sorted(set(live) | {ip for ip in arp if ip in hosts_ip}, key=lambda x: tuple(map(int, x.split("."))))
    print(f"Found {len(live)} devices. Checking names and open ports...")
    with ThreadPoolExecutor(32) as ex:
        names = list(ex.map(hostname, live))
    gw = next((ip for ip in (str(net.network_address + 1), str(net.broadcast_address - 1)) if ip in live), None)
    out = []
    order = {"high": 3, "medium": 2, "low": 1, "info": 0}
    for ip, name in zip(live, names):
        mac = arp.get(ip, "")
        ports = [] if a.no_ports else scan_ports(ip, a.timeout)
        risk = max((order[p["risk"]] for p in ports), default=0)
        out.append({"ip": ip, "mac": mac, "vendor": OUI.get(mac[:8], ""), "hostname": name,
                    "private_mac": bool(mac) and int(mac[:2], 16) & 2 == 2, "gateway": ip == gw,
                    "self": ip == me, "ports": ports, "risk": ["info", "low", "medium", "high"][risk]})
    duration = round(time.time() - t0, 1)
    report = {"tool": "VYROXX NETGUARD", "version": VERSION, "schema": "1.1",
              "time": time.strftime("%Y-%m-%d %H:%M:%S"), "duration": duration,
              "os": platform.system(), "python": platform.python_version(),
              "ports_checked": not a.no_ports, "subnet": str(net), "local_ip": me, "gateway": gw, "hosts": out}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\n{'IP':<16}{'MAC':<19}{'VENDOR/NAME':<28}OPEN PORTS")
    for h in out:
        tag = "[router] " if h["gateway"] else "[this PC] " if h["self"] else ""
        print(f"{h['ip']:<16}{h['mac'] or '-':<19}{(tag + (h['vendor'] or h['hostname'] or ''))[:27]:<28}"
              f"{', '.join(str(p['port']) for p in h['ports']) or '-'}")
    risky = sum(1 for h in out for p in h["ports"] if p["risk"] in ("high", "medium"))
    print(f"\nDone in {duration}s. {len(out)} devices, {risky} risky open ports. Report saved to: {a.out}")
    print("Open the VYROXX NETGUARD dashboard and load this file.")


if __name__ == "__main__":
    main()
