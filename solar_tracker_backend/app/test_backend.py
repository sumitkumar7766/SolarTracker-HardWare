import unittest
import numpy as np
import pandas as pd
from datetime import datetime
from zoneinfo import ZoneInfo

from app.config import settings
from app.sensor_processor import parse_esp32_packet
from app.solar_position import SolarPositionCalculator
from app.ml_model import MLTrackerPredictor
from app.motor_controller import MotorController
from app.tracker import TrackerCoordinator

class TestSolarTrackerBackend(unittest.TestCase):

    def setUp(self):
        self.coordinator = TrackerCoordinator()
        self.motor_ctrl = MotorController()
        self.ml_predictor = MLTrackerPredictor()
        self.solar_calc = SolarPositionCalculator()

    def test_1_packet_parsing_valid(self):
        """Test 1: Parses valid 20-field ESP32 packet."""
        raw_line = "111882,4095,4095,4095,4095,0,0,0.0,0.0,54612.5,HIGH,CENTER,CENTER,36.5,53.7,22.32,0.775,17.3,1500,34"
        data = parse_esp32_packet(raw_line)
        self.assertIsNotNone(data)
        self.assertEqual(data["ESP32_Timestamp_ms"], 111882)
        self.assertEqual(data["Top_LDR"], 4095)
        self.assertEqual(data["Lux"], 54612.5)
        self.assertEqual(data["Horizontal_Error"], 0)
        self.assertEqual(data["Vertical_Error"], 0)
        self.assertEqual(data["Horizontal_Normalized"], 0.0)

    def test_2_packet_parsing_invalid(self):
        """Test 2: Rejects corrupted or partial packets."""
        self.assertIsNone(parse_esp32_packet("corrupted,packet"))
        self.assertIsNone(parse_esp32_packet(""))

    def test_3_feature_creation_and_solar_position(self):
        """Test 3: Checks pvlib solar position and temporal trigonometric features."""
        now = datetime(2026, 9, 10, 15, 46, 29, tzinfo=ZoneInfo("Asia/Kolkata"))
        res = self.solar_calc.calculate(now)
        self.assertIn("time_sin", res)
        self.assertIn("time_cos", res)
        self.assertIn("Solar_Azimuth_deg", res)
        self.assertIn("Solar_Elevation_deg", res)
        self.assertAlmostEqual(res["Solar_Azimuth_deg"], 258.36, places=1)
        self.assertAlmostEqual(res["Solar_Elevation_deg"], 36.31, places=1)

    def test_4_ml_prediction(self):
        """Test 4: Checks ML inference returns valid continuous residuals."""
        raw_line = "111882,4095,4095,4095,4095,0,0,0.0,0.0,54612.5,HIGH,CENTER,CENTER,36.5,53.7,22.32,0.775,17.3,1500,34"
        sensor_data = parse_esp32_packet(raw_line)
        now = datetime(2026, 9, 10, 15, 46, 29, tzinfo=ZoneInfo("Asia/Kolkata"))
        solar_data = self.solar_calc.calculate(now)
        combined = {**solar_data, **sensor_data}

        az_res, el_res, err = self.ml_predictor.predict_corrections(combined)
        self.assertEqual(err, "")
        self.assertIsInstance(az_res, float)
        self.assertIsInstance(el_res, float)

    def test_5_stop_condition_locked(self):
        """Test 5: Tracker enters TRACKING LOCKED when residuals and LDRs are within deadbands."""
        # az_res = 0.2 (< 1.0), el_res = -0.3 (< 1.0), h_norm = 0.02 (< 0.08), v_norm = 0.01 (< 0.08)
        az_act, el_act, az_us, el_deg, status, is_stop, reason = self.motor_ctrl.evaluate_tracking(
            pred_az_res=0.2,
            pred_el_res=-0.3,
            target_el=50.0,
            h_norm=0.02,
            v_norm=0.01,
            lux=5000.0,
            tracking_mode="AUTO"
        )
        self.assertEqual(status, "TRACKING LOCKED")
        self.assertTrue(is_stop)
        self.assertEqual(az_act, "STOP")
        self.assertEqual(el_act, "HOLD")

    def test_6_low_light_no_sun_condition(self):
        """Test 6: Tracker halts both motors when Lux is below threshold."""
        az_act, el_act, az_us, el_deg, status, is_stop, reason = self.motor_ctrl.evaluate_tracking(
            pred_az_res=5.0,
            pred_el_res=4.0,
            target_el=45.0,
            h_norm=0.5,
            v_norm=0.5,
            lux=50.0,  # Below LOW_LIGHT_LUX (200.0)
            tracking_mode="AUTO"
        )
        self.assertEqual(status, "NO SUN")
        self.assertTrue(is_stop)
        self.assertEqual(az_act, "STOP")
        self.assertEqual(el_act, "STOP")

    def test_7_active_tracking_action(self):
        """Test 7: Triggers motor movement when outside deadband."""
        az_act, el_act, az_us, el_deg, status, is_stop, reason = self.motor_ctrl.evaluate_tracking(
            pred_az_res=+3.5,  # Right
            pred_el_res=-2.5,  # Down
            target_el=35.0,
            h_norm=0.25,
            v_norm=-0.20,
            lux=45000.0,
            tracking_mode="AUTO"
        )
        self.assertEqual(status, "TRACKING")
        self.assertFalse(is_stop)
        self.assertEqual(az_act, "RIGHT")
        self.assertEqual(el_act, "DOWN")
        self.assertEqual(az_us, settings.AZ_STOP_US + settings.AZ_SPEED_DELTA_US)

    def test_8_emergency_stop(self):
        """Test 8: Emergency stop forces STOPPED mode and motor shutdown."""
        self.coordinator.emergency_stop()
        state = self.coordinator.get_state()
        self.assertEqual(state["tracking_mode"], "STOPPED")
        self.assertEqual(state["motors"]["azimuth"], "STOP")
        self.assertEqual(state["motors"]["elevation"], "STOP")
        self.assertTrue(state["stop"]["is_stopped"])

if __name__ == "__main__":
    unittest.main()
