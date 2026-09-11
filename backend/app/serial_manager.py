"""
Non-blocking USB Serial Manager for ESP32 Communication
Handles auto-reconnection, telemetry packet forwarding, and bidirectional motor command dispatch.
"""
import threading
import time
from typing import Callable, Optional
import serial
from .config import settings

class SerialManager:
    def __init__(self, on_packet_received: Callable[[str], None], on_status_changed: Callable[[bool], None]):
        self.port = settings.SERIAL_PORT
        self.baudrate = settings.BAUD_RATE
        self.on_packet_received = on_packet_received
        self.on_status_changed = on_status_changed

        self.ser: Optional[serial.Serial] = None
        self.is_connected = False
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self._write_lock = threading.Lock()

    def start(self):
        """Starts background daemon reader thread."""
        self.running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()
        print(f"[SERIAL] Worker started, monitoring {self.port} at {self.baudrate} baud.")

    def stop(self):
        """Stops background reader and closes port safely."""
        self.running = False
        self.send_command("CMD,MOTOR,STOP")
        if self.ser and self.ser.is_open:
            try:
                self.ser.close()
            except Exception:
                pass
        self.is_connected = False
        self.on_status_changed(False)

    def _worker_loop(self):
        while self.running:
            try:
                if self.ser is None or not self.ser.is_open:
                    self.ser = serial.Serial(
                        port=self.port,
                        baudrate=self.baudrate,
                        timeout=1.0
                    )
                    self.is_connected = True
                    self.on_status_changed(True)
                    print(f"[SERIAL] Connected to ESP32 on {self.port}")
                    time.sleep(2.0)  # ESP32 boot/reset stabilization

                # Read line from ESP32
                line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    if line.startswith("ACK,") or line.startswith("WARN,") or line.startswith("ERR,") or line == "SYSTEM_READY":
                        print(f"[ESP32 NOTIFICATION] {line}")
                    else:
                        self.on_packet_received(line)

            except (serial.SerialException, OSError) as e:
                if self.is_connected:
                    print(f"[SERIAL DISCONNECT] Connection lost: {e}. Retrying in 2s...")
                    self.is_connected = False
                    self.on_status_changed(False)
                if self.ser:
                    try:
                        self.ser.close()
                    except Exception:
                        pass
                    self.ser = None
                time.sleep(2.0)
            except Exception:
                time.sleep(0.5)

    def send_command(self, command: str) -> bool:
        """Sends command string over serial if connected."""
        if not command:
            return False
        with self._write_lock:
            if self.ser and self.ser.is_open:
                try:
                    payload = f"{command.strip()}\n".encode("utf-8")
                    self.ser.write(payload)
                    self.ser.flush()
                    print(f"[SERIAL TX] -> {command.strip()}")
                    return True
                except Exception as e:
                    print(f"[SERIAL WRITE ERROR] Failed to send {command}: {e}")
                    return False
        return False
