"""
Dopamine Reset Plan — a 30-day structured protocol to rebuild
your baseline attention span and tolerance for boredom.
"""

import json
import os
from datetime import date, timedelta

PLAN_FILE = "dopamine_reset_progress.json"

# ─────────────────────────────────────────────
# THE PLAN
# ─────────────────────────────────────────────

PHASES = [
    {
        "phase": 1,
        "name": "Awareness",
        "days": "1–7",
        "goal": "Map your patterns before cutting anything.",
        "daily_practices": [
            "Track every time you reach for your phone without a reason — use a tally in a notebook.",
            "Put your phone face-down at meals. No exceptions.",
            "No phone for the first 30 minutes after waking up.",
            "Identify your top 3 trigger apps (the ones you open mindlessly).",
            "Write 3 sentences in a journal before bed — no prompts, just whatever is in your head.",
        ],
        "mindset": (
            "You are not quitting anything yet. You are just watching yourself. "
            "Judgment-free observation is the foundation."
        ),
    },
    {
        "phase": 2,
        "name": "Reduction",
        "days": "8–14",
        "goal": "Introduce friction and replace reflexes.",
        "daily_practices": [
            "Delete your top 2 trigger apps from your phone (you can reinstall from a computer if truly needed).",
            "Set app limits (Screen Time / Digital Wellbeing) to 30 min/day total for social + news.",
            "No phone for the first 60 minutes after waking up.",
            "One 20-minute 'sit' per day: sit somewhere comfortable, no input, just exist. No music, no podcast.",
            "Replace one scroll session with a 10-minute walk — no headphones.",
            "Keep a 'boredom log': when you feel the itch to grab your phone, write one word for what you feel instead.",
        ],
        "mindset": (
            "Boredom is not a problem to solve. It is the feeling of your brain "
            "recalibrating. Sitting in it is the work."
        ),
    },
    {
        "phase": 3,
        "name": "Rebuilding",
        "days": "15–21",
        "goal": "Grow your tolerance for silence and slow rewards.",
        "daily_practices": [
            "No phone for the first 90 minutes after waking up.",
            "Daily 'sit' extended to 30 minutes — you can start with a body scan or just open attention.",
            "Read physical paper (book, magazine, anything) for 20 minutes before bed instead of a screen.",
            "Pick one analog hobby to do for 20–30 min: drawing, cooking something new, stretching, journaling long-form.",
            "Phone charges outside your bedroom at night.",
            "One full phone-free hour in the evening — protect it like a meeting.",
        ],
        "mindset": (
            "Slow rewards — a finished page, a cooked meal, a completed walk — "
            "rebuild the part of your reward system that fast content has been crowding out."
        ),
    },
    {
        "phase": 4,
        "name": "Integration",
        "days": "22–30",
        "goal": "Make the new baseline permanent without white-knuckling.",
        "daily_practices": [
            "Design your phone's home screen: only tools (maps, calendar, contacts, camera). No feeds on the first screen.",
            "Use your phone intentionally: before picking it up, say aloud or think what you are opening it for.",
            "Daily 30-minute sit continues — it is no longer a reset, it is maintenance.",
            "Weekly phone-free morning (Saturday or Sunday): from wake to noon, no phone.",
            "Write a short weekly reflection: what felt easier this week, what still pulls at you.",
            "Choose one thing per day to do with your full, undivided attention — a conversation, a meal, a walk.",
        ],
        "mindset": (
            "The goal is not to hate your phone. It is to be the one in charge of when and why you use it."
        ),
    },
]

DAILY_ANCHORS = {
    "Morning anchor": "No phone for the first [30/60/90] min (increases by phase). Drink water, sit quietly, or journal.",
    "Evening anchor": "Phone charges outside your room. Read or journal before sleep.",
    "Boredom anchor": "When you feel the pull, pause for 10 seconds and name the feeling before acting.",
    "Meal anchor": "Phone face-down or in another room during all meals.",
}

WHAT_TO_EXPECT = [
    ("Days 1–3", "Heightened restlessness. You will reach for your phone constantly. This is normal."),
    ("Days 4–7", "The tally in your notebook will probably surprise you. Awareness starts to create natural pauses."),
    ("Days 8–14", "Irritability peaks. The 20-minute sits will feel impossible. Do them anyway, even badly."),
    ("Days 15–21", "Sits start to feel neutral instead of painful. You may notice you feel calmer after meals."),
    ("Days 22–30", "Boredom starts to feel less threatening. Longer-form focus (reading, conversations) feels more accessible."),
    ("Beyond 30", "The baseline has shifted. Maintain the anchors. Slip-ups are data, not failure."),
]


# ─────────────────────────────────────────────
# PROGRESS TRACKING
# ─────────────────────────────────────────────

def load_progress():
    if os.path.exists(PLAN_FILE):
        with open(PLAN_FILE) as f:
            return json.load(f)
    return {"start_date": None, "completed_days": [], "notes": {}}


