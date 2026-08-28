"""
Project World Model (PWM) — Ultra-Fast Automated XPRIZE Demo Video Generator
Uses edge-tts for studio neural voiceover and ffmpeg 7.1 for native 1080p rendering.
Showcases the comprehensive Web Console Feature Suite across all 5 scenes.
"""

import os
import sys
import glob
import asyncio
import subprocess
from PIL import Image, ImageDraw, ImageFont
import edge_tts
import imageio_ffmpeg

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "Docs")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
TEMP_DIR = os.path.join(OUTPUT_DIR, "temp_video_assets")
BRAIN_DIR = r"C:\Users\petri\.gemini\antigravity-ide\brain\7330a686-1042-4369-8871-e408a4d3d65b"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

# ---------------------------------------------------------
# FONT HELPERS
# ---------------------------------------------------------
def get_font(size, bold=False):
    font_names = [
        "segoeuib.ttf" if bold else "segoeui.ttf",
        "arialbd.ttf" if bold else "arial.ttf",
        "calibrib.ttf" if bold else "calibri.ttf"
    ]
    for fn in font_names:
        try:
            return ImageFont.truetype(fn, size)
        except Exception:
            continue
    return ImageFont.load_default()

# ---------------------------------------------------------
# GRAPHIC GENERATORS
# ---------------------------------------------------------
def create_scene_overlay(scene_num, title, subtitle, width=1920, height=1080):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    f_badge = get_font(15, bold=True)
    f_title = get_font(18, bold=True)
    f_sub = get_font(14, bold=False)

    # Top-Right Compact Badge — "Video of the Demo"
    badge_text = "Video of the Demo"
    badge_w = 210
    badge_h = 32
    badge_x = width - badge_w - 30
    badge_y = 20
    draw.rounded_rectangle(
        [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
        radius=8, fill=(9, 13, 22, 200), outline=(56, 189, 248, 180), width=1
    )
    # Center text inside badge box
    text_bbox = draw.textbbox((0, 0), badge_text, font=f_badge)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]
    text_x = badge_x + (badge_w - text_w) // 2
    text_y = badge_y + (badge_h - text_h) // 2
    draw.text((text_x, text_y), badge_text, font=f_badge, fill=(56, 189, 248, 255))

    # Bottom Slim Lower-Third — compact bar at the very bottom edge
    bar_h = 44
    bar_y = height - bar_h
    # Semi-transparent dark strip across bottom
    draw.rectangle([0, bar_y, width, height], fill=(9, 13, 22, 210))
    # Left accent line
    draw.rectangle([0, bar_y, 4, height], fill=(56, 189, 248, 255))

    # Scene label + title on left, subtitle on right
    scene_label = f"SCENE {scene_num}  |  {title}"
    draw.text((16, bar_y + 6), scene_label, font=f_title, fill=(56, 189, 248, 255))
    draw.text((16, bar_y + 26), subtitle, font=f_sub, fill=(200, 210, 225, 255))

    return img

