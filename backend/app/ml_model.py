"""
ML Model Inference Engine
Loads trained solar_tracker_model.pkl and features.pkl
Computes dual-axis correction angles without retraining
"""
import os
import joblib
import numpy as np
import pandas as pd
from .config import settings

class MLInferenceEngine:
    def __init__(self):
        self.model = None
        self.feature_names = None
        self.is_loaded = False
        self.load_model()

    def load_model(self):
        """Loads the pre-trained Gradient Boosting multi-output model and feature sequence."""
        try:
            if not os.path.exists(settings.MODEL_PATH):
                raise FileNotFoundError(f"Model not found at {settings.MODEL_PATH}")
            if not os.path.exists(settings.FEATURES_PATH):
                raise FileNotFoundError(f"Features not found at {settings.FEATURES_PATH}")

            self.model = joblib.load(settings.MODEL_PATH)
            self.feature_names = joblib.load(settings.FEATURES_PATH)
            self.is_loaded = True
            print(f"[ML] Successfully loaded model from {settings.MODEL_PATH}")
            print(f"[ML] Verified {len(self.feature_names)} features in features.pkl")
        except Exception as e:
            self.is_loaded = False
            print(f"[ML ERROR] Failed to load model assets: {e}")

    def predict(self, feature_dict: dict) -> tuple[float, float]:
        """
        Runs inference on single sample feature dictionary.
        Returns:
            (predicted_azimuth_residual_deg, predicted_elevation_residual_deg)
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("ML model is not loaded.")

        # Ensure all expected features are present
        missing = [f for f in self.feature_names if f not in feature_dict]
        if missing:
            raise ValueError(f"Missing required model features: {missing}")

        # Construct single-row DataFrame in exact order
        X = pd.DataFrame([[feature_dict[col] for col in self.feature_names]], columns=self.feature_names)

        # Check for NaN / Inf
        if X.isnull().values.any() or np.isinf(X.values).any():
            raise ValueError("Input feature vector contains NaN or infinite values.")

        preds = self.model.predict(X)
        az_residual = float(preds[0, 0])
        el_residual = float(preds[0, 1])

        return round(az_residual, 3), round(el_residual, 3)

ml_engine = MLInferenceEngine()
