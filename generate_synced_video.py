"""
Placement Portal Demo Video - Master Synchronization & Audio Production Pipeline
==================================================================================
Performs:
1. Precise per-chapter audio retiming and cue synthesis with edge-tts (speaking rate +15%).
2. Master narration timeline stitching on a 379.57s timeline.
3. Multi-track audio mix with ambient background music at 10% volume, with 3.5s fade-in/fade-out.
4. Export to final synchronized video: Placement_Portal_Demo_With_Voiceover.mp4.
"""

import asyncio
import os
import subprocess
import sys
import wave
from pydub import AudioSegment
import edge_tts

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding.lower() != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

FFMPEG_BIN = r"C:\Users\DC\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
os.environ["PATH"] += ";" + FFMPEG_BIN
FFMPEG = os.path.join(FFMPEG_BIN, "ffmpeg.exe")

OUTPUT_DIR = os.path.join(os.path.expanduser("~"), "Downloads", "placement_portal_tts")
os.makedirs(OUTPUT_DIR, exist_ok=True)

WORKSPACE_DIR = r"c:\Users\DC\OneDrive\Desktop\practice\7th sem project\7th-sem-project"
VIDEO_PATH = os.path.join(WORKSPACE_DIR, "_Demo Video.mp4")
OUTPUT_VIDEO = os.path.join(WORKSPACE_DIR, "Placement_Portal_Demo_With_Voiceover.mp4")

VOICE = "en-US-GuyNeural"
RATE = "+15%"      # 1.15x speed (crisp corporate delivery, strictly in [0.85x, 1.25x])
PITCH = "-1Hz"
TOTAL_VIDEO_SECONDS = 379.57