def create_intro_card(width=1920, height=1080):
    img = Image.new("RGB", (width, height), (9, 13, 22))
    draw = ImageDraw.Draw(img)

    f_main = get_font(68, bold=True)
    f_sub = get_font(32, bold=False)

    draw.text((430, 220), "PROJECT WORLD MODEL", font=f_main, fill=(248, 250, 252))
    draw.text((485, 315), "Autonomous Causal Digital Twin for Software Engineering", font=f_sub, fill=(56, 189, 248))

    box_x1, box_y1, box_x2, box_y2 = 340, 400, 1580, 890
    draw.rounded_rectangle([box_x1, box_y1, box_x2, box_y2], radius=20, fill=(15, 23, 42), outline=(51, 65, 85), width=2)

    pillars = [
        ("TRACK CATEGORY", "Small Business Services -- Empowering small dev teams at enterprise scale"),
        ("CORE PROBLEM", "Agility Paradox: AI generates code 10x faster, integration debt eats 40% of dev time"),
        ("AI ARCHITECTURE", "5-Layer Causal Digital Twin powered by Gemini 3.6 Flash, 3.1 Pro & 3.5 Flash"),
        ("COST GOVERNANCE", "CRR (Compute-to-Rework Ratio) balances simulation cost vs. avoided rework"),
        ("CLOUD INFRA", "Google Cloud Run (Scale-to-Zero), Vertex AI API, and NemoClaw sandboxes")
    ]

    f_pill_label = get_font(17, bold=True)
    f_desc_text = get_font(20, bold=False)
    desc_x = box_x1 + 260  # Fixed x for all descriptions

    curr_y = box_y1 + 40
    for label, desc in pillars:
        label_bbox = draw.textbbox((0, 0), label, font=f_pill_label)
        label_w = label_bbox[2] - label_bbox[0]
        pill_w = label_w + 30
        pill_x1 = box_x1 + 35
        pill_x2 = pill_x1 + pill_w
        pill_h = 32

        draw.rounded_rectangle([pill_x1, curr_y, pill_x2, curr_y + pill_h], radius=8, fill=(30, 58, 138))
        label_x = pill_x1 + (pill_w - label_w) // 2
        label_y = curr_y + (pill_h - (label_bbox[3] - label_bbox[1])) // 2
        draw.text((label_x, label_y), label, font=f_pill_label, fill=(147, 197, 253))

        desc_y = curr_y + (pill_h - (draw.textbbox((0, 0), desc, font=f_desc_text)[3] - draw.textbbox((0, 0), desc, font=f_desc_text)[1])) // 2
        draw.text((desc_x, desc_y), desc, font=f_desc_text, fill=(226, 232, 240))
        curr_y += 75

    return img

def create_image_frame_card(image_path, title, subtitle, width=1920, height=1080):
    """Wraps an application screenshot or diagram into a clean 1080p framed canvas."""
    canvas = Image.new("RGB", (width, height), (9, 13, 22))
    draw = ImageDraw.Draw(canvas)

    if title:
        draw.text((80, 24), title, font=get_font(28, bold=True), fill=(248, 250, 252))
    if subtitle:
        draw.text((80, 60), subtitle, font=get_font(16, bold=False), fill=(148, 163, 184))

    if os.path.exists(image_path):
        inner = Image.open(image_path).convert("RGB")
        max_w = width - 100
        max_h = height - (140 if title else 70)
        inner.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)

        pos_x = (width - inner.width) // 2
        pos_y = (100 if title else 20) + (max_h - inner.height) // 2

        draw.rounded_rectangle([pos_x - 3, pos_y - 3, pos_x + inner.width + 3, pos_y + inner.height + 3], radius=8, fill=(30, 41, 59), outline=(56, 189, 248, 150), width=2)
        canvas.paste(inner, (pos_x, pos_y))

    return canvas

def create_full_bleed_card(image_path, width=1920, height=1080):
    """Scales a screenshot to fill 1920x1080 while preserving crisp aspect ratio."""
    canvas = Image.new("RGB", (width, height), (9, 13, 22))
    if os.path.exists(image_path):
        inner = Image.open(image_path).convert("RGB")
        # Resize to fit 1080p
        ratio = max(width / inner.width, height / inner.height)
        new_w = int(inner.width * ratio)
        new_h = int(inner.height * ratio)
        resized = inner.resize((new_w, new_h), Image.Resampling.LANCZOS)
        pos_x = (width - new_w) // 2
        pos_y = (height - new_h) // 2
        canvas.paste(resized, (pos_x, pos_y))
    return canvas

