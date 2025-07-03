import os
import subprocess

# IMPORTANT: Use the EXACT SAME PATH you put in transcribe.py here
# Example:
os.environ["PATH"] += os.pathsep + r"D:\ffmpeg\bin" # <-- YOUR FFmpeg BIN PATH HERE

try:
    # This will try to run ffmpeg and capture its output
    result = subprocess.run(
        ['ffmpeg', '-version'],
        check=True,
        capture_output=True,
        text=True,
        encoding='utf-8' # Specify encoding for text output
    )
    print("FFmpeg found and executed successfully!")
    print(result.stdout.split('\n')[0]) # Print the first line (version info)
except FileNotFoundError:
    print("ERROR: FFmpeg still NOT found even after modifying PATH.")
    print("Please double-check the path in os.environ and ensure ffmpeg.exe exists there.")
except subprocess.CalledProcessError as e:
    print(f"ERROR: FFmpeg command failed with return code {e.returncode}")
    print(f"STDOUT: {e.stdout}")
    print(f"STDERR: {e.stderr}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

exit()