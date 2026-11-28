"""
PPE Safety Monitoring System — Entry Point

Launch the professional industrial safety monitoring application.

Usage:
    python run.py

Requirements:
    - Python 3.8+
    - ultralytics
    - opencv-python
    - Pillow
    - torch (installed with ultralytics)

Keyboard shortcuts:
    Q       Quit application
    P       Pause / Resume monitoring
    Escape  Stop current source
"""

import sys
import os

# Ensure the project root is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def main():
    try:
        from app.ui.window import MainWindow

        app = MainWindow()
        app.run()

    except ImportError as e:
        print(f"\nDependency error: {e}")
        print("\nRequired packages:")
        print("  pip install ultralytics opencv-python Pillow")
        sys.exit(1)

    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