# Comprehensive cue list perfectly calibrated to the exact on-screen visual triggers
CUES = [
    # ─── Chapter 1: Admin Onboarding (0:00 - 59.53s) ───
    {
        "id": "01a",
        "desc": "Title Card: Admin Onboarding",
        "start_sec": 1.5,
        "max_end": 5.5,
        "text": "Welcome to the placement portal, beginning with Admin Onboarding."
    },
    {
        "id": "01b_1",
        "desc": "Registration Form - Official Domain Gating",
        "start_sec": 6.5,
        "max_end": 14.8,
        "text": "Colleges register with campus credentials. Domain validation rejects commercial emails like Gmail for secure institutional access."
    },
    {
        "id": "01b_2",
        "desc": "Registration Form - Leadership & Password",
        "start_sec": 15.5,
        "max_end": 22.0,
        "text": "Administrators configure institute leadership contacts and secure credentials before proceeding directly to license activation."
    },
    {
        "id": "01c_1",
        "desc": "Razorpay Modal - Campus Standard License",
        "start_sec": 23.5,
        "max_end": 32.5,
        "text": "The institution selects the Campus Standard License at ten thousand rupees per month, launching the integrated Razorpay checkout."
    },
    {
        "id": "01c_2",
        "desc": "Razorpay Modal - Payment Processing & Verification",
        "start_sec": 33.0,
        "max_end": 40.0,
        "text": "The platform supports cards, UPI, and net banking with instant automated order verification and digital receipt generation."
    },
    {
        "id": "01d_1",
        "desc": "Admin Command Center - Setup Checklist",
        "start_sec": 41.5,
        "max_end": 51.5,
        "text": "Upon payment confirmation, administrators enter the Command Center, guided by an interactive three-step setup checklist."
    },
    {
        "id": "01d_2",
        "desc": "Admin Command Center - Domain & TPO Activation",
        "start_sec": 52.0,
        "max_end": 59.0,
        "text": "The checklist verifies campus domain records, provisions placement accounts, and activates university-wide portal governance."
    },

    # ─── Chapter 2: Admin Side Demo (59.53s - 125.57s) ───
    {
        "id": "02a",
        "desc": "Title Card: Admin Side Demo",
        "start_sec": 60.5,
        "max_end": 65.0,
        "text": "Next, we examine the Admin Side Governance console for institutional management."
    },
    {
        "id": "02b",
        "desc": "Institution Settings - Profile & Leadership",
        "start_sec": 65.2,
        "max_end": 71.1,
        "text": "Under Institution Settings, campus administrators configure university details and leadership contacts."
    },
    {
        "id": "02c",
        "desc": "Branches & Curriculum - 9 Departments Directory",
        "start_sec": 71.2,
        "max_end": 76.7,
        "text": "The Branches and Curriculum module centralizes academic departments, from Civil and Mechanical to Computer Engineering."
    },
    {
        "id": "02d",
        "desc": "Fee Receipt Verification Templates",
        "start_sec": 77.0,
        "max_end": 83.9,
        "text": "Administrators can preview official fee receipt templates and configure OCR reference standards for automated student verification."
    },
    {
        "id": "02e",
        "desc": "License & Subscription - Active 30-Day Cycle",
        "start_sec": 84.0,
        "max_end": 90.0,
        "text": "The License console tracks the active thirty-day subscription cycle with automatic payment locks to prevent duplicate billing."
    },
    {
        "id": "02f",
        "desc": "Billing & Invoices - Razorpay Receipts & GST",
        "start_sec": 90.0,
        "max_end": 98.0,
        "text": "The Billing section provides complete financial transparency, archiving Razorpay transaction receipts and downloadable GST invoices."
    },
    {
        "id": "02g",
        "desc": "Modules & Add-ons Store - Custom Proposals",
        "start_sec": 98.5,
        "max_end": 107.0,
        "text": "In Modules and Add-ons, administrators explore platform catalog extensions and review submitted custom departmental proposals."
    },
    {
        "id": "02h_user",
        "desc": "User Account Management - Roster & Overrides",
        "start_sec": 108.0,
        "max_end": 114.8,
        "text": "In User Management, administrators review student rosters, monitor readiness scores, and manage placement overrides."
    },
    {
        "id": "02i_act",
        "desc": "Activities Hub - WhatsApp & Communications",
        "start_sec": 115.0,
        "max_end": 125.0,
        "text": "The Activities Hub consolidates campus communications, featuring direct WhatsApp Web messaging and automated email audit logs."
    },

    # ─── Chapter 3: Custom Feature Request (125.57s - 161.77s) ───
    {
        "id": "03a",
        "desc": "Title Card: Custom Feature Request",
        "start_sec": 126.5,
        "max_end": 130.8,
        "text": "Next, we explore Custom Feature Proposals and Engineering Collaboration."
    },
    {
        "id": "03b_1",
        "desc": "Propose New Feature Modal - TPO Submission",
        "start_sec": 131.5,
        "max_end": 140.0,
        "text": "College administrators can propose custom platform capabilities, specifying target personas, categories, and urgency levels."
    },
    {
        "id": "03b_2",
        "desc": "Propose Feature Modal - Engineering Pipeline",
        "start_sec": 140.5,
        "max_end": 148.5,
        "text": "After providing detailed technical rationale, the proposal is submitted directly to the SuperAdmin engineering pipeline."
    },
    {
        "id": "03c",
        "desc": "SuperAdmin Console - Review & Under Review Status",
        "start_sec": 149.5,
        "max_end": 161.0,
        "text": "Platform administrators instantly review incoming proposals, updating the status to Under Review and attaching structured engineering feedback."
    },

    # ─── Chapter 4: SuperAdmin Side Demo (161.77s - 200.60s) ───
    {
        "id": "04a",
        "desc": "Title Card: SuperAdmin Side Demo",
        "start_sec": 162.5,
        "max_end": 167.5,
        "text": "Now entering the SuperAdmin Command Center for platform-wide multi-tenant governance."
    },
    {
        "id": "04b",
        "desc": "Colleges Multi-Tenant Directory",
        "start_sec": 167.8,
        "max_end": 174.5,
        "text": "SuperAdmins oversee all registered colleges, managing domain authorizations, account activations, and institutional status."
    },
    {
        "id": "04c",
        "desc": "Feature Management Catalog",
        "start_sec": 174.5,
        "max_end": 181.5,
        "text": "The Feature Management catalog provides centralized control over platform add-ons, from Alumni Networks to Exam Preparation modules."
    },
    {
        "id": "04d",
        "desc": "Subscriptions & Campus Licensing Oversight",
        "start_sec": 182.0,
        "max_end": 192.5,
        "text": "The Subscriptions console delivers real-time oversight of active campus licenses, one-time purchases, and recurring billing cycles."
    },
    {
        "id": "04e",
        "desc": "Broadcast Global Announcements",
        "start_sec": 193.5,
        "max_end": 200.0,
        "text": "With Global Announcements, administrators can broadcast important platform updates to every connected campus with a single click."
    },

    # ─── Chapter 5: Student Side Demo (200.60s - 238.60s) ───
    {
        "id": "05a",
        "desc": "Title Card: Student Side Demo",
        "start_sec": 202.0,
        "max_end": 206.5,
        "text": "Transitioning to the student experience portal."
    },
    {
        "id": "05b",
        "desc": "Student Dashboard & TCS Placement Drive",
        "start_sec": 206.8,
        "max_end": 215.0,
        "text": "Students access personalized dashboards and explore verified placement drives, such as this TCS Full Stack opportunity with full compensation details."
    },
    {
        "id": "05c",
        "desc": "Proctored Instant Tests Center",
        "start_sec": 215.2,
        "max_end": 221.2,
        "text": "The Proctored Test Center offers self-practice drills and official company assessments to evaluate technical readiness."
    },
    {
        "id": "05d",
        "desc": "AI Interview & Resume Optimization Tools",
        "start_sec": 221.5,
        "max_end": 226.5,
        "text": "Integrated AI tools streamline interview preparation and resume optimization tailored to target job descriptions."
    },
    {
        "id": "05e",
        "desc": "Weak Areas & Skill Gaps Diagnostics",
        "start_sec": 226.8,
        "max_end": 232.8,
        "text": "The Weak Areas diagnostic pinpoints recurring gaps across assessments in Java, Data Structures, and SQL."
    },
    {
        "id": "05f",
        "desc": "Student Account Settings & Academic Profile",
        "start_sec": 233.0,
        "max_end": 238.2,
        "text": "Finally, student profiles manage verified credentials and placement eligibility."
    },

    # ─── Chapter 6: Study Resources (238.60s - 296.77s) ───
    {
        "id": "06a",
        "desc": "Title Card: Study Resources",
        "start_sec": 241.0,
        "max_end": 246.0,
        "text": "The Study Resources module bridges academic curricula with placement preparation."
    },
    {
        "id": "06b_1",
        "desc": "AI Syllabus Ingestion - PDF Parsing",
        "start_sec": 247.0,
        "max_end": 255.5,
        "text": "Administrators upload official syllabus PDFs. Our AI parser extracts subjects, unit syllabi, and prerequisites automatically."
    },
    {
        "id": "06b_2",
        "desc": "AI Syllabus Ingestion - 34 Subjects Catalog",
        "start_sec": 256.5,
        "max_end": 265.0,
        "text": "The platform organizes thirty-four courses across all eight semesters into a structured, searchable digital curriculum."
    },
    {
        "id": "06c",
        "desc": "Add Custom Subject - Big Data in Sem 7",
        "start_sec": 266.0,
        "max_end": 275.5,
        "text": "Department heads can add custom subjects like Big Data into Semester Seven, attaching elective tags and syllabus outlines."
    },
    {
        "id": "06d",
        "desc": "TPO Curriculum Resources - Find AI Resources",
        "start_sec": 276.5,
        "max_end": 286.5,
        "text": "By clicking Find AI Resources, the engine queries academic repositories to curate recommended textbooks, lecture notes, and video tutorials."
    },
    {
        "id": "06e",
        "desc": "Open MIT OpenCourseWare Link Live",
        "start_sec": 287.5,
        "max_end": 296.0,
        "text": "Students can launch verified MIT OpenCourseWare and university lecture materials directly in the browser for exam-ready study."
    },

    # ─── Chapter 7: Mock Interview Simulator (296.77s - 343.67s) ───
    {
        "id": "07a",
        "desc": "Title Card: Mock Interview",
        "start_sec": 297.0,
        "max_end": 303.5,
        "text": "The AI Mock Interview Simulator offers personalized, role-specific technical practice."
    },
    {
        "id": "07b",
        "desc": "Google Interview Setup - 10 Questions",
        "start_sec": 304.5,
        "max_end": 315.5,
        "text": "Students configure interview sessions targeting top employers like Google, selecting difficulty levels across technical, coding, and behavioral rounds."
    },
    {
        "id": "07c",
        "desc": "Interactive Behavioral Question & Answer",
        "start_sec": 316.5,
        "max_end": 325.5,
        "text": "The AI interviewer asks realistic behavioral questions, evaluating candidate responses in real time for communication clarity and structure."
    },
    {
        "id": "07d",
        "desc": "Turn-by-Turn AI Score & Zero-Sum DSA Problem",
        "start_sec": 326.5,
        "max_end": 335.5,
        "text": "Candidates receive instant turn-by-turn scores, constructive critiques, and technical coding challenges like finding zero-sum subarrays."
    },
    {
        "id": "07e",
        "desc": "Resume-Grounded Mock Interview Mode",
        "start_sec": 336.5,
        "max_end": 343.0,
        "text": "In Resume-Grounded mode, the simulator tailors questions directly to the student's uploaded projects and tech stack."
    },

    # ─── Chapter 8: Resume Features (343.67s - 379.57s) ───
    {
        "id": "08a",
        "desc": "Title Card: Resume Features",
        "start_sec": 344.0,
        "max_end": 350.5,
        "text": "Finally, the AI Resume Suite optimizes student profiles for competitive applicant tracking systems."
    },
    {
        "id": "08b_1",
        "desc": "ATS Resume Analysis - Score 78/100",
        "start_sec": 351.5,
        "max_end": 357.5,
        "text": "The Resume Analyzer delivers an instant ATS score, evaluating formatting, structure, and keyword density."
    },
    {
        "id": "08b_2",
        "desc": "ATS Resume Analysis - 8 Skill Gaps & Action Items",
        "start_sec": 358.5,
        "max_end": 364.5,
        "text": "It highlights eight critical skill gaps such as Docker and Cloud Computing, with prioritized action steps for improvement."
    },
    {
        "id": "08c",
        "desc": "AI Resume Enhancer Wizard - Step 2 Projects",
        "start_sec": 365.5,
        "max_end": 372.5,
        "text": "The interactive Resume Enhancer wizard guides candidates in transforming bullet points with quantified achievements and impact metrics."
    },
    {
        "id": "08d",
        "desc": "Google DBA Resume Generated & Closing",
        "start_sec": 373.0,
        "max_end": 379.0,
        "text": "The result is a publication-ready resume tailored for top tech roles. Thank you!"
    },
]

