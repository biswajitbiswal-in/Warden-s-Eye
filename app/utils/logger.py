"""
Logging configuration for the PPE Safety Monitoring System.

Provides structured logging with file and console output.
Avoids dumping debug information into the operator UI.
"""

import logging
import sys
from pathlib import Path
from app.config import PROJECT_DIR


LOG_DIR = PROJECT_DIR / "logs"
LOG_FILE = LOG_DIR / "safety_system.log"


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """
    Configure application-wide logging.

    Returns the root application logger.
    Console shows INFO+, file captures DEBUG+.
    """
    LOG_DIR.mkdir(exist_ok=True)

    logger = logging.getLogger("ppe_safety")
    logger.setLevel(logging.DEBUG)

    # Prevent duplicate handlers on re-init
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        fmt="%(asctime)s  %(levelname)-8s  %(name)-20s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Console handler — INFO and above
    console = logging.StreamHandler(sys.stdout)
    console.setLevel(level)
    console.setFormatter(formatter)
    logger.addHandler(console)

    # File handler — DEBUG and above, rotating would be nice but
    # keeping it simple to avoid extra dependencies
    try:
        file_handler = logging.FileHandler(
            LOG_FILE, encoding="utf-8", mode="a"
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except OSError:
        logger.warning("Could not create log file at %s", LOG_FILE)

    return logger


def get_logger(name: str) -> logging.Logger:
    """Get a child logger under the application namespace."""
    return logging.getLogger(f"ppe_safety.{name}")
