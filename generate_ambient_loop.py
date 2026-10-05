import math
import struct
import wave
import os
import subprocess

OUTPUT_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "placement_portal_tts")
os.makedirs(OUTPUT_DIR, exist_ok=True)
LOOP_WAV = os.path.join(OUTPUT_DIR, "ambient_loop_32s.wav")
FULL_MUSIC_WAV = os.path.join(OUTPUT_DIR, "ambient_soundtrack_full.wav")
FFMPEG = r"C:\Users\DC\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

SAMPLE_RATE = 44100
LOOP_SECONDS = 32.0
LOOP_SAMPLES = int(SAMPLE_RATE * LOOP_SECONDS)

# 4 warm chords (frequencies in Hz):
CHORDS = [
    [130.81, 196.00, 246.94, 329.63, 587.33],  # Cmaj9
    [98.00,  146.83, 246.94, 329.63, 392.00],   # G6
    [110.00, 164.81, 261.63, 392.00, 493.88],   # Am9
    [87.31,  130.81, 220.00, 329.63, 523.25],   # Fmaj7
]
CHORD_DURATION = 8.0  # seconds per chord

print("Generating 32-second seamless ambient loop...")
with wave.open(LOOP_WAV, "w") as wav_file:
    wav_file.setnchannels(2)      # Stereo
    wav_file.setsampwidth(2)      # 16-bit
    wav_file.setframerate(SAMPLE_RATE)
    
    frames = bytearray()
    for i in range(LOOP_SAMPLES):
        t = i / SAMPLE_RATE
        
        # Determine chord
        chord_idx = int(t / CHORD_DURATION) % len(CHORDS)
        chord = CHORDS[chord_idx]
        chord_t = t % CHORD_DURATION
        
        # Smooth envelope per chord
        chord_env = math.sin(math.pi * (chord_t / CHORD_DURATION))
        
        # Slow stereo breathing LFO
        lfo1 = 0.85 + 0.15 * math.sin(2 * math.pi * 0.125 * t)
        lfo2 = 0.85 + 0.15 * math.cos(2 * math.pi * 0.125 * t)
        
        left_val = 0.0
        right_val = 0.0
        
        for freq in chord:
            s1 = math.sin(2 * math.pi * freq * t)
            s2 = 0.22 * math.sin(2 * math.pi * freq * 2.0 * t + 0.5)
            note = (s1 + s2) * 0.15
            left_val += note * lfo1
            right_val += note * lfo2
            
        # Subtle gentle chime accent every 4 seconds
        chime_t = t % 4.0
        if chime_t < 2.0:
            accent_freq = chord[-1]
            decay = math.exp(-3.0 * chime_t)
            chime = 0.08 * decay * math.sin(2 * math.pi * accent_freq * t)
            left_val += chime * 0.8
            right_val += chime * 1.2
            
        left_val *= chord_env * 0.4
        right_val *= chord_env * 0.4
        
        int_left = max(-32767, min(32767, int(left_val * 32767)))
        int_right = max(-32767, min(32767, int(right_val * 32767)))
        frames.extend(struct.pack("<hh", int_left, int_right))
        
    wav_file.writeframes(frames)

print(f"[OK] Created loop: {LOOP_WAV}")

# Now use ffmpeg to seamlessly loop and apply 3.5s fade-in and 3.5s fade-out to 379.57s
print("Extending loop to 379.57s with 3.5s fade-in and 3.5s fade-out...")
cmd = [
    FFMPEG, "-y",
    "-stream_loop", "-1",
    "-i", LOOP_WAV,
    "-t", "379.57",
    "-af", "afade=t=in:ss=0:d=3.5,afade=t=out:st=376.0:d=3.5",
    FULL_MUSIC_WAV
]
subprocess.run(cmd, check=True)
print(f"[OK] Created full ambient soundtrack: {FULL_MUSIC_WAV}")
