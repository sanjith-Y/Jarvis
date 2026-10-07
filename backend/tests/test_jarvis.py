import asyncio
import os
import unittest
from backend.app.system.monitor import system_monitor
from backend.app.ai.provider import jarvis_ai
from backend.app.commands.security import classify_command, SecurityLevel
from backend.app.memory.manager import memory_manager
from backend.app.notifications.engine import notification_engine, NotificationPriority
from backend.app.reminders.manager import reminder_manager
from backend.app.search.engine import web_search_engine
from backend.app.files.assistant import file_assistant

class TestJarvisCore(unittest.TestCase):
    def test_01_system_monitoring(self):
        metrics = system_monitor.get_current_metrics()
        self.assertIn("cpu_percent", metrics)
        self.assertIn("memory_percent", metrics)
        self.assertIn("battery", metrics)
        self.assertGreaterEqual(metrics["memory_percent"], 0.0)
        self.assertLessEqual(metrics["memory_percent"], 100.0)

    def test_02_command_security_matrix(self):
        # Safe
        sec, _ = classify_command("open chrome", "open_app")
        self.assertEqual(sec, SecurityLevel.SAFE)

        # Confirmation required
        sec_conf, _ = classify_command("rm -rf data", "shell")
        self.assertEqual(sec_conf, SecurityLevel.CONFIRMATION_REQUIRED)

        # Blocked
        sec_block, _ = classify_command("rm -rf /", "shell")
        self.assertEqual(sec_block, SecurityLevel.BLOCKED)

    def test_03_memory_persistence(self):
        mem = memory_manager.add_memory("User enjoys classical and lo-fi focus music.", category="preferences")
        self.assertIsNotNone(mem["id"])

        results = memory_manager.get_memories(search="classical")
        self.assertTrue(any("classical" in m["content"] for m in results))

        deleted = memory_manager.delete_memory(mem["id"])
        self.assertTrue(deleted)

    def test_04_notification_classification(self):
        # Critical
        p_crit = notification_engine.classify("Firewall", "SecOps", "Security Breach Detected", "Suspicious login attempt")
        self.assertEqual(p_crit, NotificationPriority.CRITICAL)

        # Important
        p_imp = notification_engine.classify("Calendar", "Office", "Meeting in 30 mins", "Assignment deadline today")
        self.assertEqual(p_imp, NotificationPriority.IMPORTANT)

        # Low
        p_low = notification_engine.classify("Store", "Nike", "20% discount on shoes", "Promo deal")
        self.assertEqual(p_low, NotificationPriority.LOW)

    def test_05_reminder_parsing(self):
        rem = reminder_manager.create_reminder("Submit thesis report", "in 15 mins")
        self.assertEqual(rem["title"], "Submit thesis report")
        self.assertEqual(rem["status"], "UPCOMING")
        
        comp = reminder_manager.complete_reminder(rem["id"])
        self.assertTrue(comp)
        reminder_manager.delete_reminder(rem["id"])

    def test_06_file_assistant_sandbox(self):
        # Safe path inside workspace
        res = file_assistant.list_files()
        self.assertTrue(res["success"])

        # Prevent traversal outside workspace
        unsafe_res = file_assistant.read_file("../../etc/passwd")
        self.assertFalse(unsafe_res["success"])

    def test_07_ai_intent_routing(self):
        async def run_ai():
            res = await jarvis_ai.process_user_input("what is my cpu usage")
            self.assertEqual(res["tool_action"], "Query System Status")
            self.assertIn("percent", res["reply"].lower())

            res2 = await jarvis_ai.process_user_input("check my notifications")
            self.assertEqual(res2["tool_action"], "Scan Notifications")
            self.assertTrue(len(res2["reply"]) > 0)
        asyncio.run(run_ai())

if __name__ == "__main__":
    unittest.main()
