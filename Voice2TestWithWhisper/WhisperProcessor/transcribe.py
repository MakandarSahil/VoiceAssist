import whisper
import sys
import json
import os
import torch
from datetime import datetime

# --- Logging Helper Functions ---
def log_error(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ERROR: {message}", file=sys.stderr)

def log_info(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] INFO: {message}", file=sys.stderr)

# --- FFmpeg Path Configuration (CRITICAL) ---
try:
    ffmpeg_bin_path = r"D:\ffmpeg\bin"  # <--- VERIFY AND SET THIS PATH

    if os.path.exists(ffmpeg_bin_path) and "ffmpeg.exe" in os.listdir(ffmpeg_bin_path):
        if ffmpeg_bin_path not in os.environ["PATH"]:
            os.environ["PATH"] += os.pathsep + ffmpeg_bin_path
            log_info(f"FFmpeg bin path '{ffmpeg_bin_path}' added to Python's PATH.")
        else:
            log_info(f"FFmpeg bin path '{ffmpeg_bin_path}' already in Python's PATH.")
    else:
        log_error(f"FFmpeg bin path not found or ffmpeg.exe missing at: {ffmpeg_bin_path}. "
                  "Please ensure FFmpeg is downloaded and extracted correctly.")
except Exception as e:
    log_error(f"Error during FFmpeg path setup: {str(e)}")
# ---------------------------------------------


def normalize_path(path_str):
    """Normalize paths for cross-OS compatibility, especially for paths passed to ffmpeg."""
    # os.path.abspath resolves to the full path
    # replace('\\', '/') is generally good for internal tools like ffmpeg even on Windows
    return os.path.abspath(path_str).replace('\\', '/')

def transcribe_audio(audio_path):
    """Transcribes an audio file using OpenAI Whisper."""
    try:
        # Normalize the path received from Node.js
        normalized_audio_path = normalize_path(audio_path)
        log_info(f"Normalized audio path for transcription: {normalized_audio_path}")

        if not os.path.exists(normalized_audio_path):
            log_error(f"File not found at: {normalized_audio_path}")
            return None

        # Determine device (GPU or CPU)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        log_info(f"Using device for Whisper: {device}")

        # Load the Whisper model
        log_info(f"Loading Whisper 'base' model on {device}...")
        model = whisper.load_model("base", device=device)
        log_info("Whisper model loaded successfully.")

        # Perform transcription
        log_info(f"Starting transcription of {normalized_audio_path}...")
        # verbose=True will make Whisper print more detailed info to stderr
        result = model.transcribe(
            normalized_audio_path,
            fp16=(device == "cuda"), # Use float16 for GPU for performance
            verbose=True # Shows progress and details in stderr
        )
        log_info("Transcription completed.")
        return result["text"]

    except Exception as e:
        log_error(f"Transcription process failed: {str(e)}")
        # If an error occurs, it's often due to FFmpeg not found or audio file issues
        if "ffmpeg" in str(e).lower() or "[winerror 2]" in str(e).lower():
            log_error("Common issue: FFmpeg might not be correctly installed or in system PATH. "
                      "Verify FFmpeg installation and the 'ffmpeg_bin_path' in this script.")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        log_error("Usage: python transcribe.py <audio_file_path>")
        sys.exit(1)

    try:
        input_audio_path = sys.argv[1]
        log_info(f"Received audio file path argument: {input_audio_path}")

        # Basic check for file existence and read permissions before passing to transcribe_audio
        # transcribe_audio also has checks, but this is a quick fail-safe
        if not os.path.exists(input_audio_path):
            log_error(f"Input audio file not found: {input_audio_path}")
            print(json.dumps({"error": "File not found", "status": "error"}))
            sys.exit(1)
        
        if not os.access(input_audio_path, os.R_OK):
            log_error(f"No read permissions for file: {input_audio_path}")
            print(json.dumps({"error": "Permission denied", "status": "error"}))
            sys.exit(1)

        transcribed_text = transcribe_audio(input_audio_path)

        if transcribed_text is not None:
            print(json.dumps({
                "transcription": transcribed_text,
                "status": "success",
                "file_path": input_audio_path # For debugging, shows what file was processed
            }))
        else:
            log_error("Transcription returned None. Check logs for details.")
            print(json.dumps({
                "error": "Transcription failed",
                "status": "error",
                "file_path": input_audio_path
            }), file=sys.stderr) # Output error JSON to stderr
            sys.exit(1)

    except Exception as e:
        log_error(f"Main script execution error: {str(e)}")
        print(json.dumps({
            "error": "Unexpected error in main script",
            "details": str(e),
            "status": "error"
        }), file=sys.stderr) # Output error JSON to stderr
        sys.exit(1)