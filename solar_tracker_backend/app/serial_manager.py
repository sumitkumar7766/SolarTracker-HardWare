import time
import threading
import serial
from typing import Optional, Callable
from .config import settings

class SerialManager:
    """
    Non-blocking background thread worker for reading USB serial telemetry from ESP32
    and dispatching motor commands back to ESP32.
    """

    def __init__(self, on_packet_received: Callable[[str], None]):
        self.port = settings.SERIAL_PORT
        self.baudrate = settings.BAUD_RATE
        self.on_packet_received = on_packet_received

        self.ser: Optional[serial.Serial] = None
        self.is_connected: bool = False
        self.running: bool = False
        self.thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        self.send_command("CMD,MOTOR,STOP\n")
        with self._lock:
            if self.ser and self.ser.is_open:
                try:
                    self.ser.close()
                except Exception:
                    pass
                self.ser = None
        self.is_connected = False

    def send_command(self, cmd: str) -> bool:
        """Sends a text command to ESP32 over serial."""
        with self._lock:
            if self.ser and self.ser.is_open:
                try:
                    self.ser.write(cmd.encode("utf-8"))
                    self.ser.flush()
                    return True
                except Exception:
                    self.is_connected = False
                    return False
        return False

    def _read_loop(self):
        while self.running:
            if settings.SIMULATION_MODE:
                # In simulation mode, sleep briefly to avoid busy loop
                time.sleep(0.5)
                continue

            # Ensure serial port is connected
            if self.ser is None or not self.ser.is_open:
                try:
                    self.ser = serial.Serial(
                        port=self.port,
                        baudrate=self.baudrate,
                        timeout=settings.SERIAL_TIMEOUT
                    )
                    time.sleep(2.0)  # Allow port settling
                    self.is_connected = True
                except serial.SerialException:
                    self.is_connected = False
                    if self.ser:
                        try:
                            self.ser.close()
                        except Exception:
                            pass
                        self.ser = None
                    time.sleep(2.0)
                    continue

            # Read serial lines
            try:
                line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if line:
                    self.on_packet_received(line)
            except (serial.SerialException, OSError):
                self.is_connected = False
                with self._lock:
                    if self.ser:
                        try:
                            self.ser.close()
                        except Exception:
                            pass
                        self.ser = None
                time.sleep(2.0)
            except Exception:
                time.sleep(0.1)
