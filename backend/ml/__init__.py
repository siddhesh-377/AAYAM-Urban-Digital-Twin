"""
backend/ml/__init__.py
======================
Bridge package that makes the root-level ml/ module accessible
from within the backend package as `backend.ml`.

This resolves imports like:
    from backend.ml.predict import predictor
    from backend.ml.features import FEATURE_COLUMNS
"""
