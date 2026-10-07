import psutil
import platform
import os
import time
from datetime import datetime
from typing import Dict, Any, List
import subprocess
import re

class SystemMonitor:
    def __init__(self):
        self.os_type = platform.system()
        self.boot_time = psutil.boot_time()
        self.history: List[Dict[str, Any]] = []

    def get_uptime_str(self) -> str:
        seconds = int(time.time() - self.boot_time)
        days = seconds // (24 * 3600)
        seconds %= (24 * 3600)
        hours = seconds // 3600
        seconds %= 3600
        minutes = seconds // 60
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        return f"{hours}h {minutes}m"

    def get_battery_info(self) -> Dict[str, Any]:
        battery = psutil.sensors_battery()
        if battery is not None:
            return {
                "percent": round(battery.percent, 1),
                "power_plugged": battery.power_plugged,
                "status": "Charging" if battery.power_plugged else "Discharging"
            }
        
        # macOS fallback via pmset
        if platform.system() == "Darwin":
            try:
                output = subprocess.check_output(["pmset", "-g", "batt"], text=True)
                pct_match = re.search(r"(\d+)%", output)
                status_match = re.search(r";\s*(\w+);", output)
                percent = float(pct_match.group(1)) if pct_match else 100.0
                status = status_match.group(1).capitalize() if status_match else "AC Power"
                return {
                    "percent": percent,
                    "power_plugged": "AC Power" in output or "charging" in output.lower(),
                    "status": status
                }
            except Exception:
                pass

        return {
            "percent": 100.0,
            "power_plugged": True,
            "status": "AC Power"
        }

    def get_current_metrics(self) -> Dict[str, Any]:
        cpu_pct = psutil.cpu_percent(interval=None)
        cpu_cores = psutil.cpu_count(logical=True)
        
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        net = psutil.net_io_counters()
        battery = self.get_battery_info()

        metrics = {
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "cpu_percent": round(cpu_pct, 1),
            "cpu_cores": cpu_cores,
            "memory_percent": round(mem.percent, 1),
            "memory_used_gb": round(mem.used / (1024 ** 3), 2),
            "memory_total_gb": round(mem.total / (1024 ** 3), 2),
            "disk_percent": round(disk.percent, 1),
            "disk_free_gb": round(disk.free / (1024 ** 3), 2),
            "disk_total_gb": round(disk.total / (1024 ** 3), 2),
            "battery": battery,
            "network": {
                "bytes_sent_mb": round(net.bytes_sent / (1024 ** 2), 2),
                "bytes_recv_mb": round(net.bytes_recv / (1024 ** 2), 2),
                "connected": True
            },
            "os": f"{platform.system()} {platform.release()}",
            "hostname": platform.node(),
            "uptime": self.get_uptime_str()
        }

        self.history.append({
            "time": metrics["timestamp"],
            "cpu": metrics["cpu_percent"],
            "memory": metrics["memory_percent"],
            "disk": metrics["disk_percent"]
        })
        if len(self.history) > 30:
            self.history.pop(0)

        return metrics

    def get_top_processes(self, limit: int = 5) -> List[Dict[str, Any]]:
        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                info = p.info
                if info['name']:
                    procs.append({
                        "pid": info['pid'],
                        "name": info['name'],
                        "cpu": round(info['cpu_percent'] or 0.0, 1),
                        "memory": round(info['memory_percent'] or 0.0, 1)
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        procs.sort(key=lambda x: x['cpu'], reverse=True)
        return procs[:limit]

system_monitor = SystemMonitor()
