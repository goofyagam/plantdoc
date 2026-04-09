# PlantDoc.py
import os
import time
import random
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template
from PIL import Image

# Gemini SDK (official)
from google import genai
from google.genai import types

# Load .env from same folder as this script
here = Path(__file__).parent
load_dotenv(dotenv_path=here / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment. Put it in a .env file next to PlantDoc.py")

# Create Gemini client
client = genai.Client(api_key=API_KEY)

app = Flask(__name__, static_folder="static", template_folder="templates")


def resize_image_bytes(image_bytes: bytes, max_size=1024) -> bytes:
    """Resize image to max_size (px) on largest side and return JPEG bytes."""
    im = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = im.size
    if max(w, h) > max_size:
        ratio = max_size / float(max(w, h))
        new_size = (int(w * ratio), int(h * ratio))
        im = im.resize(new_size, Image.LANCZOS)
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=85)
    return buf.getvalue()


def call_gemini_with_retry(client, contents, model="gemini-2.5-flash", max_attempts=4, base_delay=1.0):
    """
    Call Gemini and retry on transient errors (503 / UNAVAILABLE / network issues).
    Returns response.text on success, or raises last exception on permanent failure.
    """
    last_exc = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = client.models.generate_content(model=model, contents=contents)
            return response.text
        except Exception as e:
            last_exc = e
            err_str = str(e).lower()
            retriable = False
            if "503" in err_str or "unavailable" in err_str or "timeout" in err_str or "rate limit" in err_str or "429" in err_str:
                retriable = True

            print(f"[Gemini] attempt {attempt}/{max_attempts} failed: {e}  retriable={retriable}")
            if not retriable or attempt == max_attempts:
                break
            # exponential backoff + jitter
            sleep_for = base_delay * (2 ** (attempt - 1))
            jitter = random.uniform(0, 0.5 * sleep_for)
            time.sleep(sleep_for + jitter)
    raise last_exc


@app.route("/", methods=["GET"])
def index():
    # Serve the UI HTML page (templates/index.html)
    return render_template("index.html")


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    """
    Expects multipart/form-data with a file field named 'file'
    Returns JSON: { "result": "text..." } or { "error": "..." }
    """
    try:
        f = request.files.get("file")
        if not f:
            return jsonify({"error": "No file uploaded"}), 400

        raw_bytes = f.read()
        # Resize smaller for speed & cost
        image_bytes = resize_image_bytes(raw_bytes, max_size=800)

        # Build prompt (tweak species if you have it)
        prompt_text = (
            "You are a plant pathologist. Analyze the uploaded plant leaf image and do the following:\n"
            "1) Identify the most likely disease(s) or pest damage (short list) with a confidence label (high/medium/low).\n"
            "2) Describe the visible symptoms you see.\n"
            "3) Provide practical, step-by-step remedies and prevention measures that a home gardener can follow.\n"
            "If you are not confident, explain why and give next steps (e.g., take a higher-res photo, send to extension service).\n"
            "Return your response as plain readable text."
        )

        contents = [
            prompt_text,
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
        ]

        # Call Gemini with retries (this can raise)
        result_text = call_gemini_with_retry(client, contents=contents, model="gemini-2.5-flash", max_attempts=4)

        return jsonify({"result": result_text})
    except Exception as e:
        # For debugging, also return the exception message (strip sensitive info if any)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # Development server
    app.run(host="0.0.0.0", port=10000)
    
