"""
Non-blocking USB Serial Manager for ESP32 Communication
Automatically handles connection, auto-reconnection, and safe queue ingestion.
"""
import asyncio
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

    def start(self):
        """Starts background daemon reader thread."""
        self.running = True
        self.thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.thread.start()
        print(f"[SERIAL] Worker started, monitoring {self.port} at {self.baudrate} baud.")

    def stop(self):
        """Stops background reader and closes port safely."""
        self.running = False
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

                # Read line
                line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if line:
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
            except Exception as e:
                time.sleep(0.5)

    def send_command(self, command: str) -> bool:
        """Sends command string over serial if connected."""
        if self.ser and self.ser.is_open:
            try:
                self.ser.write(f"{command.strip()}\n".encode("utf-8"))
                self.ser.flush()
                return True
            except Exception as e:
                print(f"[SERIAL WRITE ERROR] {e}")
                return False
        return False
