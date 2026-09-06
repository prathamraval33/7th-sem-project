"""Seed script for GATE & CAT Exam Prep feature and starter resources.

Creates:
1. The 'gate_cat_prep' feature in the catalog with status=DRAFT.
2. Auto-grant to BVM college (status=ACTIVE, is_auto_granted=True).
3. Starter resources for GATE & CAT with category=gate_cat_prep.
"""
import os
import sys
from datetime import datetime, timezone

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.college import College
from app.models.college_feature import CollegeFeature, FeatureRequestStatus
from app.models.feature import BillingType, Feature, FeatureStatus
from app.models.resource import Resource, ResourceCategory, ResourceContentType
from app.models.user import User

BVM_DOMAIN = "bvmengineering.ac.in"


def seed_gate_cat_prep():
    db = SessionLocal()
    try:
        # 1. Ensure BVM College exists
        bvm = db.scalar(select(College).where(College.domain == BVM_DOMAIN))
        if not bvm:
            print(f"Error: BVM college with domain '{BVM_DOMAIN}' not found.")
            return

        print(f"Found BVM College: {bvm.name} (ID: {bvm.id})")

        # Find creator user (prefer admin in BVM, else any user in BVM, else any user)
        creator = db.scalar(
            select(User).where(User.college_id == bvm.id).order_by(User.id.asc())
        )
        if not creator:
            creator = db.scalar(select(User).order_by(User.id.asc()))
        if not creator:
            print("Error: No users found in database to set as resource creator.")
            return

        print(f"Using creator user: {creator.email} (ID: {creator.id})")

        # 2. Create or find the feature in catalog
        feature = db.scalar(select(Feature).where(Feature.code == "gate_cat_prep"))
        if not feature:
            feature = Feature(
                code="gate_cat_prep",
                name="GATE & CAT Exam Prep",
                description="Comprehensive study materials, lecture summaries, formula sheets, and practice guides for GATE CS and CAT entrance exams.",
                category="Exam Prep",
                target_role="Student",
                price=499.00,
                billing_type=BillingType.MONTHLY,
                status=FeatureStatus.DRAFT,
            )
            db.add(feature)
            db.flush()
            print(f"Created feature '{feature.name}' with code '{feature.code}' in DRAFT status.")
        else:
            print(f"Feature '{feature.name}' ({feature.code}) already exists (status: {feature.status.value}).")

        # 3. Auto-grant feature to BVM
        now = datetime.now(timezone.utc)
        cf = db.scalar(
            select(CollegeFeature).where(
                CollegeFeature.college_id == bvm.id,
                CollegeFeature.feature_id == feature.id,
            )
        )
        if not cf:
            cf = CollegeFeature(
                college_id=bvm.id,
                feature_id=feature.id,
                status=FeatureRequestStatus.ACTIVE,
                is_auto_granted=True,
                decided_at=now,
                approved_at=now,
            )
            db.add(cf)
            db.flush()
            print(f"Auto-granted feature '{feature.name}' to BVM (status: ACTIVE).")
        elif cf.status != FeatureRequestStatus.ACTIVE:
            cf.status = FeatureRequestStatus.ACTIVE
            cf.is_auto_granted = True
            cf.approved_at = now
            print(f"Activated existing feature association for BVM (status: ACTIVE).")
        else:
            print(f"Feature is already ACTIVE for BVM.")

        # 4. Create starter resources
        starter_resources = [
            {
                "title": "GATE CS: Data Structures & Algorithms Revision Notes",
                "content_type": ResourceContentType.DOCUMENT,
                "video_url": None,
                "content": (
                    "Complete revision notes covering Asymptotic Notations (Big-O, Omega, Theta), "
                    "Master Theorem for recurrences, Array and Matrix operations, Singly & Doubly Linked Lists, "
                    "Stack applications (Infix to Postfix, Parenthesis Matching), Queue & Deque operations, "
                    "Binary Trees, BST, AVL Trees (Rotations and Balancing factors), Heaps (Min/Max Heap, "
                    "Heapify complexity), Graph Traversals (BFS, DFS), Shortest Path (Dijkstra, Bellman-Ford, "
                    "Floyd-Warshall), and Minimum Spanning Trees (Kruskal, Prim)."
                ),
            },
            {
                "title": "CAT: Quantitative Aptitude — Key Formulas & Shortcuts",
                "content_type": ResourceContentType.DOCUMENT,
                "video_url": None,
                "content": (
                    "Essential formula compendium and shortcut techniques for CAT Quant: "
                    "Number Systems (Remainders, Euler totient, Wilson's theorem, highest power of primes), "
                    "Arithmetic (Percentages, Profit & Loss, Simple & Compound Interest, Ratio & Proportion, "
                    "Time, Speed & Distance, Relative Speed, Escalators, Boats & Streams, Time & Work, Pipes & Cisterns), "
                    "Algebra (Quadratic equations, Maxima/Minima, Logarithms, Progressions AP/GP/HP, Inequalities), "
                    "and Geometry (Triangles, Circles, Quadrilaterals, Coordinate Geometry, Mensuration 3D)."
                ),
            },
            {
                "title": "GATE Previous Year Questions: Computer Networks (2020-2025)",
                "content_type": ResourceContentType.DOCUMENT,
                "video_url": None,
                "content": (
                    "Curated collection of 50+ solved GATE questions with step-by-step explanations: "
                    "OSI & TCP/IP layers, Framing & Error Detection (CRC, Hamming code), Sliding Window Protocols "
                    "(Stop & Wait, Go-Back-N, Selective Repeat with efficiency calculation), Flow & Congestion Control, "
                    "IPv4 and IPv6 addressing, CIDR subnetting and supernetting, Routing Algorithms (Distance Vector, "
                    "Link State, Count-to-Infinity problem), TCP 3-way handshake and connection teardown, "
                    "DNS, DHCP, HTTP/HTTPS, and Network Security (RSA, DES, SSL/TLS)."
                ),
            },
            {
                "title": "CAT Reading Comprehension: Strategy & Practice Guide",
                "content_type": ResourceContentType.BLOG,
                "video_url": None,
                "content": (
                    "Mastering the VARC section requires strategic skimming, tone detection, and eliminating traps. "
                    "Key strategies discussed: "
                    "1. Identifying Main Idea vs. Secondary Details. "
                    "2. Detecting Author's Tone (Analytical, Sarcastic, Objective, Laudatory, Skeptical). "
                    "3. Handling Inference and Application questions. "
                    "4. Avoiding Extreme Option Traps (Words like 'Always', 'Never', 'Only'). "
                    "5. Time management: 8 minutes per 4-question passage with recommended 32-minute target for 4 passages."
                ),
            },
            {
                "title": "GATE CS: Operating Systems — Must-Know Concepts",
                "content_type": ResourceContentType.DOCUMENT,
                "video_url": None,
                "content": (
                    "Core summary covering Process Management (States, PCB, Context Switching), "
                    "CPU Scheduling Algorithms (FCFS, SJF, SRTF, Round Robin with Gantt charts and turnaround time calculations), "
                    "Synchronization (Critical Section problem, Peterson's solution, Semaphores, Producer-Consumer, Readers-Writers, Dining Philosophers), "
                    "Deadlocks (4 necessary conditions, Resource Allocation Graphs, Banker's Safety Algorithm, Detection & Recovery), "
                    "Memory Management (Paging, Multi-level Paging, Inverted Page Table, Segmentation, TLB hits/misses, Effective Memory Access Time), "
                    "Virtual Memory (Page Replacement: FIFO, LRU, Optimal, Belady's Anomaly), and File Systems & Disk Scheduling (SSTF, SCAN, C-SCAN)."
                ),
            },
            {
                "title": "Introduction to GATE CS Exam Pattern & Syllabus 2027",
                "content_type": ResourceContentType.BLOG,
                "video_url": None,
                "content": (
                    "A breakdown of the GATE Computer Science & Information Technology examination: "
                    "Total Marks: 100, Duration: 3 hours, Total Questions: 65 (MCQs, MSQs, and NATs). "
                    "Weightage Distribution: General Aptitude (15 marks), Engineering Mathematics (13 marks), "
                    "Core Computer Science (72 marks). "
                    "Key subjects to prioritize: Algorithms & DS, Operating Systems, Computer Networks, Theory of Computation, "
                    "Compiler Design, and DBMS. Recommended preparation timeline for 3rd and 4th year engineering students."
                ),
            },
        ]

        created_res_count = 0
        for item in starter_resources:
            existing = db.scalar(
                select(Resource).where(
                    Resource.college_id == bvm.id,
                    Resource.category == ResourceCategory.GATE_CAT_PREP,
                    Resource.title == item["title"],
                )
            )
            if not existing:
                res = Resource(
                    college_id=bvm.id,
                    title=item["title"],
                    category=ResourceCategory.GATE_CAT_PREP,
                    content_type=item["content_type"],
                    video_url=item["video_url"],
                    content=item["content"],
                    created_by=creator.id,
                )
                db.add(res)
                created_res_count += 1
                print(f"Added resource: '{item['title']}' ({item['content_type'].value})")
            else:
                print(f"Resource '{item['title']}' already exists.")

        db.commit()
        print(f"\nFinished seeding! Added {created_res_count} new starter resources.")
        print(f"GATE & CAT Exam Prep feature (gate_cat_prep) is in DRAFT status and active for BVM only.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_gate_cat_prep()