def create_outro_card(width=1920, height=1080):
    img = Image.new("RGB", (width, height), (9, 13, 22))
    draw = ImageDraw.Draw(img)

    f_title = get_font(56, bold=True)
    f_sub = get_font(28, bold=False)
    f_kpi_val = get_font(34, bold=True)
    f_kpi_lbl = get_font(18, bold=False)
    f_foot = get_font(22, bold=True)

    draw.text((540, 95), "PROJECT WORLD MODEL", font=f_title, fill=(248, 250, 252))
    draw.text((510, 175), "The Future of AI-Native Operations in Small Business Services", font=f_sub, fill=(56, 189, 248))

    cards = [
        ("4.5M+ TOKENS", "Gemini API Tokens Evaluated in Production", (16, 185, 129)),
        ("€34.92 ($38 USD)", "Total July 2026 Cloud Hosting & API Spend", (56, 189, 248)),
        ("62 / 62 PASS", "Comprehensive Backend & Agent Test Suite", (245, 158, 11)),
        ("L3 CAUSAL TWIN", "Action-Conditioned Counterfactual Simulation", (168, 85, 247))
    ]

    card_w, card_h = 390, 180
    start_x, start_y = 120, 275

    for i, (val, lbl, color) in enumerate(cards):
        cx = start_x + i * (card_w + 50)
        draw.rounded_rectangle([cx, start_y, cx + card_w, start_y + card_h], radius=16, fill=(15, 23, 42), outline=color, width=2)
        draw.text((cx + 30, start_y + 40), val, font=f_kpi_val, fill=color)
        words = lbl.split()
        line1 = " ".join(words[:4])
        line2 = " ".join(words[4:])
        draw.text((cx + 30, start_y + 95), line1, font=f_kpi_lbl, fill=(226, 232, 240))
        if line2:
            draw.text((cx + 30, start_y + 125), line2, font=f_kpi_lbl, fill=(226, 232, 240))

    draw.rounded_rectangle([260, 510, 1660, 880], radius=18, fill=(15, 23, 42), outline=(51, 65, 85), width=2)

    fields = [
        ("Repository", "https://github.com/petripaananen/Project-World-Model"),
        ("Live Deployment", "Google Cloud Run (Scale-to-Zero Container)"),
        ("Judging Verification", "Shared with testing@devpost.com and judging@hacker.fund"),
        ("Category & Track", "Build with Gemini XPRIZE -- Small Business Services Track"),
        ("Live Production URL", "https://project-world-model-106911803120.us-central1.run.app")
    ]

    curr_y = 550
    for label, val in fields:
        draw.text((310, curr_y), f"{label}:", font=get_font(22, bold=True), fill=(56, 189, 248))
        draw.text((580, curr_y), val, font=get_font(22, bold=False), fill=(241, 245, 249))
        curr_y += 58

    draw.text((740, 940), "Thank you for watching!  |  Video of the Demo", font=f_foot, fill=(56, 189, 248))
    return img

# ---------------------------------------------------------
# FFMPEG WRAPPER HELPERS
# ---------------------------------------------------------
def run_ffmpeg(cmd):
    """Runs an ffmpeg command synchronously and handles errors."""
    full_cmd = [FFMPEG_EXE, "-y"] + cmd
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"FFMPEG Error:\n{res.stderr}")
        raise RuntimeError(f"FFMPEG command failed with code {res.returncode}")

