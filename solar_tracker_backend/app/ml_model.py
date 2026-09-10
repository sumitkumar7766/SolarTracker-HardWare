import os
import joblib
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from .config import settings

class MLTrackerPredictor:
    def __init__(self):
        self.model = None
        self.features: List[str] = []
        self.is_loaded: bool = False
        self.load_error: str = ""
        self._load_assets()

    def _load_assets(self):
        """Loads solar_tracker_model.pkl and features.pkl."""
        model_path = settings.MODEL_PATH
        features_path = settings.FEATURES_PATH

        if not os.path.exists(model_path):
            self.load_error = f"Model file not found at: {model_path}"
            return

        if not os.path.exists(features_path):
            self.load_error = f"Features file not found at: {features_path}"
            return

        try:
            self.model = joblib.load(model_path)
            self.features = joblib.load(features_path)
            self.is_loaded = True
            self.load_error = ""
        except Exception as e:
            self.is_loaded = False
            self.load_error = f"Failed to load model: {str(e)}"

    def predict_corrections(self, sensor_and_solar_data: Dict[str, Any]) -> Tuple[float, float, str]:
        """
        Takes raw dictionary of sensor and solar position features,
        validates exact feature vector as expected by features.pkl,
        and predicts:
            predicted_azimuth_residual_deg, predicted_elevation_residual_deg
        Returns:
            (azimuth_residual, elevation_residual, error_str)
        """
        if not self.is_loaded or self.model is None:
            return 0.0, 0.0, f"Model not loaded: {self.load_error}"

        # Verify all expected features are present
        missing = [f for f in self.features if f not in sensor_and_solar_data]
        if missing:
            return 0.0, 0.0, f"Missing required ML features: {missing}"

        try:
            # Build DataFrame with the exact feature order stored in features.pkl
            feature_row = {f: [float(sensor_and_solar_data[f])] for f in self.features}
            X = pd.DataFrame(feature_row)

            # Check for NaN / infinite values
            if X.isnull().values.any() or np.isinf(X.values).any():
                return 0.0, 0.0, "Feature vector contains NaN or infinite values"

            # Predict continuous residuals
            # Output 1: Azimuth residual (deg)
            # Output 2: Elevation residual (deg)
            preds = self.model.predict(X)
            az_residual = float(preds[0, 0])
            el_residual = float(preds[0, 1])

            return az_residual, el_residual, ""

        except Exception as e:
            return 0.0, 0.0, f"Inference execution error: {str(e)}"
