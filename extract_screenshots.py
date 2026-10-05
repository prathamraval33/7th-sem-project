import os
import subprocess

WORKSPACE = r"c:\Users\DC\OneDrive\Desktop\practice\7th sem project\7th-sem-project"
VIDEO = os.path.join(WORKSPACE, "Placement_Portal_Demo_With_Voiceover.mp4")
OUT_DIR = os.path.join(WORKSPACE, "presentation_assets")
os.makedirs(OUT_DIR, exist_ok=True)

FFMPEG_BIN = r"C:\Users\DC\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"

shots = [
    ("01_admin_onboarding_domain_gating.png", 10.0),
    ("02_razorpay_license_checkout.png", 28.5),
    ("03_admin_command_center_checklist.png", 46.0),
    ("04_admin_branches_curriculum.png", 74.0),
    ("05_admin_fee_templates.png", 80.5),
    ("06_admin_billing_invoices.png", 93.5),
    ("07_admin_user_management.png", 110.0),
    ("08_admin_activities_whatsapp.png", 119.0),
    ("09_custom_feature_request_modal.png", 136.0),
    ("10_superadmin_custom_proposals.png", 154.0),
    ("11_superadmin_colleges_directory.png", 170.0),
    ("12_superadmin_feature_management.png", 177.0),
    ("13_superadmin_subscriptions.png", 187.0),
    ("14_superadmin_global_announcements.png", 197.0),
    ("15_student_dashboard_placement_drives.png", 210.0),
    ("16_student_proctored_test_center.png", 218.0),
    ("17_student_weak_areas_diagnostics.png", 229.0),
    ("18_study_resources_syllabus_ingestion.png", 250.0),
    ("19_study_resources_34_subjects_catalog.png", 261.0),
    ("20_study_resources_tpo_ai_curation.png", 280.0),
    ("21_study_resources_student_mit_ocw.png", 290.0),
    ("22_mock_interview_setup.png", 308.0),
    ("23_mock_interview_interactive_session.png", 320.0),
    ("24_mock_interview_coding_dsa.png", 331.0),
    ("25_mock_interview_resume_grounded.png", 340.0),
    ("26_resume_ats_analysis_score.png", 353.0),
    ("27_resume_skill_gaps_action_items.png", 361.0),
    ("28_resume_enhancer_wizard.png", 368.0),
]

for name, ts in shots:
    out_path = os.path.join(OUT_DIR, name)
    cmd = [
        FFMPEG_BIN,
        "-y",
        "-ss", str(ts),
        "-i", VIDEO,
        "-vframes", "1",
        "-q:v", "2",
        out_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"Extracted {name} at {ts}s (size: {os.path.getsize(out_path)} bytes)")
    else:
        print(f"Failed {name}: {res.stderr}")