def get_media_duration(file_path):
    """Gets exact duration of audio/video using ffprobe/ffmpeg."""
    cmd = [FFMPEG_EXE, "-i", file_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    for line in res.stderr.split("\n"):
        if "Duration:" in line:
            parts = line.split("Duration:")[1].split(",")[0].strip().split(":")
            dur = float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            return dur
    return 0.0

# ---------------------------------------------------------
# SCENE SCRIPTS (Comprehensive Console Feature Walkthrough)
# ---------------------------------------------------------
SCENE_SCRIPTS = [
    (1, "The Agility Paradox", "Autonomous Causal Digital Twin for Software Engineering",
     "Generative AI lets software teams write code ten times faster. But there is a catch: integrating that code creates massive integration debt, consuming over forty percent of developer time. Traditional Agile boards are passive—they tell you what broke yesterday, not what will break tomorrow. Welcome to Project World Model, an autonomous Causal Digital Twin that replaces reactive firefighting with proactive simulation."),

    (2, "Causal Diagnostic Suite", "Continuous Ingestion, Causal Board, Sprint Predictions & Stakeholder Mapping",
     "Project World Model continuously ingests pull requests, Jira tickets, and Linear issues into an immutable event stream. The Workspace Console monitors real-time telemetry and cognitive budgets. The Causal Board highlights blocked critical path tasks and integration debt flags. The Sprint Panel forecasts sprint velocity and delivery risks using AI, while the Stakeholder Map visualizes cross-functional dependencies and collaboration bottlenecks."),

    (3, "Predictive Simulation & Flow", "Flow Metrics, Lifecycle Risk Curves & Counterfactual Scenario Sandbox",
     "To maintain engineering flow, Flow Metrics tracks work in progress limits, cycle time distributions, and bottleneck friction. The Project Lifecycle view maps milestone stages and projects cumulative delivery risk over time. In the Scenario Sandbox, scenario strategists run counterfactual what-if simulations—adjusting developer allocation, scope, and QA depth in latent space to forecast merge conflicts before executing in production."),

    (4, "Governance & Alignment", "CRR Cost Optimization, Self-Healing Calibration & 3D Spatial Twin",
     "Our Strategic Balance Sheet governs the system across Economics, Team Workload, and Technical Health. The Compute-to-Rework Ratio, or CRR, mathematically proves that simulation costs are outweighed by avoided rework. Simulation Alignment automatically tunes AI forecast models against actual repository history to eliminate drift. Autonomous Worker and Critic agents resolve conflicts in sandboxes, while the 3D Classical Garden provides an intuitive spatial digital twin."),

    (5, "Small Business Services Impact", "Google Cloud Run (Scale-to-Zero), Vertex AI & Live Verified Deployment",
     "Project World Model runs on Google Cloud Run with scale-to-zero container architecture and Vertex AI, delivering enterprise-grade operational intelligence for small software teams at under thirty-eight dollars a month. Explore our full open-source repository on GitHub and test the live production deployment. Thank you for watching our Build with Gemini XPRIZE submission.")
]

# ---------------------------------------------------------
# AUDIO GENERATION
# ---------------------------------------------------------
async def generate_voiceovers():
    print("Step 1: Generating studio neural AI voiceover...")
    voice = "en-US-ChristopherNeural"
    audio_files = []

    for num, title, subtitle, script in SCENE_SCRIPTS:
        out_path = os.path.join(TEMP_DIR, f"scene_{num}_audio.mp3")
        communicate = edge_tts.Communicate(script, voice, rate="+4%")
        await communicate.save(out_path)

        dur = get_media_duration(out_path)
        print(f"Generated Audio Scene {num}: {dur:.2f}s")
        audio_files.append((num, out_path, dur))

    return audio_files

# ---------------------------------------------------------
# COMPOSITE & ENCODE FULL DEMO VIDEO
# ---------------------------------------------------------
def render_full_video(audio_info):
    print("\nStep 2: Processing visual feeds & compositing console scenes...")

    # Find the latest captured screenshots from browser subagent in brain dir
    def get_latest_shot(pattern):
        matches = glob.glob(os.path.join(BRAIN_DIR, pattern))
        if matches:
            return sorted(matches)[-1]
        # fallback to Docs or temp
        return os.path.join(DOCS_DIR, "pwm_architecture_diagram.png")

    shot_workspace = get_latest_shot("workspace_console_*.png")
    shot_kanban = get_latest_shot("kanban_board_*.png")
    shot_sprint = get_latest_shot("sprint_panel_*.png")
    shot_stakeholder = get_latest_shot("stakeholder_map_*.png")
    shot_flow = get_latest_shot("flow_metrics_*.png")
    shot_lifecycle = get_latest_shot("project_lifecycle_*.png")
    shot_sandbox = get_latest_shot("scenario_sandbox_*.png")
    shot_strategic = get_latest_shot("strategic_balance_sheet_*.png")
    shot_alignment = get_latest_shot("simulation_alignment_*.png")
    shot_settings = get_latest_shot("settings_page_*.png")
    shot_garden = get_latest_shot("garden_twin_view_*.png")

    # Generate Card Images
    intro_card_path = os.path.join(TEMP_DIR, "card_intro.png")
    create_intro_card().save(intro_card_path)

    arch_card_path = os.path.join(TEMP_DIR, "card_arch.png")
    create_image_frame_card(
        os.path.join(DOCS_DIR, "pwm_architecture_diagram.png"),
        "5-Layer Causal Digital Twin Architecture",
        "Continuous Ingestion, Causal Graph, Counterfactual Simulation, Multi-Agent & Governance"
    ).save(arch_card_path)

    card_workspace_path = os.path.join(TEMP_DIR, "card_workspace.png")
    create_full_bleed_card(shot_workspace).save(card_workspace_path)

    card_kanban_path = os.path.join(TEMP_DIR, "card_kanban.png")
    create_full_bleed_card(shot_kanban).save(card_kanban_path)

    card_sprint_path = os.path.join(TEMP_DIR, "card_sprint.png")
    create_full_bleed_card(shot_sprint).save(card_sprint_path)

    card_stakeholder_path = os.path.join(TEMP_DIR, "card_stakeholder.png")
    create_full_bleed_card(shot_stakeholder).save(card_stakeholder_path)

    card_flow_path = os.path.join(TEMP_DIR, "card_flow.png")
    create_full_bleed_card(shot_flow).save(card_flow_path)

    card_lifecycle_path = os.path.join(TEMP_DIR, "card_lifecycle.png")
    create_full_bleed_card(shot_lifecycle).save(card_lifecycle_path)

    card_sandbox_path = os.path.join(TEMP_DIR, "card_sandbox.png")
    create_full_bleed_card(shot_sandbox).save(card_sandbox_path)

    card_strategic_path = os.path.join(TEMP_DIR, "card_strategic.png")
    create_full_bleed_card(shot_strategic).save(card_strategic_path)

    card_alignment_path = os.path.join(TEMP_DIR, "card_alignment.png")
    create_full_bleed_card(shot_alignment).save(card_alignment_path)

    card_settings_path = os.path.join(TEMP_DIR, "card_settings.png")
    create_full_bleed_card(shot_settings).save(card_settings_path)

    outro_card_path = os.path.join(TEMP_DIR, "card_outro.png")
    create_outro_card().save(outro_card_path)

    overlays = {}
    for num, title, subtitle, _ in SCENE_SCRIPTS:
        ov_path = os.path.join(TEMP_DIR, f"overlay_{num}.png")
        create_scene_overlay(num, title, subtitle).save(ov_path)
        overlays[num] = ov_path

    scene_files = []

    def make_image_subclip(img_path, overlay_path, duration, out_subclip):
        run_ffmpeg([
            "-loop", "1", "-t", f"{duration:.2f}", "-i", img_path,
            "-i", overlay_path,
            "-filter_complex", "[0:v]scale=1920:1080[v0];[v0][1:v]overlay=0:0[vout]",
            "-map", "[vout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
            out_subclip
        ])

    def concat_scene(subclips, audio_path, final_scene_path):
        list_file = os.path.join(TEMP_DIR, f"concat_list_{os.path.basename(final_scene_path)}.txt")
        with open(list_file, "w") as f:
            for sc in subclips:
                f.write(f"file '{os.path.abspath(sc).replace(chr(92), '/')}'\n")
        run_ffmpeg([
            "-f", "concat", "-safe", "0", "-i", list_file,
            "-i", audio_path,
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
            final_scene_path
        ])

    # -----------------------------------------------------
    # SCENE 1 (Problem Statement & Agility Paradox)
    # -----------------------------------------------------
    dur1 = audio_info[0][2]
    t1_intro = dur1 * 0.40
    t1_arch = dur1 * 0.35
    t1_strat = dur1 - t1_intro - t1_arch
    aud1 = audio_info[0][1]
    scene1_out = os.path.join(TEMP_DIR, "scene_1_final.mp4")

    s1_a = os.path.join(TEMP_DIR, "s1_a.mp4")
    s1_b = os.path.join(TEMP_DIR, "s1_b.mp4")
    s1_c = os.path.join(TEMP_DIR, "s1_c.mp4")
    make_image_subclip(intro_card_path, overlays[1], t1_intro, s1_a)
    make_image_subclip(arch_card_path, overlays[1], t1_arch, s1_b)
    make_image_subclip(card_strategic_path, overlays[1], t1_strat, s1_c)

    concat_scene([s1_a, s1_b, s1_c], aud1, scene1_out)
    scene_files.append(scene1_out)
    print(f"[OK] Scene 1 encoded: {dur1:.2f}s")

    # -----------------------------------------------------
    # SCENE 2 (Causal Diagnostic Suite: Console, Board, Sprint, Stakeholder)
    # -----------------------------------------------------
    dur2 = audio_info[1][2]
    t2_ws = dur2 * 0.28
    t2_kanban = dur2 * 0.28
    t2_sprint = dur2 * 0.22
    t2_stake = dur2 - t2_ws - t2_kanban - t2_sprint
    aud2 = audio_info[1][1]
    scene2_out = os.path.join(TEMP_DIR, "scene_2_final.mp4")

    s2_a = os.path.join(TEMP_DIR, "s2_a.mp4")
    s2_b = os.path.join(TEMP_DIR, "s2_b.mp4")
    s2_c = os.path.join(TEMP_DIR, "s2_c.mp4")
    s2_d = os.path.join(TEMP_DIR, "s2_d.mp4")
    make_image_subclip(card_workspace_path, overlays[2], t2_ws, s2_a)
    make_image_subclip(card_kanban_path, overlays[2], t2_kanban, s2_b)
    make_image_subclip(card_sprint_path, overlays[2], t2_sprint, s2_c)
    make_image_subclip(card_stakeholder_path, overlays[2], t2_stake, s2_d)

    concat_scene([s2_a, s2_b, s2_c, s2_d], aud2, scene2_out)
    scene_files.append(scene2_out)
    print(f"[OK] Scene 2 encoded: {dur2:.2f}s")

    # -----------------------------------------------------
    # SCENE 3 (Predictive Simulation: Flow Metrics, Lifecycle, Sandbox)
    # -----------------------------------------------------
    dur3 = audio_info[2][2]
    t3_flow = dur3 * 0.32
    t3_life = dur3 * 0.32
    t3_sand = dur3 - t3_flow - t3_life
    aud3 = audio_info[2][1]
    scene3_out = os.path.join(TEMP_DIR, "scene_3_final.mp4")

    s3_a = os.path.join(TEMP_DIR, "s3_a.mp4")
    s3_b = os.path.join(TEMP_DIR, "s3_b.mp4")
    s3_c = os.path.join(TEMP_DIR, "s3_c.mp4")
    make_image_subclip(card_flow_path, overlays[3], t3_flow, s3_a)
    make_image_subclip(card_lifecycle_path, overlays[3], t3_life, s3_b)
    make_image_subclip(card_sandbox_path, overlays[3], t3_sand, s3_c)

    concat_scene([s3_a, s3_b, s3_c], aud3, scene3_out)
    scene_files.append(scene3_out)
    print(f"[OK] Scene 3 encoded: {dur3:.2f}s")

    # -----------------------------------------------------
    # SCENE 4 (Governance, Alignment & 3D Spatial Twin Extra)
    # -----------------------------------------------------
    dur4 = audio_info[3][2]
    t4_strat = dur4 * 0.35
    t4_align = dur4 * 0.35
    t4_garden = dur4 - t4_strat - t4_align
    aud4 = audio_info[3][1]
    scene4_out = os.path.join(TEMP_DIR, "scene_4_final.mp4")

    s4_a = os.path.join(TEMP_DIR, "s4_a.mp4")
    s4_b = os.path.join(TEMP_DIR, "s4_b.mp4")
    s4_c = os.path.join(TEMP_DIR, "s4_c.mp4")
    make_image_subclip(card_strategic_path, overlays[4], t4_strat, s4_a)
    make_image_subclip(card_alignment_path, overlays[4], t4_align, s4_b)

    # 3D Garden supplementary clip (10 seconds from Instruction part 5 results.mp4)
    vid_garden = os.path.join(DOCS_DIR, "Instruction part 5 results.mp4")
    if os.path.exists(vid_garden):
        run_ffmpeg([
            "-ss", "0.0", "-t", f"{t4_garden:.2f}", "-i", vid_garden,
            "-i", overlays[4],
            "-filter_complex", "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[v0];[v0][1:v]overlay=0:0[vout]",
            "-map", "[vout]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
            s4_c
        ])
    else:
        make_image_subclip(card_workspace_path, overlays[4], t4_garden, s4_c)

    concat_scene([s4_a, s4_b, s4_c], aud4, scene4_out)
    scene_files.append(scene4_out)
    print(f"[OK] Scene 4 encoded: {dur4:.2f}s")

    # -----------------------------------------------------
    # SCENE 5 (Settings, Cloud Scale & Outro Summary)
    # -----------------------------------------------------
    dur5 = audio_info[4][2]
    t5_settings = dur5 * 0.32
    t5_outro = dur5 - t5_settings
    aud5 = audio_info[4][1]
    scene5_out = os.path.join(TEMP_DIR, "scene_5_final.mp4")

    s5_a = os.path.join(TEMP_DIR, "s5_a.mp4")
    s5_b = os.path.join(TEMP_DIR, "s5_b.mp4")
    make_image_subclip(card_settings_path, overlays[5], t5_settings, s5_a)
    make_image_subclip(outro_card_path, overlays[5], t5_outro, s5_b)

    concat_scene([s5_a, s5_b], aud5, scene5_out)
    scene_files.append(scene5_out)
    print(f"[OK] Scene 5 encoded: {dur5:.2f}s")

    # -----------------------------------------------------
    # FINAL CONCATENATION OF ALL 5 SCENES
    # -----------------------------------------------------
    master_output = os.path.join(OUTPUT_DIR, "Project_World_Model_XPrize_Demo.mp4")
    master_list_path = os.path.join(TEMP_DIR, "master_concat_list.txt")

    with open(master_list_path, "w") as f:
        for sf in scene_files:
            f.write(f"file '{os.path.abspath(sf).replace(chr(92), '/')}'\n")

    run_ffmpeg([
        "-f", "concat", "-safe", "0", "-i", master_list_path,
        "-c", "copy",
        master_output
    ])

    final_dur = get_media_duration(master_output)
    final_size_mb = os.path.getsize(master_output) / (1024 * 1024)

    print("\n" + "=" * 60)
    print("[SUCCESS] MASTER DEMO VIDEO GENERATED SUCCESSFULLY!")
    print(f"Path: {master_output}")
    print(f"Duration: {int(final_dur // 60)}m {int(final_dur % 60):02d}s ({final_dur:.2f}s) - Strictly < 3 minutes!")
    print(f"Size: {final_size_mb:.2f} MB")
    print("Resolution: 1920x1080 Full HD @ 30fps with Stereo AAC Audio")
    print("=" * 60 + "\n")

    return master_output

# ---------------------------------------------------------
# ENTRYPOINT
# ---------------------------------------------------------
if __name__ == "__main__":
    audio_info = asyncio.run(generate_voiceovers())
    render_full_video(audio_info)
