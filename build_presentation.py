"""
Builds the Mid-Semester Project Presentation in the 1960s Swiss 'Basel' theme.
Outputs:
  - Placement_Portal_MidSem_Presentation.pptx (14 Slides total, 2 features per page for implemented modules)
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ── Color Palette (1960s Swiss 'Basel' Theme) ──
COLOR_BG = RGBColor(244, 241, 234)       # #F4F1EA Warm Off-White
COLOR_BLACK = RGBColor(17, 17, 17)       # #111111 Near-Black
COLOR_RED = RGBColor(227, 34, 19)        # #E32213 Swiss Red
COLOR_GRID = RGBColor(220, 216, 206)     # #DCD8CE Warm Gray
COLOR_MUTED = RGBColor(115, 110, 102)    # #736E66 Muted Text
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_CARD_BG = RGBColor(250, 248, 244)  # Very subtle card background

FONT_FAMILY = "Archivo"
FALLBACK_FONT = "Helvetica"

WORKSPACE = r"c:\Users\DC\OneDrive\Desktop\practice\7th sem project\7th-sem-project"
ASSETS_DIR = os.path.join(WORKSPACE, "presentation_assets")
OUTPUT_PPTX = os.path.join(WORKSPACE, "Placement_Portal_MidSem_Presentation.pptx")
TOTAL_SLIDES = 14


def set_slide_background(slide, prs, color):
    """Sets a solid colored background rectangle covering the entire slide."""
    bg_shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = color
    bg_shape.line.fill.background()
    return bg_shape


def add_swiss_header(slide, slide_num, total_slides=TOTAL_SLIDES, section_name="MID-SEM PROJECT REVIEW"):
    """Draws the 3px black rule across the top of the slide carrying uppercase metadata."""
    # 3px top black rule
    rule = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.42), Inches(11.733), Pt(3)
    )
    rule.fill.solid()
    rule.fill.fore_color.rgb = COLOR_BLACK
    rule.line.fill.background()

    # Left metadata text
    tx_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.18), Inches(8.0), Inches(0.3))
    tf = tx_box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.text = f"BVM ENGINEERING COLLEGE  //  IT DEPARTMENT  //  {section_name}"
    p.font.name = FONT_FAMILY
    p.font.size = Pt(8.5)
    p.font.bold = True
    p.font.color.rgb = COLOR_MUTED

    # Right metadata text (slide number)
    tx_box_r = slide.shapes.add_textbox(Inches(9.533), Inches(0.18), Inches(3.0), Inches(0.3))
    tf_r = tx_box_r.text_frame
    tf_r.word_wrap = True
    tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0
    p_r = tf_r.paragraphs[0]
    p_r.alignment = PP_ALIGN.RIGHT
    p_r.text = f"SLIDE  {slide_num:02d} / {total_slides:02d}"
    p_r.font.name = FONT_FAMILY
    p_r.font.size = Pt(8.5)
    p_r.font.bold = True
    p_r.font.color.rgb = COLOR_BLACK


def add_swiss_grid(slide, prs):
    """Draws thin warm-gray vertical lines separating the 3 visual columns."""
    col_w = Inches(3.911)
    for i in [1, 2]:
        x = Inches(0.8) + i * col_w
        line = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, x, Inches(0.55), Pt(0.75), Inches(6.5)
        )
        line.fill.solid()
        line.fill.fore_color.rgb = COLOR_GRID
        line.line.fill.background()


def add_swiss_red_square(slide, left, top, size=Pt(12)):
    """Draws the single Swiss red accent square on the slide."""
    sq = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, size, size)
    sq.fill.solid()
    sq.fill.fore_color.rgb = COLOR_RED
    sq.line.fill.background()
    return sq


def add_two_modules_slide(prs, slide_num, total_slides, headline, mod_left, mod_right):
    """
    Renders TWO complete modules side-by-side on a single 16:9 widescreen slide.
    Maintains the 1960s Swiss 'Basel' aesthetic with crisp borders, metadata tags,
    video evidence captures, and technical architecture specs.
    """
    blank_layout = prs.slide_layouts[6]
    s = prs.slides.add_slide(blank_layout)
    set_slide_background(s, prs, COLOR_BG)
    add_swiss_header(s, slide_num, total_slides, "SECTION 02 // IMPLEMENTED MODULES")

    # Red accent square at top left of headline
    add_swiss_red_square(s, Inches(0.8), Inches(0.74), Pt(10))

    # Slide main headline
    tb_h = s.shapes.add_textbox(Inches(1.05), Inches(0.66), Inches(11.0), Inches(0.55))
    tf_h = tb_h.text_frame
    tf_h.word_wrap = True
    tf_h.margin_left = tf_h.margin_top = tf_h.margin_right = tf_h.margin_bottom = 0
    p_h = tf_h.paragraphs[0]
    p_h.text = headline
    p_h.font.name = FONT_FAMILY
    p_h.font.size = Pt(24)
    p_h.font.bold = True
    p_h.font.color.rgb = COLOR_BLACK

    # Central vertical Swiss grid line separating the two module columns
    mid_x = Inches(6.666)
    divider = s.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, mid_x, Inches(1.30), Pt(0.75), Inches(5.80)
    )
    divider.fill.solid()
    divider.fill.fore_color.rgb = COLOR_GRID
    divider.line.fill.background()

    # Column specifications: Left and Right
    col_width = Inches(5.50)
    columns = [
        (Inches(0.8), col_width, mod_left),
        (Inches(7.033), col_width, mod_right),
    ]

    for col_left, width, m in columns:
        # 1. Module Title Box (Eyebrow + Title + Subtitle)
        tb_t = s.shapes.add_textbox(col_left, Inches(1.30), width, Inches(0.78))
        tf_t = tb_t.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0

        p_tag = tf_t.paragraphs[0]
        p_tag.text = f"MODULE {m['module_num']}  //  {m['category'].upper()}"
        p_tag.font.name = FONT_FAMILY
        p_tag.font.size = Pt(8.5)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_RED

        p_title = tf_t.add_paragraph()
        p_title.text = m["headline"]
        p_title.font.name = FONT_FAMILY
        p_title.font.size = Pt(13.5)
        p_title.font.bold = True
        p_title.font.color.rgb = COLOR_BLACK

        p_sub = tf_t.add_paragraph()
        p_sub.text = m["subhead"]
        p_sub.font.name = FONT_FAMILY
        p_sub.font.size = Pt(8.5)
        p_sub.font.color.rgb = COLOR_MUTED

        # 2. Image (16:9 ratio, 5.50" x 3.09375")
        img_path = os.path.join(ASSETS_DIR, m["image_file"])
        if os.path.exists(img_path):
            img_left = col_left
            img_top = Inches(2.15)
            img_w = width
            img_h = Inches(3.09375)

            # Crisp black border
            border = s.shapes.add_shape(
                MSO_SHAPE.RECTANGLE,
                img_left - Pt(1.5),
                img_top - Pt(1.5),
                img_w + Pt(3),
                img_h + Pt(3)
            )
            border.fill.solid()
            border.fill.fore_color.rgb = COLOR_BLACK
            border.line.fill.background()

            s.shapes.add_picture(img_path, img_left, img_top, img_w, img_h)

        # 3. Caption Box below image
        tb_cap = s.shapes.add_textbox(col_left, Inches(5.27), width, Inches(0.35))
        tf_cap = tb_cap.text_frame
        tf_cap.word_wrap = True
        tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0

        p_cap = tf_cap.paragraphs[0]
        p_cap.text = f"EVIDENCE [DEMO VIDEO] — {m['caption_tag']}"
        p_cap.font.name = FONT_FAMILY
        p_cap.font.size = Pt(8.0)
        p_cap.font.bold = True
        p_cap.font.color.rgb = COLOR_RED

        p_tech = tf_cap.add_paragraph()
        p_tech.text = m["tech_specs"]
        p_tech.font.name = FONT_FAMILY
        p_tech.font.size = Pt(7.5)
        p_tech.font.color.rgb = COLOR_MUTED

        # 4. Selling Points Box
        tb_pts = s.shapes.add_textbox(col_left, Inches(5.65), width, Inches(1.50))
        tf_pts = tb_pts.text_frame
        tf_pts.word_wrap = True
        tf_pts.margin_left = tf_pts.margin_top = tf_pts.margin_right = tf_pts.margin_bottom = 0

        for pt_idx, (pt_title, pt_desc) in enumerate(m["selling_points"]):
            p_pt = tf_pts.paragraphs[0] if (pt_idx == 0 and not tf_pts.paragraphs[0].text) else tf_pts.add_paragraph()

            run_b = p_pt.add_run()
            run_b.text = f"■  {pt_title}: "
            run_b.font.name = FONT_FAMILY
            run_b.font.size = Pt(8.5)
            run_b.font.bold = True
            run_b.font.color.rgb = COLOR_BLACK

            run_d = p_pt.add_run()
            run_d.text = pt_desc
            run_d.font.name = FONT_FAMILY
            run_d.font.size = Pt(8.5)
            run_d.font.bold = False
            run_d.font.color.rgb = COLOR_MUTED

    return s


def create_presentation():
    prs = Presentation()
    # 16:9 widescreen dimensions (13.333 x 7.5 inches)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # =========================================================================
    # SLIDE 1: Title Slide (Basel Style)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1, prs, COLOR_BG)
    add_swiss_header(s1, 1, TOTAL_SLIDES, "ACADEMIC YEAR 2026-27")
    add_swiss_grid(s1, prs)

    # Red accent square at top left
    add_swiss_red_square(s1, Inches(0.8), Inches(0.75), Pt(14))

    # Eyebrow metadata
    tb_meta = s1.shapes.add_textbox(Inches(1.1), Inches(0.72), Inches(10.0), Inches(0.35))
    tf_meta = tb_meta.text_frame
    tf_meta.word_wrap = True
    p_meta = tf_meta.paragraphs[0]
    p_meta.text = "BIRLA VISHVAKARMA MAHAVIDYALAYA (ENGINEERING COLLEGE) · AN AUTONOMOUS INSTITUTION"
    p_meta.font.name = FONT_FAMILY
    p_meta.font.size = Pt(9.5)
    p_meta.font.bold = True
    p_meta.font.color.rgb = COLOR_MUTED

    # Giant Swiss headline (lowercase, tight grotesque)
    tb_title = s1.shapes.add_textbox(Inches(0.8), Inches(1.15), Inches(11.733), Inches(2.3))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    p_t1 = tf_title.paragraphs[0]
    p_t1.text = "ai-powered smart placement &"
    p_t1.font.name = FONT_FAMILY
    p_t1.font.size = Pt(44)
    p_t1.font.bold = True
    p_t1.font.color.rgb = COLOR_BLACK

    p_t2 = tf_title.add_paragraph()
    p_t2.text = "career preparation portal."
    p_t2.font.name = FONT_FAMILY
    p_t2.font.size = Pt(44)
    p_t2.font.bold = True
    p_t2.font.color.rgb = COLOR_BLACK

    # Subtitle / description bar
    tb_sub = s1.shapes.add_textbox(Inches(0.8), Inches(3.6), Inches(11.733), Inches(0.7))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    p_s = tf_sub.paragraphs[0]
    p_s.text = "mid-semester project evaluation — 7th semester b.tech information technology"
    p_s.font.name = FONT_FAMILY
    p_s.font.size = Pt(13)
    p_s.font.bold = True
    p_s.font.color.rgb = COLOR_RED

    p_s2 = tf_sub.add_paragraph()
    p_s2.text = "An enterprise multi-tenant recruitment operating system featuring automated institutional onboarding, Groq AI syllabus curation, turn-by-turn mock interviews, and ATS resume engineering."
    p_s2.font.name = FONT_FAMILY
    p_s2.font.size = Pt(11)
    p_s2.font.color.rgb = COLOR_MUTED

    # 3 Bottom Columns: Project Group, Faculty Guide, Institutional Context
    tb_c1 = s1.shapes.add_textbox(Inches(0.8), Inches(4.7), Inches(3.7), Inches(2.2))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True
    p_c1_h = tf_c1.paragraphs[0]
    p_c1_h.text = "PROJECT TEAM (GROUP-2)"
    p_c1_h.font.name = FONT_FAMILY
    p_c1_h.font.size = Pt(10)
    p_c1_h.font.bold = True
    p_c1_h.font.color.rgb = COLOR_BLACK

    members = [
        ("Pratham Raval", "23IT449"),
        ("Prit Patel", "23IT408"),
        ("Yashvi Chauhan", "23IT447"),
    ]
    for name, roll in members:
        p_m = tf_c1.add_paragraph()
        p_m.text = f"•  {name}  [{roll}]"
        p_m.font.name = FONT_FAMILY
        p_m.font.size = Pt(11)
        p_m.font.color.rgb = COLOR_BLACK

    # Column 2: Faculty Guide
    tb_c2 = s1.shapes.add_textbox(Inches(4.711), Inches(4.7), Inches(3.7), Inches(2.2))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True
    p_c2_h = tf_c2.paragraphs[0]
    p_c2_h.text = "FACULTY GUIDE"
    p_c2_h.font.name = FONT_FAMILY
    p_c2_h.font.size = Pt(10)
    p_c2_h.font.bold = True
    p_c2_h.font.color.rgb = COLOR_BLACK

    p_g1 = tf_c2.add_paragraph()
    p_g1.text = "Dr. Dharmesh G. Patel"
    p_g1.font.name = FONT_FAMILY
    p_g1.font.size = Pt(12)
    p_g1.font.bold = True
    p_g1.font.color.rgb = COLOR_BLACK

    p_g2 = tf_c2.add_paragraph()
    p_g2.text = "Associate Professor, IT Department\nBirla Vishvakarma Mahavidyalaya"
    p_g2.font.name = FONT_FAMILY
    p_g2.font.size = Pt(10)
    p_g2.font.color.rgb = COLOR_MUTED

    # Column 3: Institutional Details
    tb_c3 = s1.shapes.add_textbox(Inches(8.622), Inches(4.7), Inches(3.7), Inches(2.2))
    tf_c3 = tb_c3.text_frame
    tf_c3.word_wrap = True
    p_c3_h = tf_c3.paragraphs[0]
    p_c3_h.text = "DEPARTMENT & GOVERNANCE"
    p_c3_h.font.name = FONT_FAMILY
    p_c3_h.font.size = Pt(10)
    p_c3_h.font.bold = True
    p_c3_h.font.color.rgb = COLOR_BLACK

    p_i1 = tf_c3.add_paragraph()
    p_i1.text = "Information Technology Department\nManaged by Charutar Vidya Mandal (CVM)\nVallabh Vidyanagar, Gujarat"
    p_i1.font.name = FONT_FAMILY
    p_i1.font.size = Pt(10.5)
    p_i1.font.color.rgb = COLOR_MUTED

    # =========================================================================
    # SLIDE 2: Section Break 01 (Black Slide)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2, prs, COLOR_BLACK)

    # Giant white numeral
    tb_num = s2.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(3.5), Inches(2.5))
    tf_num = tb_num.text_frame
    p_n = tf_num.paragraphs[0]
    p_n.text = "01"
    p_n.font.name = FONT_FAMILY
    p_n.font.size = Pt(100)
    p_n.font.bold = True
    p_n.font.color.rgb = COLOR_WHITE

    # One red bar
    red_bar = s2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(3.8), Inches(1.8), Pt(6))
    red_bar.fill.solid()
    red_bar.fill.fore_color.rgb = COLOR_RED
    red_bar.line.fill.background()

    # Section title in white
    tb_stitle = s2.shapes.add_textbox(Inches(0.8), Inches(4.2), Inches(11.0), Inches(2.0))
    tf_stitle = tb_stitle.text_frame
    p_st = tf_stitle.paragraphs[0]
    p_st.text = "project orientation."
    p_st.font.name = FONT_FAMILY
    p_st.font.size = Pt(40)
    p_st.font.bold = True
    p_st.font.color.rgb = COLOR_WHITE

    p_st_sub = tf_stitle.add_paragraph()
    p_st_sub.text = "Executive outline, problem definition, and multi-tenant architectural scope."
    p_st_sub.font.name = FONT_FAMILY
    p_st_sub.font.size = Pt(14)
    p_st_sub.font.color.rgb = RGBColor(180, 180, 180)

    # =========================================================================
    # SLIDE 3: Mid-Semester Presentation Outline
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3, prs, COLOR_BG)
    add_swiss_header(s3, 3, TOTAL_SLIDES, "AGENDA & ROADMAP")
    add_swiss_grid(s3, prs)
    add_swiss_red_square(s3, Inches(0.8), Inches(0.8), Pt(10))

    # Headline
    tb_h3 = s3.shapes.add_textbox(Inches(1.05), Inches(0.72), Inches(11.0), Inches(0.8))
    tf_h3 = tb_h3.text_frame
    p_h3 = tf_h3.paragraphs[0]
    p_h3.text = "presentation outline."
    p_h3.font.name = FONT_FAMILY
    p_h3.font.size = Pt(30)
    p_h3.font.bold = True
    p_h3.font.color.rgb = COLOR_BLACK

    # 3 Column Structured Agenda
    agenda_cols = [
        ("01 / FOUNDATIONS", [
            ("Project Definition", "Transformation of fragmented manual placement drives into orchestrated intelligence."),
            ("Problem Statement", "Eliminating spreadsheet silos, delayed eligibility checks, and unstandardized resume reviews."),
            ("Stakeholder Scope", "Seamless coexistence of SuperAdmin, College Admin, TPO, and Student personas."),
        ]),
        ("02 / IMPLEMENTED MODULES", [
            ("Admin Onboarding & Licensing", "Domain-gated signup, Razorpay SaaS checkout, and setup checklist."),
            ("Governance & Custom Features", "9-department curriculum, Fee OCR templates, and custom proposal pipelines."),
            ("SuperAdmin Command Deck", "Multi-tenant directory, modular feature toggles, and platform telemetry."),
            ("Student AI Prep & Testing", "Live TCS drive matching, AI mock interviews, ATS resume enhancer, and study curation."),
        ]),
        ("03 / FUTURE & DEMO", [
            ("Video Demonstration", "Walkthrough of live recording capturing all verified production workflows."),
            ("Features Yet to Implement", "Fee-verified drive application gate, accreditation reports, and proctoring upgrades."),
            ("Mid-Sem Status Matrix", "Evaluation of current progress against final semester deliverables."),
        ]),
    ]

    col_xs = [Inches(0.8), Inches(4.711), Inches(8.622)]
    for idx, (col_title, items) in enumerate(agenda_cols):
        cx = col_xs[idx]
        tb = s3.shapes.add_textbox(cx, Inches(1.8), Inches(3.7), Inches(5.2))
        tf = tb.text_frame
        tf.word_wrap = True

        p_head = tf.paragraphs[0]
        p_head.text = col_title
        p_head.font.name = FONT_FAMILY
        p_head.font.size = Pt(11)
        p_head.font.bold = True
        p_head.font.color.rgb = COLOR_RED if idx == 1 else COLOR_BLACK

        for it_title, it_desc in items:
            p_t = tf.add_paragraph()
            p_t.text = f"\n{it_title}"
            p_t.font.name = FONT_FAMILY
            p_t.font.size = Pt(12)
            p_t.font.bold = True
            p_t.font.color.rgb = COLOR_BLACK

            p_d = tf.add_paragraph()
            p_d.text = it_desc
            p_d.font.name = FONT_FAMILY
            p_d.font.size = Pt(9.5)
            p_d.font.color.rgb = COLOR_MUTED

    # =========================================================================
    # SLIDE 4: Project Definition & Core Scope
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4, prs, COLOR_BG)
    add_swiss_header(s4, 4, TOTAL_SLIDES, "DEFINITION & ARCHITECTURAL SCOPE")
    add_swiss_grid(s4, prs)
    add_swiss_red_square(s4, Inches(0.8), Inches(0.8), Pt(10))

    # Headline
    tb_h4 = s4.shapes.add_textbox(Inches(1.05), Inches(0.72), Inches(11.0), Inches(0.8))
    tf_h4 = tb_h4.text_frame
    p_h4 = tf_h4.paragraphs[0]
    p_h4.text = "definition & scope."
    p_h4.font.name = FONT_FAMILY
    p_h4.font.size = Pt(30)
    p_h4.font.bold = True
    p_h4.font.color.rgb = COLOR_BLACK

    # Top Hero Definition Box
    def_box = s4.shapes.add_textbox(Inches(0.8), Inches(1.65), Inches(11.733), Inches(1.1))
    tf_def = def_box.text_frame
    tf_def.word_wrap = True
    p_def = tf_def.paragraphs[0]
    p_def.text = "A centralized multi-tenant digital ecosystem that automates the entire campus recruitment lifecycle — from college onboarding and verified eligibility gating to curriculum-grounded study curation, proctored instant assessments, and generative AI interview simulations."
    p_def.font.name = FONT_FAMILY
    p_def.font.size = Pt(13.5)
    p_def.font.color.rgb = COLOR_BLACK

    # 3 Columns: 3 Connected Stakeholders
    scope_cards = [
        ("COLLEGE ADMIN & TPO", [
            ("Institutional SaaS Setup", "Domain whitelisting, Razorpay license activation, setup checklist."),
            ("Departmental Governance", "Dynamic 9-department curriculum catalog, fee receipt OCR templates."),
            ("Drive Pipeline Control", "Dynamic multi-criteria eligibility filters, real-time applicant shortlists."),
            ("Resource Curation", "AI-driven extraction of syllabus PDFs into verified learning materials."),
        ]),
        ("STUDENT CANDIDATES", [
            ("Real-Time Drive Matching", "Instant eligibility badging with transparent shortfall breakdown."),
            ("Turn-by-Turn AI Mock Prep", "10-question behavioral, technical, and coding interviews with live critiques."),
            ("ATS Resume Engineering", "Live scoring (78/100), 8 detected skill gaps, and quantified project rebuilder."),
            ("Diagnostic Weak Areas", "Automated tracking across assessments in Java, Data Structures, and SQL."),
        ]),
        ("SUPERADMIN PLATFORM", [
            ("Multi-Tenant Governance", "Global university directory, domain authorization, and quota limits."),
            ("Modular Feature Catalog", "Selective activation of premium add-ons with single-click toggle."),
            ("Collaborative Proposals", "Two-way feedback loop for custom campus feature requests."),
            ("System Telemetry & Audit", "Platform revenue tracking, immutable audit trails, and global broadcasts."),
        ]),
    ]

    for idx, (role_title, bullets) in enumerate(scope_cards):
        cx = col_xs[idx]
        tb = s4.shapes.add_textbox(cx, Inches(3.0), Inches(3.7), Inches(4.0))
        tf = tb.text_frame
        tf.word_wrap = True

        p_rh = tf.paragraphs[0]
        p_rh.text = role_title
        p_rh.font.name = FONT_FAMILY
        p_rh.font.size = Pt(11)
        p_rh.font.bold = True
        p_rh.font.color.rgb = COLOR_RED if idx == 0 else COLOR_BLACK

        for b_title, b_desc in bullets:
            p_bt = tf.add_paragraph()
            p_bt.text = f"\n• {b_title}"
            p_bt.font.name = FONT_FAMILY
            p_bt.font.size = Pt(10.5)
            p_bt.font.bold = True
            p_bt.font.color.rgb = COLOR_BLACK

            p_bd = tf.add_paragraph()
            p_bd.text = f"   {b_desc}"
            p_bd.font.name = FONT_FAMILY
            p_bd.font.size = Pt(9.5)
            p_bd.font.color.rgb = COLOR_MUTED

    # =========================================================================
    # SLIDE 5: Section Break 02 (Black Slide)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5, prs, COLOR_BLACK)

    tb_num5 = s5.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(3.5), Inches(2.5))
    tf_num5 = tb_num5.text_frame
    p_n5 = tf_num5.paragraphs[0]
    p_n5.text = "02"
    p_n5.font.name = FONT_FAMILY
    p_n5.font.size = Pt(100)
    p_n5.font.bold = True
    p_n5.font.color.rgb = COLOR_WHITE

    red_bar5 = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(3.8), Inches(1.8), Pt(6))
    red_bar5.fill.solid()
    red_bar5.fill.fore_color.rgb = COLOR_RED
    red_bar5.line.fill.background()

    tb_stitle5 = s5.shapes.add_textbox(Inches(0.8), Inches(4.2), Inches(11.0), Inches(2.0))
    tf_stitle5 = tb_stitle5.text_frame
    p_st5 = tf_stitle5.paragraphs[0]
    p_st5.text = "implemented modules."
    p_st5.font.name = FONT_FAMILY
    p_st5.font.size = Pt(40)
    p_st5.font.bold = True
    p_st5.font.color.rgb = COLOR_WHITE

    p_st5_sub = tf_stitle5.add_paragraph()
    p_st5_sub.text = "Detailed functional breakdown with 2 core features per page and live video demonstration evidence."
    p_st5_sub.font.name = FONT_FAMILY
    p_st5_sub.font.size = Pt(14)
    p_st5_sub.font.color.rgb = RGBColor(180, 180, 180)

    # =========================================================================
    # SLIDE 6: Modules 01 & 02 — Campus Onboarding & College Governance
    # =========================================================================
    mod1 = {
        "module_num": "01",
        "category": "Campus Onboarding",
        "headline": "Admin Onboarding & SaaS Licensing",
        "subhead": "Official campus domain gating, integrated Razorpay checkout, and setup wizard.",
        "image_file": "02_razorpay_license_checkout.png",
        "caption_tag": "Razorpay Checkout Modal & Checklist",
        "tech_specs": "FastAPI · SQLAlchemy ORM · Razorpay Checkout API · Multi-Tenant Isolation",
        "selling_points": [
            ("Campus Domain Gating", "Prevents generic emails; colleges register with verified domains (e.g., bvmengineering.ac.in)."),
            ("Razorpay SaaS Checkout", "Direct subscription for ₹10,000/mo Campus Standard License with automated webhooks."),
            ("4-Step Setup Checklist", "Guides administrators through domain validation, TPO setup, and role activation."),
        ],
    }
    mod2 = {
        "module_num": "02",
        "category": "Campus Governance",
        "headline": "College Admin Governance Hub",
        "subhead": "Management of 9 academic departments, fee OCR standards, and billing transparency.",
        "image_file": "04_admin_branches_curriculum.png",
        "caption_tag": "Departmental Architecture & Curriculum",
        "tech_specs": "PostgreSQL · FastAPI Subscriptions · Alembic Migrations · BVM Schemas",
        "selling_points": [
            ("9-Department Directory", "Standardizes all campus branches (Civil, Mech, Comp, IT, EC, EE, etc.) for drive filtering."),
            ("Curriculum Ingestion Engine", "Uploads official university syllabus blueprints with confirmed 22 core subjects."),
            ("Fee OCR & Billing Ledger", "Multi-template receipt standards with 30-day billing cycle countdown and invoice logs."),
        ],
    }
    add_two_modules_slide(
        prs,
        slide_num=6,
        total_slides=TOTAL_SLIDES,
        headline="modules 01 & 02: campus onboarding & governance.",
        mod_left=mod1,
        mod_right=mod2,
    )

    # =========================================================================
    # SLIDE 7: Modules 03 & 04 — Custom Proposals & SuperAdmin Command Deck
    # =========================================================================
    mod3 = {
        "module_num": "03",
        "category": "Collaborative Engineering",
        "headline": "Custom Feature Proposal Pipeline",
        "subhead": "Bi-directional collaborative engineering roadmap between College Admins and SuperAdmin.",
        "image_file": "09_custom_feature_request_modal.png",
        "caption_tag": "Interactive Proposal Modal & Dialogue",
        "tech_specs": "Alembic h5c6d7e8f9a0 · CustomFeatureRequest Model · Reactive SuperAdmin Store",
        "selling_points": [
            ("Structured Proposal Modal", "College admins submit bespoke requests specifying Target Persona, Category, and Urgency."),
            ("Engineering Rationale Pipeline", "Detailed business and technical justifications route immediately to SuperAdmin console."),
            ("Real-Time Status Tracking", "Proposals advance transparently from Under Review to In Progress or Completed."),
        ],
    }
    mod4 = {
        "module_num": "04",
        "category": "Platform Oversight",
        "headline": "SuperAdmin Command Center",
        "subhead": "Multi-tenant institutional governance, modular feature catalog toggles, and platform telemetry.",
        "image_file": "10_superadmin_custom_proposals.png",
        "caption_tag": "Global Multi-Tenant Administration Console",
        "tech_specs": "JWT SuperAdmin Guards · Cross-Tenant Checks · Real-Time Telemetry",
        "selling_points": [
            ("Cross-Campus Directory", "Centralized audit cockpit for all institutions with domain filters and quota limits."),
            ("Modular Feature Toggles", "One-click activation of optional platform extensions (Instant Tests, AI Interviews) per college."),
            ("Global Broadcast Center", "Push notifications dispatched system-wide across all connected campus dashboards."),
        ],
    }
    add_two_modules_slide(
        prs,
        slide_num=7,
        total_slides=TOTAL_SLIDES,
        headline="modules 03 & 04: custom proposals & superadmin command.",
        mod_left=mod3,
        mod_right=mod4,
    )

    # =========================================================================
    # SLIDE 8: Modules 05 & 06 — Placement Drives & Skill Diagnostics
    # =========================================================================
    mod5 = {
        "module_num": "05",
        "category": "Recruitment Pipeline",
        "headline": "Placement Drives & Eligibility Engine",
        "subhead": "Automated multi-criteria matching, instant compensation breakdown, and one-click application.",
        "image_file": "15_student_dashboard_placement_drives.png",
        "caption_tag": "Live TCS Drive Matching (₹3.4 - ₹10 LPA)",
        "tech_specs": "Eligibility Engine · Unique Application Constraint · Role Authorization",
        "selling_points": [
            ("Verified Drive Opportunities", "Live campus drives with transparent salary breakdowns (₹3.4 - ₹10 LPA) and bond terms."),
            ("Automated Eligibility Checks", "Real-time evaluation across CGPA, active backlogs, 10th/12th cutoffs, and branch."),
            ("Placement Lock Protection", "Prevents offer holders from blocking slots unless granted TPO dream override."),
        ],
    }
    mod6 = {
        "module_num": "06",
        "category": "Student Analytics",
        "headline": "Skill Diagnostics & Weak Areas",
        "subhead": "Automated aggregation of candidate performance shortfalls across assessments and mock interviews.",
        "image_file": "17_student_weak_areas_diagnostics.png",
        "caption_tag": "Recurring Weakness Aggregator (Java / DSA)",
        "tech_specs": "Diagnostic Analytics Engine · Performance Aggregator · Targeted Practice Routing",
        "selling_points": [
            ("Aggregated Shortfalls", "Tracks error patterns across practice assessments, test screenings, and mock interviews."),
            ("Recurring Weakness Detection", "Flags persistent knowledge gaps (2+ occurrences) across Java, Algorithms, and SQL."),
            ("Direct 'Practice This' Drills", "One-click deep links directing students directly to remedial quiz questions."),
        ],
    }
    add_two_modules_slide(
        prs,
        slide_num=8,
        total_slides=TOTAL_SLIDES,
        headline="modules 05 & 06: placement drives & skill diagnostics.",
        mod_left=mod5,
        mod_right=mod6,
    )

    # =========================================================================
    # SLIDE 9: Modules 07 & 08 — AI Study Resources & AI Mock Interview
    # =========================================================================
    mod7 = {
        "module_num": "07",
        "category": "AI Curation",
        "headline": "AI Curriculum Study Resources",
        "subhead": "Groq AI syllabus parsing, 34-course repository indexing, and verified academic links.",
        "image_file": "20_study_resources_tpo_ai_curation.png",
        "caption_tag": "TPO AI Syllabus Extraction & Curation",
        "tech_specs": "Groq AI Llama-3.3-70B · PyPDF Parser · MIT OpenCourseWare Curation",
        "selling_points": [
            ("Automated Syllabus Parsing", "Groq AI extracts subjects, unit syllabi, and prerequisites directly from PDF curricula."),
            ("34-Subject Digital Catalog", "Organizes 8 semesters into a structured hierarchy from Data Structures to Sem-7 Electives."),
            ("OpenCourseWare Integration", "Automatically links verified textbooks and open courseware (MIT 6.01SC, O'Reilly)."),
        ],
    }
    mod8 = {
        "module_num": "08",
        "category": "AI Simulation",
        "headline": "Conversational AI Mock Interview",
        "subhead": "Realistic multi-round practice with turn-by-turn AI feedback, DSA coding, and resume grounding.",
        "image_file": "23_mock_interview_interactive_session.png",
        "caption_tag": "10-Question Dynamic Interview & DSA Challenge",
        "tech_specs": "Groq AI LLM Streaming · Structured JSON Feedback · Resume Extraction",
        "selling_points": [
            ("10-Question Multi-Round", "Realistic simulation covering Behavioral, System Architecture, and Algorithms."),
            ("Turn-by-Turn AI Scoring", "Instant critiques on communication clarity, STAR methodology, and correctness."),
            ("Interactive DSA Coding", "Live coding challenges (e.g. zero-sum subarray detection) presented directly in-chat."),
        ],
    }
    add_two_modules_slide(
        prs,
        slide_num=9,
        total_slides=TOTAL_SLIDES,
        headline="modules 07 & 08: ai study curation & mock interview.",
        mod_left=mod7,
        mod_right=mod8,
    )

    # =========================================================================
    # SLIDE 10: Modules 09 & 10 — AI Resume ATS Scoring & Enhancer Wizard
    # =========================================================================
    mod9 = {
        "module_num": "09",
        "category": "ATS Resume Engine",
        "headline": "AI Resume ATS Analyzer & Scoring",
        "subhead": "Automated ATS benchmark scoring, missing keyword detection, and recruiter readiness audit.",
        "image_file": "26_resume_ats_analysis_score.png",
        "caption_tag": "Live ATS Benchmark Score (78.0/100) & Gap Audit",
        "tech_specs": "PyPDF Extraction · Groq ATS Heuristics · Keyword Gap Analysis",
        "selling_points": [
            ("100-Point ATS Benchmark", "Evaluates uploaded resume PDF on layout, parsing compatibility, and keyword density."),
            ("Critical Skill Gap Audit", "Identifies high-impact missing industry requirements (AWS/GCP, Docker, CI/CD)."),
            ("Actionable Recommendations", "Generates clear, prioritized action items to boost recruiter shortlisting rates."),
        ],
    }
    mod10 = {
        "module_num": "10",
        "category": "Resume Transformation",
        "headline": "AI Resume Enhancer Wizard",
        "subhead": "Step-by-step interactive wizard transforming vague bullet points into metric-driven achievements.",
        "image_file": "28_resume_enhancer_wizard.png",
        "caption_tag": "Quantified Bullet Rebuilder & Project Enhancer",
        "tech_specs": "Metric Transformation Heuristics · Structured Prompt Pipelines · Groq AI",
        "selling_points": [
            ("Quantified Project Rebuilder", "Turns vague descriptions into quantified bullet points with measurable impact."),
            ("Interactive Step-by-Step Flow", "Guides students through skill highlighting, metric additions, and impact verbs."),
            ("Export & Sync", "Instantly updates student profile and generates polished, ATS-optimized resume exports."),
        ],
    }
    add_two_modules_slide(
        prs,
        slide_num=10,
        total_slides=TOTAL_SLIDES,
        headline="modules 09 & 10: ai resume ats analysis & enhancer.",
        mod_left=mod9,
        mod_right=mod10,
    )

    # =========================================================================
    # SLIDE 11: Section Break 03 (Black Slide)
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    set_slide_background(s11, prs, COLOR_BLACK)

    tb_num11 = s11.shapes.add_textbox(Inches(0.8), Inches(1.2), Inches(3.5), Inches(2.5))
    tf_num11 = tb_num11.text_frame
    p_n11 = tf_num11.paragraphs[0]
    p_n11.text = "03"
    p_n11.font.name = FONT_FAMILY
    p_n11.font.size = Pt(100)
    p_n11.font.bold = True
    p_n11.font.color.rgb = COLOR_WHITE

    red_bar11 = s11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(3.8), Inches(1.8), Pt(6))
    red_bar11.fill.solid()
    red_bar11.fill.fore_color.rgb = COLOR_RED
    red_bar11.line.fill.background()

    tb_stitle11 = s11.shapes.add_textbox(Inches(0.8), Inches(4.2), Inches(11.0), Inches(2.0))
    tf_stitle11 = tb_stitle11.text_frame
    p_st11 = tf_stitle11.paragraphs[0]
    p_st11.text = "features yet to implement."
    p_st11.font.name = FONT_FAMILY
    p_st11.font.size = Pt(40)
    p_st11.font.bold = True
    p_st11.font.color.rgb = COLOR_WHITE

    p_st11_sub = tf_stitle11.add_paragraph()
    p_st11_sub.text = "Targeted engineering roadmap for final semester completion and institutional deployment."
    p_st11_sub.font.name = FONT_FAMILY
    p_st11_sub.font.size = Pt(14)
    p_st11_sub.font.color.rgb = RGBColor(180, 180, 180)

    # =========================================================================
    # SLIDE 12: Features Yet to Implement (Detailed Breakdown)
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    set_slide_background(s12, prs, COLOR_BG)
    add_swiss_header(s12, 12, TOTAL_SLIDES, "NEXT DEVELOPMENT SPRINT")
    add_swiss_grid(s12, prs)
    add_swiss_red_square(s12, Inches(0.8), Inches(0.8), Pt(10))

    tb_h12 = s12.shapes.add_textbox(Inches(1.05), Inches(0.72), Inches(11.0), Inches(0.8))
    tf_h12 = tb_h12.text_frame
    p_h12 = tf_h12.paragraphs[0]
    p_h12.text = "work in progress & pending modules."
    p_h12.font.name = FONT_FAMILY
    p_h12.font.size = Pt(28)
    p_h12.font.bold = True
    p_h12.font.color.rgb = COLOR_BLACK

    pending_features = [
        ("01 / STRICT FEE-VERIFIED DRIVE APPLICATION GATE", [
            ("Current State", "Template matching and OCR extraction are complete in fee_receipt_service.py; however, the hard gate in applications.py was temporarily bypassed for testing."),
            ("Implementation Plan", "Enforce strict require_fee_verified=True check in POST /applications. Students with unverified receipts will be blocked with an informative 403 modal directing them to upload proof."),
            ("TPO Manual Override", "Allow TPO officers to grant emergency provisional exemptions for students awaiting bank clearance."),
        ]),
        ("02 / ADVANCED UI / UX & DESIGN HARMONIZATION", [
            ("Current State", "Core components built with clean Tailwind CSS; certain dense data tables need enhanced mobile responsive layouts."),
            ("Implementation Plan", "Full design system alignment with the Swiss 'Basel' theme: strict high-contrast typography, refined micro-animations, and unified status badges."),
            ("Accessibility & Dark Mode", "Complete WCAG AA contrast compliance and seamless system-level dark/light mode toggle."),
        ]),
        ("03 / ACCREDITATION REPORTS & PROCTORING UPGRADES", [
            ("NBA / NAAC Criterion 5.2.1", "Automated one-click generation of formatted Excel spreadsheets and signed audit-ready placement statistics."),
            ("WebRTC Live Video Proctoring", "Upgrading current tab-blur & 3D head tracking to continuous dual-camera streaming with automated phone / multiple-face detection."),
            ("Corporate Recruiter Portal", "Dedicated employer login for direct job postings, candidate shortlisting, and automated digital offer letter rollouts."),
        ]),
    ]

    for idx, (title, points) in enumerate(pending_features):
        cx = col_xs[idx]
        tb = s12.shapes.add_textbox(cx, Inches(1.75), Inches(3.7), Inches(5.3))
        tf = tb.text_frame
        tf.word_wrap = True

        p_th = tf.paragraphs[0]
        p_th.text = title
        p_th.font.name = FONT_FAMILY
        p_th.font.size = Pt(10.5)
        p_th.font.bold = True
        p_th.font.color.rgb = COLOR_RED if idx == 0 else COLOR_BLACK

        for p_sub, p_desc in points:
            p_st = tf.add_paragraph()
            p_st.text = f"\n• {p_sub}"
            p_st.font.name = FONT_FAMILY
            p_st.font.size = Pt(10.5)
            p_st.font.bold = True
            p_st.font.color.rgb = COLOR_BLACK

            p_sd = tf.add_paragraph()
            p_sd.text = f"   {p_desc}"
            p_sd.font.name = FONT_FAMILY
            p_sd.font.size = Pt(9.5)
            p_sd.font.color.rgb = COLOR_MUTED

    # =========================================================================
    # SLIDE 13: Implementation Status Matrix
    # =========================================================================
    s13 = prs.slides.add_slide(blank_layout)
    set_slide_background(s13, prs, COLOR_BG)
    add_swiss_header(s13, 13, TOTAL_SLIDES, "EVALUATION DELIVERABLES")
    add_swiss_grid(s13, prs)
    add_swiss_red_square(s13, Inches(0.8), Inches(0.8), Pt(10))

    tb_h13 = s13.shapes.add_textbox(Inches(1.05), Inches(0.72), Inches(11.0), Inches(0.8))
    tf_h13 = tb_h13.text_frame
    p_h13 = tf_h13.paragraphs[0]
    p_h13.text = "mid-sem implementation matrix."
    p_h13.font.name = FONT_FAMILY
    p_h13.font.size = Pt(28)
    p_h13.font.bold = True
    p_h13.font.color.rgb = COLOR_BLACK

    # Table of modules, planned status, video proof status, mid-sem score
    matrix_data = [
        ("Institutional Onboarding & Gating", "Domain validation, signup OTP", "VERIFIED & SHOWN IN VIDEO", "Razorpay Modal & Setup Checklist"),
        ("College Admin Governance Hub", "Department & syllabus settings", "VERIFIED & SHOWN IN VIDEO", "9 Engineering Branches & Billing"),
        ("Custom Feature Proposals", "Bi-directional request loop", "VERIFIED & SHOWN IN VIDEO", "Proposal Modal & SuperAdmin Reply"),
        ("SuperAdmin Command Deck", "Multi-tenant university control", "VERIFIED & SHOWN IN VIDEO", "Colleges Directory & Global Broadcast"),
        ("Placement Drives & Eligibility", "Automated criteria screening", "VERIFIED & SHOWN IN VIDEO", "TCS Drive (₹3.4-10 LPA) Badging"),
        ("Skill Gap Diagnostics", "Failure tracking across tests", "VERIFIED & SHOWN IN VIDEO", "Recurring Weak Areas (Java/DSA)"),
        ("Curriculum Study Resources", "Groq AI syllabus parsing", "VERIFIED & SHOWN IN VIDEO", "34 Subjects & MIT OCW Links"),
        ("Turn-by-Turn AI Mock Interview", "10-question behavioral/technical", "VERIFIED & SHOWN IN VIDEO", "Interactive Dialogue & Zero-Sum DSA"),
        ("ATS Resume Benchmark Scoring", "ATS heuristic scoring & gaps", "VERIFIED & SHOWN IN VIDEO", "Score 78.0/100 & 8 Skill Gaps"),
        ("AI Resume Enhancer Wizard", "Interactive project quantifier", "VERIFIED & SHOWN IN VIDEO", "Metric Transformer & Rebuilder"),
        ("Fee-Verified Drive Application Gate", "Mandatory receipt check", "PENDING FINAL SPRINT", "Under active migration in applications.py"),
    ]

    rows = len(matrix_data) + 1
    cols = 4
    table_shape = s13.shapes.add_table(
        rows, cols, Inches(0.8), Inches(1.65), Inches(11.733), Inches(5.2)
    )
    table = table_shape.table
    table.columns[0].width = Inches(3.8)
    table.columns[1].width = Inches(2.3)
    table.columns[2].width = Inches(2.6)
    table.columns[3].width = Inches(3.033)

    headers = ["CORE MODULE / SYSTEM COMPONENT", "PLANNED SCOPE", "MID-SEM STATUS", "VERIFICATION EVIDENCE"]
    for c_idx, h_text in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = COLOR_BLACK
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.name = FONT_FAMILY
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = COLOR_WHITE

    for r_idx, row in enumerate(matrix_data, start=1):
        for c_idx, val in enumerate(row):
            cell = table.cell(r_idx, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = COLOR_CARD_BG if r_idx % 2 == 0 else COLOR_BG
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.name = FONT_FAMILY
            p.font.size = Pt(8.5)
            if c_idx == 2:
                p.font.bold = True
                p.font.color.rgb = COLOR_RED if "PENDING" in val else COLOR_BLACK
            else:
                p.font.color.rgb = COLOR_BLACK

    # =========================================================================
    # SLIDE 14: Conclusion & Acknowledgments (Basel Style)
    # =========================================================================
    s14 = prs.slides.add_slide(blank_layout)
    set_slide_background(s14, prs, COLOR_BG)
    add_swiss_header(s14, 14, TOTAL_SLIDES, "CONCLUSION & Q&A")
    add_swiss_grid(s14, prs)
    add_swiss_red_square(s14, Inches(0.8), Inches(0.8), Pt(14))

    # Giant Swiss headline
    tb_h14 = s14.shapes.add_textbox(Inches(0.8), Inches(1.3), Inches(11.733), Inches(2.0))
    tf_h14 = tb_h14.text_frame
    p_h14 = tf_h14.paragraphs[0]
    p_h14.text = "thank you."
    p_h14.font.name = FONT_FAMILY
    p_h14.font.size = Pt(64)
    p_h14.font.bold = True
    p_h14.font.color.rgb = COLOR_BLACK

    p_h14_sub = tf_h14.add_paragraph()
    p_h14_sub.text = "ai-powered smart placement & career preparation portal."
    p_h14_sub.font.name = FONT_FAMILY
    p_h14_sub.font.size = Pt(18)
    p_h14_sub.font.bold = True
    p_h14_sub.font.color.rgb = COLOR_RED

    # 3 Summary Cards
    col_cards_14 = [
        ("PROJECT STATUS", "All 10 planned core modules successfully engineered, tested with 37/37 passing backend tests, and demonstrated in the synchronized video walkthrough."),
        ("FACULTY MENTORSHIP", "Special thanks to our Faculty Guide Dr. Dharmesh G. Patel and the IT Department of Birla Vishvakarma Mahavidyalaya for architectural guidance."),
        ("OPEN FOR DISCUSSION", "The platform is currently operating in local staging. We welcome faculty feedback, evaluation questions, and recommendations for final semester deployment."),
    ]

    for idx, (head, body) in enumerate(col_cards_14):
        cx = col_xs[idx]
        tb = s14.shapes.add_textbox(cx, Inches(4.0), Inches(3.7), Inches(2.8))
        tf = tb.text_frame
        tf.word_wrap = True

        p_c14h = tf.paragraphs[0]
        p_c14h.text = head
        p_c14h.font.name = FONT_FAMILY
        p_c14h.font.size = Pt(11)
        p_c14h.font.bold = True
        p_c14h.font.color.rgb = COLOR_BLACK

        p_c14b = tf.add_paragraph()
        p_c14b.text = f"\n{body}"
        p_c14b.font.name = FONT_FAMILY
        p_c14b.font.size = Pt(10)
        p_c14b.font.color.rgb = COLOR_MUTED

    prs.save(OUTPUT_PPTX)
    print(f"Successfully generated PowerPoint presentation at: {OUTPUT_PPTX}")
    print(f"Total Slides: {len(prs.slides)}")


if __name__ == "__main__":
    create_presentation()