def save_progress(progress):
    with open(PLAN_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def get_current_day(progress):
    if not progress["start_date"]:
        return None
    start = date.fromisoformat(progress["start_date"])
    delta = (date.today() - start).days + 1
    return max(1, min(delta, 30))


def get_phase_for_day(day):
    if day <= 7:
        return PHASES[0]
    elif day <= 14:
        return PHASES[1]
    elif day <= 21:
        return PHASES[2]
    else:
        return PHASES[3]


# ─────────────────────────────────────────────
# DISPLAY
# ─────────────────────────────────────────────

def print_full_plan():
    print("\n" + "═" * 62)
    print("  DOPAMINE RESET PLAN  —  30 Days to Reclaim Your Attention")
    print("═" * 62)

    print("\nWHAT THIS IS\n" + "─" * 40)
    print(
        "A slow, graduated protocol to reduce compulsive phone use\n"
        "and rebuild your capacity to sit with your own thoughts.\n"
        "No cold turkey. No shame. Just gradual, intentional change."
    )

    print("\nDAILY ANCHORS (every day, all 30 days)\n" + "─" * 40)
    for anchor, description in DAILY_ANCHORS.items():
        print(f"  {anchor}: {description}")

    for phase in PHASES:
        print(f"\nPHASE {phase['phase']}: {phase['name'].upper()}  (Days {phase['days']})\n" + "─" * 40)
        print(f"Goal: {phase['goal']}\n")
        print("Daily practices:")
        for i, practice in enumerate(phase["daily_practices"], 1):
            print(f"  {i}. {practice}")
        print(f"\nMindset: \"{phase['mindset']}\"")

    print("\nWHAT TO EXPECT\n" + "─" * 40)
    for period, expectation in WHAT_TO_EXPECT:
        print(f"  {period}: {expectation}")

    print("\n" + "═" * 62 + "\n")


def print_today(progress):
    day = get_current_day(progress)
    if not day:
        print("\nPlan not started yet. Run with --start to begin.\n")
        return

    phase = get_phase_for_day(day)
    completed = progress["completed_days"]

    print(f"\n{'═' * 50}")
    print(f"  DAY {day} of 30  —  Phase {phase['phase']}: {phase['name']}")
    print(f"{'═' * 50}")
    print(f"\nGoal for this phase: {phase['goal']}")
    print(f"\nMindset: \"{phase['mindset']}\"")
    print(f"\nToday's practices:")
    for i, practice in enumerate(phase["daily_practices"], 1):
        done = f"[x]" if f"day{day}_practice{i}" in completed else "[ ]"
        print(f"  {done} {i}. {practice}")

    print(f"\nDaily anchors (always on):")
    for anchor, description in DAILY_ANCHORS.items():
        print(f"  • {anchor}: {description.split('.')[0]}.")

    note = progress["notes"].get(str(day), "")
    if note:
        print(f"\nYour note for today: {note}")

    total_done = sum(1 for k in completed if k.startswith(f"day{day}_"))
    total = len(phase["daily_practices"])
    print(f"\nProgress today: {total_done}/{total} practices marked done.")
    print(f"Days completed so far: {len(set(k.split('_')[0] for k in completed))}/30\n")


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────

def main():
    import sys

    args = sys.argv[1:]

    if not args or args[0] == "--plan":
        print_full_plan()
        return

    progress = load_progress()

    if args[0] == "--start":
        if progress["start_date"]:
            print(f"\nAlready started on {progress['start_date']}. Run without --start to see today.\n")
        else:
            progress["start_date"] = date.today().isoformat()
            save_progress(progress)
            print(f"\nPlan started! Day 1 begins today ({date.today()}). Run --today to see your practices.\n")
        return

    if args[0] == "--today":
        print_today(progress)
        return

    if args[0] == "--done" and len(args) >= 2:
        day = get_current_day(progress)
        if not day:
            print("\nStart the plan first with --start.\n")
            return
        try:
            practice_num = int(args[1])
        except ValueError:
            print("\nUsage: --done <practice_number>\n")
            return
        key = f"day{day}_practice{practice_num}"
        if key not in progress["completed_days"]:
            progress["completed_days"].append(key)
            save_progress(progress)
            print(f"\nMarked practice {practice_num} for day {day} as done.\n")
        else:
            print(f"\nAlready marked done.\n")
        return

    if args[0] == "--note":
        day = get_current_day(progress)
        if not day:
            print("\nStart the plan first with --start.\n")
            return
        note = " ".join(args[1:])
        progress["notes"][str(day)] = note
        save_progress(progress)
        print(f"\nNote saved for day {day}.\n")
        return

    if args[0] == "--status":
        if not progress["start_date"]:
            print("\nPlan not started. Run --start to begin.\n")
            return
        day = get_current_day(progress)
        days_done = len(set(k.split("_")[0] for k in progress["completed_days"]))
        print(f"\nStarted: {progress['start_date']}")
        print(f"Current day: {day}/30")
        print(f"Days with at least one practice done: {days_done}")
        print(f"Notes written: {len(progress['notes'])}\n")
        return

    print("""
Usage:
  python dopamine_reset.py --plan          Show the full 30-day plan
  python dopamine_reset.py --start         Start the plan (records today as day 1)
  python dopamine_reset.py --today         Show today's phase, practices, and anchors
  python dopamine_reset.py --done <N>      Mark practice N as done for today
  python dopamine_reset.py --note <text>   Save a reflection note for today
  python dopamine_reset.py --status        Show overall progress summary
""")


if __name__ == "__main__":
    main()
