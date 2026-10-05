import os
import subprocess

WORKSPACE = r"c:\Users\DC\OneDrive\Desktop\practice\7th sem project\7th-sem-project"
VIDEO = os.path.join(WORKSPACE, "Placement_Portal_Demo_With_Voiceover.mp4")
OUT_DIR = os.path.join(WORKSPACE, "presentation_assets", "contact_sheet")
os.makedirs(OUT_DIR, exist_ok=True)
FFMPEG_BIN = r"C:\Users\DC\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

# Extract frame every 10 seconds up to 375 seconds
for sec in range(5, 375, 10):
    out_path = os.path.join(OUT_DIR, f"frame_{sec:03d}s.jpg")
    cmd = [
        FFMPEG_BIN, "-y",
        "-ss", str(sec),
        "-i", VIDEO,
        "-vframes", "1",
        "-q:v", "4",
        out_path
    ]
    subprocess.run(cmd, capture_output=True)

print("Contact sheet frames extracted.")
