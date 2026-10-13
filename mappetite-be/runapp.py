"""Local development entry point: `python runapp.py`.

Production (Render) uses gunicorn instead: `gunicorn wsgi:app`.
"""

from app import create_app
from config import Config

app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=Config.PORT, debug=False)
