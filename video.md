# 🎬 Placement Portal — Master Demo Video Blueprint & Complete Voice-Over Script

> **A Comprehensive, Sequential, and Broadcast-Ready Video Demonstration Guide**  
> Covering **every single user role, route, feature, modal, AI capability, and system workflow** without leaving any functionality out.

---

## 📋 Table of Contents
1. [Production Setup & Recording Standards](#1-production-setup--recording-standards)
2. [Master Credentials & Test Environment Directory](#2-master-credentials--test-environment-directory)
3. [Chronological Video Timeline & Structure](#3-chronological-video-timeline--structure)
4. [Full Scene-by-Scene Script & Action Guide](#4-full-scene-by-scene-script--action-guide)
   - [Act 1: The Public Experience & Architecture (00:00 - 03:00)](#act-1-the-public-experience--architecture)
   - [Act 2: Onboarding & Authentication Engine (03:00 - 06:30)](#act-2-onboarding--authentication-engine)
   - [Act 3: SuperAdmin Command Deck Console (06:30 - 10:30)](#act-3-superadmin-command-deck-console)
   - [Act 4: Institution Admin & Governance (10:30 - 14:00)](#act-4-institution-admin--governance)
   - [Act 5: Training & Placement Officer (TPO) Command Suite (14:00 - 20:30)](#act-5-training--placement-officer-tpo-command-suite)
   - [Act 6: Student Portal, Proctored Tests & AI Suite (20:30 - 28:00)](#act-6-student-portal-proctored-tests--ai-suite)
   - [Act 7: Conclusion & Platform Vision (28:00 - 29:30)](#act-7-conclusion--platform-vision)
5. [Voice-Over Recording & Audio Styling Guidelines](#5-voice-over-recording--audio-styling-guidelines)
6. [Post-Production, Stitching & Export Guide](#6-post-production-stitching--export-guide)

---

## 1. Production Setup & Recording Standards

### A. Environment Check
Before starting the recording, verify both servers are active:
- **Frontend Server:** `http://localhost:5173` (Vite + React)
- **Backend Server:** `http://localhost:8000` (FastAPI + Uvicorn + PostgreSQL / SQLite)
- **Interactive API Docs:** `http://localhost:8000/docs`

```bash
# Terminal 1 - Backend
cd placement-portal-backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd placement-portal-frontend
npm run dev
```

### B. Display & Recording Settings
- **Resolution:** 1920 × 1080 (Full HD, 16:9 ratio)
- **Frame Rate:** 60 FPS (for ultra-smooth motion & cursor transitions)
- **Browser Zoom:** 100% (or 90% if you wish to show more dense dashboard data in a single viewport)
- **Browser Window:** Clean profile without bookmarks bar or extensions icons (Press `F11` for full-screen or toggle browser toolbar).
- **Cursor Settings:** High visibility cursor with subtle click ring animation.
- **Recommended Free Screen Recorders:**
  - **OBS Studio:** 60fps CBR 12,000 kbps, NVENC or x264 encoder.
  - **Windows Game Bar:** `Win + Alt + R` (built-in Windows screen recorder).
  - **Clipchamp / CapCut Desktop:** Direct screen capture with timeline editing.

---

## 2. Master Credentials & Test Environment Directory

| Role | Portal URL | Email Address | Password | Purpose & Scope |
| :--- | :--- | :--- | :--- | :--- |
| **SuperAdmin** | `/login` → `/superadmin` | `superadmin@platform.com` | `Password@123` | Multi-tenant governance, SaaS analytics, feature license activation, global audit logs |
| **College Admin**| `/login` → `/admin` | `admin@bvmengineering.ac.in` | `Password@123` | College-level user management, department settings, module toggles, billing & logs |
| **TPO Officer** | `/login` → `/tpo` | `tpo@bvmengineering.ac.in` | `Password@123` | Drive creation, applicant pipeline, instant tests, fee review, NBA/NAAC reports |
| **Student** | `/login` → `/student` | `student@bvmengineering.ac.in` | `Password@123` | Drive applications, proctored tests, AI resume analyzer, mock interviews, prep |

---

## 3. Chronological Video Timeline & Structure

```mermaid
timeline
    title Master Demo Video Narrative Flow
    00:00 - 03:00 : Public Experience : Landing Page, Stats, Features, Testimonials, FAQ, Contact Us
    03:00 - 06:30 : Authentication Engine : Student Signup Flow, College SaaS Registration, OTP, Razorpay Checkout
    06:30 - 10:30 : SuperAdmin Console : Multi-College Directory, Global Feature Licensing, Platform Analytics, Audit
    10:30 - 14:00 : College Admin : Department Configurations, User Management, Activity Streams, Billing
    14:00 - 20:30 : TPO Command Suite : Drive Pipelines, Proctored Test Engine, Fee Receipts OCR Review, Reports
    20:30 - 28:00 : Student AI Suite : Readiness Score, Test Attempt & Proctoring, AI Resume Enhancer, AI Mock Interview
    28:00 - 29:30 : Conclusion : Summary of Innovation, Security Architecture & Architectural Wrap-up
```

---

## 4. Full Scene-by-Scene Script & Action Guide

---

### Act 1: The Public Experience & Architecture
**Duration:** 00:00 – 03:00  
**URL:** `http://localhost:5173/`

#### 🎬 Screen Actions:
1. Start recording at `http://localhost:5173/` centered on the Hero Section.
2. Allow the animated readiness gauge counter (`82% Career Readiness`) to smoothly count up.
3. Move the mouse across the hero banner to trigger the reactive ambient glow effect.
4. Slowly scroll down through:
   - **Departments Ticker:** Hover cursor over the infinite marquee (pause marquee on hover).
   - **Interactive Feature Grid:** Point to each card: *AI Mock Interviews, Resume Analyzer, Live Eligibility, Proctored Tests, Career Insights, Verified from Day One*.
   - **Why Switch Section:** Highlight institutional isolation, modular add-ons, single TPO view, and bank-grade security.
   - **How It Works (5-Step Roadmap):** Hover from Step 01 to Step 05.
   - **Live Placement Statistics:** Pause while numbers count up (Total Placed, Highest Package, Partner Companies, Partner Colleges).
   - **Student & Faculty Testimonials:** Highlight reviews from engineering students and TPO heads.
   - **Interactive FAQ Accordion:** Click open 2 FAQs (e.g., *"Is this only for one college?"* and *"How does eligibility checking work?"*).
5. Click **"Contact Us"** in the navigation bar.
6. On `/contact`, demonstrate the sleek contact card, department phone directory, and type a quick sample message into the form before clicking Submit.

#### 🎙️ Voice-Over Script:
> *"Welcome to the comprehensive walkthrough of the next-generation Placement Portal — an enterprise-grade, multi-tenant campus recruitment and career intelligence ecosystem.*
>
> *Traditional placement management is fragmented. Training and Placement Officers drown in spreadsheets, eligibility verification takes days, and students lack personalized AI preparation. Our platform unifies the entire lifecycle — from multi-college institutional onboarding to automated eligibility screening, AI-driven mock interviews, proctored instant assessments, and NBA/NAAC accreditation reporting.*
>
> *Starting on our public landing page, visitors experience an elegant, light-themed aesthetic designed with crisp typography, reactive ambient micro-interactions, and real-time animation counters.*
>
> *Notice our live career readiness score metric, our rolling department marquee featuring Computer Engineering, IT, Mechanical, Electrical, Civil, and Electronics, and our core modular capabilities.*
>
> *Scrolling down, institutions see our five-step roadmap: institutional verification, profile completion with AI fee verification, real-time drive matching, AI-powered preparation, and end-to-end recruitment tracking.*
>
> *Our dynamic FAQ answers critical institutional questions regarding strict tenant isolation, customizable criteria, and data protection. Furthermore, the integrated Contact desk allows prospective institutions or recruiters to connect directly with the campus administration in real time."*

---

### Act 2: Onboarding & Authentication Engine
**Duration:** 03:00 – 06:30  
**URLs:** `/signup/email`, `/register-college`, `/login`, `/forgot-password/email`

#### 🎬 Screen Actions:
1. Click **"Sign up"** in the top navigation bar.
2. Show the **Student 3-Step Signup Wizard**:
   - Step 1: Input student institutional email (`student@bvmengineering.ac.in`). Click Continue.
   - Step 2: Show the secure 6-digit OTP verification screen with resend timer.
   - Step 3: Show the password creation page with real-time password strength indicators (uppercase, number, special character requirements).
3. Navigate to **"Get started"** or `/register-college` to demonstrate **College Registration**:
   - Step 1: Fill College Name (*"Birla Vishvakarma Mahavidyalaya"*), College Code, Official Domain (`bvmengineering.ac.in`), Admin Email, Phone.
   - Step 2: Show the institutional OTP verification.
   - Step 3: Admin credential configuration.
   - Step 4: Show the **Subscription Tier Selection** (Starter, Professional, Enterprise) and trigger the Razorpay Test Payment Modal. Point cursor to the secure Razorpay sandbox checkout.
4. Click **"Sign in"** to display `/login`. Highlight the clean dual-input form, role auto-detection, and the *"Forgot Password?"* recovery pathway.

#### 🎙️ Voice-Over Script:
> *"A cornerstone of institutional trust is authenticated entry. Our platform enforces strict security through automated institutional email domain gating and multi-step verification.*
>
> *Here, a student signs up using their verified campus domain. Our backend immediately issues a secure, time-sensitive One-Time Password via SMTP. Upon OTP validation, the student configures their encrypted password meeting institutional complexity requirements.*
>
> *For new colleges joining the platform, we provide a streamlined multi-tenant SaaS onboarding flow. The institution registers its legal entity, official campus domain, and administrative contact.*
>
> *In Step 4, the institution selects an annual subscription package. We have seamlessly integrated Razorpay's secure payment gateway, allowing administrators to subscribe instantly with comprehensive webhook verification.*
>
> *With zero administrative overhead, the platform creates an isolated college database schema, seeds the institutional administrator, and configures default department settings."*

---

### Act 3: SuperAdmin Command Deck Console
**Duration:** 06:30 – 10:30  
**Login:** `superadmin@platform.com` / `Password@123`  
**URL:** `/superadmin`

#### 🎬 Screen Actions:
1. Log in with `superadmin@platform.com`. The app redirects into the **Command Deck Console** (`/superadmin/dashboard`).
2. **Dashboard Overview:**
   - Hover over the top KPI cards: *Active Colleges, Total Subscribed Students, Monthly Recurring Revenue, Pending Feature Approvals*.
   - Point out the notification bell and profile badge in the top header.
3. Click **"Colleges"** (`/superadmin/colleges`):
   - Show the table of all registered institutions.
   - Use the Search box to filter by name. Show the Status badges (*Active, Pending Review, Suspended*).
   - Click on an individual college to open **College Detail Page** (`/superadmin/colleges/:id`). Show domain settings, assigned admin email, student quota, and drive statistics.
4. Click **"Feature Management"** (`/superadmin/features`):
   - Point to the feature catalog cards: *Instant Tests Engine, AI Mock Interviews, Resume ATS Analyzer, Study Resources Library, GATE/CAT Prep Portal*.
   - Demonstrate the Pending Requests queue where colleges request modular add-ons. Show the one-click **"Approve / Activate"** toggle.
5. Click **"Subscriptions"** (`/superadmin/subscriptions`):
   - Review subscription tiers, price per student, plan limits, and active billing statuses.
6. Click **"Analytics"** (`/superadmin/analytics`):
   - Showcase platform-wide telemetry: system load, cross-college placement comparison bar charts, total drives conducted across all campuses.
7. Click **"Announcements"** (`/superadmin/announcements`):
   - Demonstrate the global broadcast banner editor to notify all colleges of scheduled system maintenance.
8. Click **"Audit Log"** (`/superadmin/audit-log`):
   - Show the immutable system audit trail tracking logins, role modifications, and license changes with timestamps and IP records.

#### 🎙️ Voice-Over Script:
> *"Now let's step into the highest tier of authority: the SuperAdmin Command Deck Console.*
>
> *Built for multi-tenant SaaS administrators, this centralized cockpit monitors and governs all onboarded universities, licensing, revenue, and security.*
>
> *On the Command Deck Dashboard, the executive view presents live metrics across all registered universities, active student seats, platform revenue, and pending institutional requests.*
>
> *Navigating to the Colleges directory, the SuperAdmin can audit any campus in the system. Opening a college profile reveals their verified domain, campus administrators, allocated user quotas, and live placement activity.*
>
> *Our modular architecture shines under Feature Management. Here, colleges can operate on a lean baseline or request advanced capabilities such as proctored tests, AI mock interviews, or competitive exam preparation. The SuperAdmin can selectively toggle or approve features per college with a single click, instantly activating frontend routes and backend permissions.*
>
> *The Platform Analytics view aggregates cross-institutional placement benchmarks, while Announcements and the comprehensive Audit Log ensure compliance, complete transparency, and system-wide visibility."*

---

### Act 4: Institution Admin & Governance
**Duration:** 10:30 – 14:00  
**Login:** `admin@bvmengineering.ac.in` / `Password@123`  
**URL:** `/admin`

#### 🎬 Screen Actions:
1. Log out of SuperAdmin and log in as the **College Admin** (`admin@bvmengineering.ac.in`).
2. **Admin Dashboard** (`/admin/dashboard`):
   - Review the college overview: Total Registered Students, Total Placement Drives, Placement Percentage, Top Recruiting Partners.
3. Click **"Activities"** (`/admin/activities`):
   - Scroll through the real-time activity feed: newly registered students, drives posted by TPOs, test completions, and fee submissions.
4. Click **"Reports & Analytics"** (`/admin/analytics`):
   - Show department-wise placement comparison charts, median CTC distribution, and year-over-year growth graphs.
5. Click **"User Management"** (`/admin/users`):
   - Navigate through the tabs: **Students**, **TPOs**, and **Faculty Coordinators**.
   - Click the **"+ Add User"** button to open the modal (First Name, Last Name, Email, Department, Role).
   - Point out the **Bulk CSV Import** button for onboarding an entire incoming batch in seconds.
   - Show the action menu: Edit Profile, Reset Password, or Toggle Active Status.
6. Click **"Modules & Add-ons"** (`/admin/features`):
   - Show the college's active vs available modules. Click "Request Activation" on an available feature to demonstrate institutional self-service.
7. Click **"Billing & Subscription"** (`/admin/billing`):
   - View current subscription validity, invoice history, and seat utilization.
8. Click **"Institution Settings"** (`/admin/settings`):
   - Show editable college metadata, approved domain filters (`bvmengineering.ac.in`), and department/branch curriculum configurations.

#### 🎙️ Voice-Over Script:
> *"Logging in as the College Administrator for Birla Vishvakarma Mahavidyalaya, we enter the institutional governance hub.*
>
> *The Admin Dashboard presents high-level institutional intelligence: overall placement percentages, active recruiters on campus, and department participation.*
>
> *The real-time Activities stream provides full operational transparency, showing every student application, drive creation, and TPO approval as it happens.*
>
> *Under User Management, administrators have full lifecycle control over students and staff. With our bulk CSV ingestion engine, an administrator can import thousands of student profiles with their academic records in a matter of seconds, eliminating manual data entry.*
>
> *The Modules tab empowers colleges to view their active subscription capabilities and directly request premium modules from platform operators.*
>
> *Finally, Institution Settings enables precise customization of campus departments, degree curricula, semester structures, and domain whitelisting."*

---

### Act 5: Training & Placement Officer (TPO) Command Suite
**Duration:** 14:00 – 20:30  
**Login:** `tpo@bvmengineering.ac.in` / `Password@123`  
**URL:** `/tpo`

#### 🎬 Screen Actions:
1. Log in as **TPO** (`tpo@bvmengineering.ac.in`).
2. **TPO Dashboard** (`/tpo/dashboard`):
   - Showcase KPI cards: *Active Placement Drives, Upcoming Interviews, Pending Fee Verifications, Live Tests Running*.
3. Click **"Manage Drives"** (`/tpo/drives`):
   - Show the drives catalog with status filters (*Active, Completed, Draft*).
   - Click **"+ Create New Drive"** to reveal the comprehensive modal:
     - Basic Info: Company Name (*"Google" / "TCS" / "L&T"*), Role, Job Description, Location, CTC/Stipend.
     - **Dynamic Eligibility Rules Engine:** Set Minimum CGPA (e.g. `7.5`), 10th/12th minimum percentage, Max Active Backlogs allowed (`0`), and eligible branch multi-select checkboxes.
     - Deadlines & Selection Rounds checklist. Click Save/Publish.
4. Click on an existing drive to open **TPO Drive Detail Page** (`/tpo/drives/:id`):
   - Show the recruitment pipeline stages: *Applied → Shortlisted → Online Test → Technical Interview → HR Round → Offered*.
   - Show the list of applied students. Click **"Download Master Excel"** to demonstrate instant shortlisted applicant export.
5. Click **"All Students"** (`/tpo/students`):
   - Demonstrate the student directory with multi-filters: by Department, CGPA threshold, and Placement Status (*Placed / Unplaced*).
6. Click **"Tests"** (`/tpo/tests`):
   - Show the Instant Screening Tests dashboard.
   - Click **"+ Create New Test"** (`/tpo/tests/create`):
     - Test Title, Duration (e.g., 30 mins), Passing Percentage, Proctoring Toggle (Webcam, Tab-switch detection).
     - Add Questions: MCQ builder with choices, marks, and explanation.
   - Return to test list, click on a completed test, and click **"Audit Violations"** (`/tpo/tests/attempts/:id/violations`):
     - Point out the proctoring log showing exact timestamps when students switched browser tabs or exited full-screen mode.
7. Click **"Fee Verification"** (`/tpo/fee-verification`):
   - Showcase the student fee receipt review queue.
   - Click an unverified receipt to open the split-screen view: original receipt preview on the left, and AI OCR-extracted fields (Student ID, Amount, Semester, Transaction Ref) on the right.
   - Click **"Approve Receipt"** with a confirmation toast.
8. Click **"Curriculum Resources"** (`/tpo/curriculum`):
   - Browse branch-wise semester subjects and upload syllabus blueprints or preparation resources.
9. Click **"Accreditation Reports"** (`/tpo/reports`):
   - Show automated generation of NAAC / NBA criteria tables, company visit summaries, and CTC distribution graphs with export options.
10. Click **"Contact Messages"** (`/tpo/contact-messages`):
    - View student query tickets and demonstrate the response workflow.

#### 🎙️ Voice-Over Script:
> *"Now we transition to the operational nerve center of campus placements: the Training & Placement Officer portal.*
>
> *The TPO Dashboard highlights urgent daily tasks: active campus drives, students pending fee verification, upcoming interview schedules, and screening tests.*
>
> *Creating a placement drive is where our automated eligibility engine proves invaluable. Instead of manually cross-referencing student records, the TPO defines strict criteria: minimum CGPA, maximum allowed backlogs, 10th and 12th cutoff scores, and eligible engineering departments. The moment this drive is published, the platform automatically evaluates every student in the university against these rules.*
>
> *Inside the Drive Management Pipeline, the TPO moves candidates seamlessly through selection rounds — from initial aptitude screening to final offer roll-out — with one-click export of interview-ready spreadsheets.*
>
> *For internal screening, the TPO can generate instant online tests with automated proctoring. As students take the test, the system records suspicious activity. Opening the Violation Audit Log reveals any unauthorized browser tab switches or full-screen exits, ensuring complete examination integrity.*
>
> *Another revolutionary feature is the Fee Verification Desk. Universities require confirmed enrollment fees before students can sit for placements. Our AI OCR engine parses uploaded fee receipts, extracts the transaction number, student ID, and fee amount, and presents a side-by-side comparison for instantaneous one-click verification.*
>
> *Furthermore, our Accreditation Reports module generates audit-ready NAAC and NBA documentation at the click of a button, saving placement offices hundreds of hours of manual compilation."*

---

### Act 6: Student Portal, Proctored Tests & AI Suite
**Duration:** 20:30 – 28:00  
**Login:** `student@bvmengineering.ac.in` / `Password@123`  
**URL:** `/student`

#### 🎬 Screen Actions:
1. Log in as **Student** (`student@bvmengineering.ac.in`).
2. **Student Dashboard** (`/student/dashboard`):
   - Highlight the **Live Career Readiness Score** (e.g., 78/100) with diagnostic breakdown.
   - Show the quick action cards, upcoming drive deadlines, and recent notifications.
3. Click **"Drives"** (`/student/drives`):
   - Show the drive listings. Point cursor to the **Eligibility Badges**:
     - On an eligible drive: Show green badge **"Eligible"** and click into **Drive Detail** (`/student/drives/:id`). Show the clean criteria checklist, CTC, Job Description, and click **"Apply Now"**.
     - On an ineligible drive: Show red badge **"Not Eligible"**, click it, and point out the exact criteria violation breakdown (e.g., *"Requires CGPA ≥ 8.0, your CGPA is 7.4"*).
4. Click **"Applications"** (`/student/applications`):
   - Show the Kanban tracking board displaying application stages (*Applied, Under Review, Interview Scheduled, Selected*).
5. Click **"Fee Receipt"** (`/student/fee-receipt`):
   - Demonstrate the drag-and-drop receipt uploader, file preview, and current verification status badge (*Pending / Verified*).
6. Click **"Tests"** (`/student/tests`):
   - Select an assigned screening test.
   - Show **Test Precheck Page** (`/student/tests/:id/precheck`): system checks for camera access, audio, and browser compatibility.
   - Enter **Test Attempt Page** (`/student/tests/:id/attempt`):
     - Show the clean examination cockpit: countdown timer, question palette with answered/unanswered indicators, single-choice and multiple-choice questions.
     - Simulate a tab switch or minimize action to show the **Proctoring Warning Alert** (*"Warning: Tab switch detected. This event has been logged for TPO review."*).
     - Click **"Submit Test"**.
   - Show **Test Results Page** (`/student/tests/:id/results`): Score breakdown, accuracy percentage, time taken per question, and conceptual explanations.
7. Click **"Resume Analyzer"** (`/student/resume`):
   - Upload a sample PDF resume.
   - Show the real-time AI ATS scoring gauge (e.g. `84/100`), parsed skills list, detected formatting flaws, and missing high-impact industry keywords.
8. Click **"Resume Enhancer"** (`/student/resume-enhancer`):
   - Show the side-by-side section rebuilder.
   - Demonstrate how the AI suggests stronger action verbs, quantified achievement statements, and customized bullet points for software engineering roles.
9. Click **"Weak Areas"** (`/student/weak-areas`):
   - Showcase the personalized diagnostic charts highlighting conceptual weaknesses based on past test and interview performances (e.g., *Dynamic Programming, DBMS Indexing*), with direct links to practice materials.
10. Click **"Resources"** (`/student/resources`):
    - Browse the study library with category tabs: Data Structures, Operating Systems, System Design, HR Interview Guides.
11. Click **"GATE & CAT Prep"** (`/student/gate-cat-prep`):
    - Show competitive exam roadmaps, previous year question banks, and chapter-wise mock tests.
12. Click **"Mock Interview"** (`/student/mock-interview`):
    - **Setup Page:** Configure an AI interview: Choose Role (*Full-Stack Developer*), Focus Area (*Data Structures & System Design*), and Experience Level.
    - Click **"Start Interview"** (`/student/mock-interview/:sessionId`):
      - Show the interactive conversational interface. The AI asks a realistic technical question. Type a response and submit.
      - Show the AI providing immediate constructive feedback before moving to the next question.
    - Click **"End & View Analysis"** (`/student/mock-interview/:sessionId/result`):
      - Showcase the comprehensive post-interview feedback report: Technical Accuracy score, Communication Clarity score, Strengths, Weaknesses, and tailored learning recommendations.
13. Click **"Profile"** (`/student/profile`):
    - Show the comprehensive academic record (CGPA, 10th/12th, backlogs, projects, links to GitHub/LinkedIn). Show the **Change Password** security interface.

#### 🎙️ Voice-Over Script:
> *"Finally, we arrive at the heart of the candidate journey: the Student Experience.*
>
> *Upon logging in, students are greeted by a personalized dashboard featuring their real-time Career Readiness Score, upcoming drive deadlines, and personalized recommendations.*
>
> *When browsing campus drives, our instant eligibility engine eliminates guesswork. For every drive, students see an immediate status. If eligible, they can review the recruitment criteria and submit their application with one click. If ineligible, the system transparently highlights the exact parameter shortfall — whether it is a CGPA cutoff, backlog restriction, or branch requirement.*
>
> *The Applications Tracker provides clear visibility across every selection round, while the Fee Receipt portal allows students to upload their semester proofs for automated verification.*
>
> *When an online test is scheduled, students enter our secure assessment suite. After completing pre-test system diagnostics, the examination runs in a distraction-free interface with a live question navigation grid and timer. If a student attempts to switch tabs or exit fullscreen, our proctoring subsystem immediately flags the infraction and logs it directly to the TPO's audit board. Upon submission, students receive rich analytics with question-by-question explanations.*
>
> *Beyond assessments, our built-in AI career acceleration suite sets this portal apart.*
>
> *The AI Resume Analyzer scans student CVs against ATS algorithms, scoring formatting, keyword density, and structural integrity. The Resume Enhancer takes this a step further, rebuilding bullet points with quantified metrics and high-impact action verbs.*
>
> *The Weak Areas diagnostic module aggregates performance across tests and highlights specific knowledge gaps, directing students to our curated Resources Library and GATE & CAT preparation materials.*
>
> *And for interview preparation, our AI Mock Interview simulator conducts dynamic, real-time conversational interviews across technical and behavioral domains, concluding with an in-depth scorecard evaluating technical accuracy, communication competence, and actionable next steps.*
>
> *From first registration to final offer letter, students are equipped with world-class tools to secure their dream careers."*

---

### Act 7: Conclusion & Platform Vision
**Duration:** 28:00 – 29:30  
**URL:** Back to Landing Page or SuperAdmin Dashboard

#### 🎬 Screen Actions:
1. Return smoothly to the Landing Page hero section.
2. Slowly pan or scroll across the top navigation and statistics counter.
3. Bring up a clean slide or modal showcasing the technology stack: *React, Vite, Tailwind CSS, Framer Motion, FastAPI, PostgreSQL, Groq AI LLM, Razorpay, Tavily Search*.
4. Conclude on the branded logo with contact details.

#### 🎙️ Voice-Over Script:
> *"In summary, the Placement Portal is far more than a job board — it is a complete, scalable, and intelligent campus recruitment operating system.*
>
> *By combining multi-tenant institutional isolation, automated eligibility gating, AI-driven mock interviews and resume optimization, proctored testing, and comprehensive accreditation reporting, this platform bridges the critical gap between academia and industry.*
>
> *Built on a modern high-performance architecture utilizing React, FastAPI, PostgreSQL, and Groq-accelerated intelligence, it delivers unprecedented speed, security, and aesthetic excellence.*
>
> *Thank you for watching this full demonstration of the Placement Portal. For institution onboarding or demonstrations, contact our team today."*

---

## 5. Voice-Over Recording & Audio Styling Guidelines

### A. Tone & Delivery
- **Tone:** Confident, professional, clear, articulate, and enthusiastic.
- **Pacing:** 130–145 words per minute. Avoid rushing through technical terms like *Multi-tenant*, *Proctoring*, *ATS Scoring*, and *Accreditation*.
- **Pauses:** Leave a 1.5-second breath before transitioning to a new route or opening a modal.

### B. AI Voice Generation (Optional Alternative)
If generating the voice-over using an AI speech tool (e.g., **ElevenLabs**, **OpenAI Audio**, or **WellSaid Labs**):
- **Voice Recommendation:** "Adam" or "Marcus" (Deep, authoritative, corporate American/Neutral English) or "Sarah" (Crisp, engaging corporate).
- **Stability:** 65% (maintains natural cadence without sounding robotic).
- **Clarity / Similarity:** 80%.

---

## 6. Post-Production, Stitching & Export Guide

### A. Step-by-Step Assembly
1. **Record the 6 Core Acts:** Capture each act as a clean 1080p 60fps MP4 recording.
2. **Import into Video Editor:** Load the screen clips into **CapCut**, **DaVinci Resolve**, or **Premiere Pro**.
3. **Align Audio Voice-Over:** Align the corresponding narration script with the on-screen actions. Use slight video speed ramps (1.1x–1.2x) on long form-filling sections to keep the video snappy and dynamic.
4. **Add Visual Callouts & Zoom:**
   - Add subtle zoom-in (115%) when showcasing important data (e.g., *Proctoring Violation Alert*, *ATS Resume Score*, *Razorpay Modal*, *Eligibility Badge*).
   - Add elegant lower-third captions indicating the current Role:
     - `[SUPERADMIN] Command Deck Console`
     - `[COLLEGE ADMIN] Institutional Governance`
     - `[TPO] Placement Drive & Test Management`
     - `[STUDENT] Career Preparation & AI Tools`
5. **Background Music:**
   - Use a soft, modern ambient corporate tech track (lo-fi tech beat or corporate acoustic piano).
   - Set music volume at **-24 dB to -28 dB** under the voiceover track.
6. **Export Specs:**
   - Container: MP4 (H.264 / AAC)
   - Resolution: 1920 × 1080
   - Bitrate: 15 Mbps VBR 2-pass
   - Audio: Stereo 320 kbps, 48 kHz.

---
*Created for the 7th Semester B.Tech Project — Placement Portal Ecosystem.*