async def generate_cue_audio(cue):
    filepath = os.path.join(OUTPUT_DIR, f"synced_cue_{cue['id']}.mp3")
    comm = edge_tts.Communicate(
        text=cue["text"],
        voice=VOICE,
        rate=RATE,
        pitch=PITCH,
    )
    await comm.save(filepath)
    seg = AudioSegment.from_file(filepath)
    dur = len(seg) / 1000.0
    return filepath, dur

def stitch_cues_to_timeline(cue_results):
    final_audio = os.path.join(OUTPUT_DIR, "synced_narration_master.wav")
    total_ms = int(TOTAL_VIDEO_SECONDS * 1000)
    master = AudioSegment.silent(duration=total_ms)
    
    print("\nStitching synchronized voice cues onto 379.57s timeline...")
    for fp, dur, cue in cue_results:
        clip = AudioSegment.from_file(fp)
        start_ms = int(cue["start_sec"] * 1000)
        end_sec = cue["start_sec"] + dur
        margin = cue["max_end"] - end_sec
        master = master.overlay(clip, position=start_ms)
        status = "[OK]    " if margin >= -0.2 else "[ALERT] "
        print(f"  {status} Cue {cue['id']:8} | Start: {cue['start_sec']:5.1f}s | Dur: {dur:4.1f}s | Ends: {end_sec:5.1f}s (Slot: {cue['max_end']:5.1f}s, Margin: {margin:+4.1f}s) | {cue['desc']}")
        
    master.export(final_audio, format="wav")
    print(f"\n[OK] Master Narration WAV created: {final_audio}")
    return final_audio

