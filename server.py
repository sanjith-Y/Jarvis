#!/usr/bin/env python3
"""
JARVIS AI Assistant - Server Core
Handles system telemetry, Instagram helper endpoints, URL execution, and static UI delivery.
"""

import http.server
import socketserver
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error
import urllib.parse
import platform
import re
from datetime import datetime

PORT = int(os.environ.get("PORT", 8080))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_system_telemetry():
    telemetry = {
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
        "hostname": platform.node(),
        "python_version": platform.python_version(),
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cpu": "Normal",
        "battery": "AC Power",
        "battery_pct": 100,
        "uptime": "N/A"
    }

    # macOS Battery check via pmset
    if platform.system() == "Darwin":
        try:
            batt = subprocess.check_output(["pmset", "-g", "batt"], text=True)
            pct_match = re.search(r"(\d+)%", batt)
            status_match = re.search(r";\s*(\w+);", batt)
            if pct_match:
                telemetry["battery_pct"] = int(pct_match.group(1))
            if status_match:
                telemetry["battery"] = status_match.group(1).capitalize()
            elif "AC Power" in batt:
                telemetry["battery"] = "Charging"
        except Exception:
            pass

        # macOS Uptime
        try:
            uptime_out = subprocess.check_output(["uptime"], text=True).strip()
            telemetry["uptime"] = uptime_out
        except Exception:
            pass

        # macOS Load Average
        try:
            load = os.getloadavg()
            telemetry["cpu_load"] = [round(x, 2) for x in load]
        except Exception:
            telemetry["cpu_load"] = [0.5, 0.4, 0.3]
    else:
        try:
            telemetry["cpu_load"] = [round(x, 2) for x in os.getloadavg()]
        except Exception:
            telemetry["cpu_load"] = [0.1, 0.1, 0.1]

    return telemetry

def fetch_instagram_oembed(url):
    try:
        # Standard Instagram oEmbed endpoint
        oembed_url = f"https://www.instagram.com/oembed/?url={urllib.parse.quote(url)}"
        req = urllib.request.Request(
            oembed_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                return {
                    "success": True,
                    "title": data.get("title", ""),
                    "author_name": data.get("author_name", ""),
                    "author_url": data.get("author_url", ""),
                    "thumbnail_url": data.get("thumbnail_url", ""),
                    "html": data.get("html", "")
                }
    except Exception as e:
        # Graceful fallback parsing from URL
        pass

    # Extract ID and type if oEmbed is restricted or rate-limited
    reel_match = re.search(r"/reel/([A-Za-z0-9_-]+)", url)
    post_match = re.search(r"/p/([A-Za-z0-9_-]+)", url)
    shortcode = None
    media_type = "post"

    if reel_match:
        shortcode = reel_match.group(1)
        media_type = "reel"
    elif post_match:
        shortcode = post_match.group(1)
        media_type = "post"

    return {
        "success": shortcode is not None,
        "shortcode": shortcode,
        "media_type": media_type,
        "url": url,
        "embed_url": f"https://www.instagram.com/{media_type}/{shortcode}/embed/" if shortcode else "",
        "direct_url": url,
        "fallback": True
    }

class JarvisRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/system":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(get_system_telemetry()).encode())
            return
        elif parsed.path == "/" or parsed.path == "/index.html":
            self.path = "/index.html"
            return super().do_GET()
        else:
            return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode() if content_length > 0 else "{}"
        
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if parsed.path == "/api/instagram/info":
            target_url = data.get("url", "").strip()
            res = fetch_instagram_oembed(target_url)
            self._send_json(res)
            return

        elif parsed.path == "/api/system/open":
            target_url = data.get("url", "").strip()
            # Verify safe URL
            if target_url.startswith("https://") or target_url.startswith("http://"):
                try:
                    if platform.system() == "Darwin":
                        subprocess.Popen(["open", target_url])
                    elif platform.system() == "Linux":
                        subprocess.Popen(["xdg-open", target_url])
                    elif platform.system() == "Windows":
                        os.startfile(target_url)
                    self._send_json({"success": True, "message": f"Opened {target_url}"})
                except Exception as e:
                    self._send_json({"success": False, "error": str(e)}, status=500)
            else:
                self._send_json({"success": False, "error": "Invalid URL protocol"}, status=400)
            return

        elif parsed.path == "/api/system/say":
            text = data.get("text", "").strip()
            if text and platform.system() == "Darwin":
                try:
                    # Non-blocking voice speech via macOS say command
                    voice = data.get("voice", "Daniel") # Daniel is a classic British voice on macOS
                    subprocess.Popen(["say", "-v", voice, text])
                    self._send_json({"success": True})
                    return
                except Exception as e:
                    pass
            self._send_json({"success": False})
            return

        self.send_error(404, "Endpoint not found")

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

def find_available_port(start_port=8088, max_attempts=10):
    import socket
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    return start_port

def run():
    target_port = int(os.environ.get("PORT", 8088))
    actual_port = find_available_port(target_port)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", actual_port), JarvisRequestHandler) as httpd:
        print("=" * 60)
        print(f"⚡ J.A.R.V.I.S. Core Online")
        print(f"📡 Interface: http://localhost:{actual_port}")
        print(f"🤖 Protocol: Online & Listening")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down J.A.R.V.I.S. Core...")
            httpd.shutdown()

if __name__ == "__main__":
    run()