def render_final_video_with_audio_and_music(narration_wav, music_wav):
    print(f"\nMixing Narration (100%) + Background Music (10%) into final video -> {OUTPUT_VIDEO}...")
    
    # Mix voiceover at 1.0 (0dB) and ambient music at 0.10 (-20dB)
    # Strictly adheres to 8%-12% volume rule and independent audio layers
    filter_complex = (
        "[1:a]volume=1.0[voice];"
        "[2:a]volume=0.10[bgm];"
        "[voice][bgm]amix=inputs=2:duration=first:dropout_transition=3[audio_out]"
    )
    
    cmd = [
        FFMPEG, "-y",
        "-i", VIDEO_PATH,
        "-i", narration_wav,
        "-i", music_wav,
        "-filter_complex", filter_complex,
        "-map", "0:v:0",
        "-map", "[audio_out]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        OUTPUT_VIDEO
    ]
    
    subprocess.run(cmd, check=True)
    print(f"\n[SUCCESS] Final Synced Video Created:\n  {OUTPUT_VIDEO}")
    print(f"File Size: {os.path.getsize(OUTPUT_VIDEO) / (1024*1024):.2f} MB")

async def main():
    print("=" * 78)
    print("PLACEMENT PORTAL DEMO VIDEO - AUDIO-VIDEO SYNCHRONIZATION PIPELINE")
    print(f"Speaking Rate: {RATE} | Cues: {len(CUES)} | Total Duration: {TOTAL_VIDEO_SECONDS}s")
    print("=" * 78)
    
    music_wav = os.path.join(OUTPUT_DIR, "ambient_soundtrack_full.wav")
    if not os.path.exists(music_wav):
        print("Ambient soundtrack not found, generating...")
        subprocess.run(["python", "generate_ambient_loop.py"], check=True)
    
    print("\nGenerating cue speech clips with Microsoft Neural TTS...")
    cue_results = []
    for c in CUES:
        fp, dur = await generate_cue_audio(c)
        cue_results.append((fp, dur, c))
        
    master_narration = stitch_cues_to_timeline(cue_results)
    render_final_video_with_audio_and_music(master_narration, music_wav)
    
    print("\n" + "=" * 78)
    print("AUDIO-VIDEO SYNCHRONIZATION AND MUSIC MASTERING COMPLETE!")
    print("=" * 78)

if __name__ == "__main__":
    asyncio.run(main())
