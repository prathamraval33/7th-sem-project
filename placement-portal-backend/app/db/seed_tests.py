"""Seed script to populate standard practice tests and placement drive tests."""
from app.db.session import SessionLocal
from app.models.user import User, UserType
from app.models.instant_test import InstantTest, InstantTestStatus
from app.models.drive import Drive


def seed_instant_tests():
    db = SessionLocal()
    try:
        tpo = db.query(User).filter(User.user_type == UserType.TPO).first()
        if not tpo:
            print("No TPO found to own tests. Skipping seed.")
            return

        # Check if practice test already exists
        existing_practice = db.query(InstantTest).filter(InstantTest.is_practice == True).first()
        if not existing_practice:
            questions = [
                {
                    "id": 1,
                    "question_text": "If a train travels 60 km in 45 minutes, what is its speed in km/h?",
                    "options": ["75 km/h", "80 km/h", "90 km/h", "100 km/h"],
                    "correct_option_index": 1,
                    "marks": 1,
                    "category": "Aptitude"
                },
                {
                    "id": 2,
                    "question_text": "What is the output of `System.out.println(5 + 2 + \"3\" + 4 + 1);` in Java?",
                    "options": ["7341", "15", "735", "77"],
                    "correct_option_index": 0,
                    "marks": 1,
                    "category": "Java / Programming"
                },
                {
                    "id": 3,
                    "question_text": "Which data structure uses the LIFO (Last In First Out) principle?",
                    "options": ["Queue", "Binary Tree", "Stack", "Linked List"],
                    "correct_option_index": 2,
                    "marks": 1,
                    "category": "Data Structures"
                },
                {
                    "id": 4,
                    "question_text": "Complete the analogy: Engineer is to Building as Architect is to _____.",
                    "options": ["Draft", "Blueprint", "Cement", "House"],
                    "correct_option_index": 1,
                    "marks": 1,
                    "category": "Verbal Reasoning"
                },
                {
                    "id": 5,
                    "question_text": "What is the time complexity of searching an element in a balanced Binary Search Tree (BST)?",
                    "options": ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
                    "correct_option_index": 2,
                    "marks": 1,
                    "category": "Algorithms"
                },
                {
                    "id": 6,
                    "question_text": "Which SQL command is used to remove all records from a table without logging individual row deletions?",
                    "options": ["DROP", "DELETE", "REMOVE", "TRUNCATE"],
                    "correct_option_index": 3,
                    "marks": 1,
                    "category": "DBMS"
                },
                {
                    "id": 7,
                    "question_text": "In Python, which of the following data types is immutable?",
                    "options": ["List", "Dictionary", "Tuple", "Set"],
                    "correct_option_index": 2,
                    "marks": 1,
                    "category": "Python"
                },
                {
                    "id": 8,
                    "question_text": "Find the next number in the series: 2, 6, 12, 20, 30, ___",
                    "options": ["36", "40", "42", "48"],
                    "correct_option_index": 2,
                    "marks": 1,
                    "category": "Logical Reasoning"
                },
                {
                    "id": 9,
                    "question_text": "Which layer of the OSI model is responsible for routing IP packets?",
                    "options": ["Data Link Layer", "Network Layer", "Transport Layer", "Session Layer"],
                    "correct_option_index": 1,
                    "marks": 1,
                    "category": "Networking"
                },
                {
                    "id": 10,
                    "question_text": "What is the default port number for HTTP network protocol?",
                    "options": ["21", "80", "443", "8080"],
                    "correct_option_index": 1,
                    "marks": 1,
                    "category": "Networking"
                }
            ]

            practice_test = InstantTest(
                title="General Placement Practice Test 2026",
                duration_minutes=20,
                is_practice=True,
                created_by=tpo.id,
                prompt_config={"topic": "General Placement Aptitude & Technical", "difficulty": "Medium"},
                questions=questions,
                min_passing_marks=6,
                use_top_n=False,
                status=InstantTestStatus.OPEN
            )
            db.add(practice_test)
            db.commit()
            print("Created static Practice Test successfully!")

        # Create an official drive test if any drive exists
        first_drive = db.query(Drive).first()
        existing_official = db.query(InstantTest).filter(InstantTest.is_practice == False).first()
        if not existing_official and first_drive:
            official_questions = [
                {
                    "id": 1,
                    "question_text": "What does ACID stand for in Database Systems?",
                    "options": [
                        "Atomicity, Consistency, Isolation, Durability",
                        "Accuracy, Control, Integrity, Data",
                        "Availability, Consistency, Identity, Distribution",
                        "Automated, Concurrent, Index, Disk"
                    ],
                    "correct_option_index": 0,
                    "marks": 2,
                    "category": "DBMS"
                },
                {
                    "id": 2,
                    "question_text": "Which of the following sorting algorithms has worst-case time complexity of O(n^2)?",
                    "options": ["Merge Sort", "Quick Sort", "Heap Sort", "Counting Sort"],
                    "correct_option_index": 1,
                    "marks": 2,
                    "category": "Algorithms"
                },
                {
                    "id": 3,
                    "question_text": "What is the primary difference between a process and a thread?",
                    "options": [
                        "Threads share memory space within a process",
                        "Processes run faster than threads",
                        "Threads cannot communicate with each other",
                        "Processes have no stack"
                    ],
                    "correct_option_index": 0,
                    "marks": 2,
                    "category": "Operating Systems"
                }
            ]

            company_name = first_drive.company.name if (first_drive and first_drive.company) else "Placement"
            official_test = InstantTest(
                title=f"{company_name} Official Technical Assessment",
                duration_minutes=15,
                is_practice=False,
                drive_id=first_drive.id if first_drive else None,
                created_by=tpo.id,
                prompt_config={"company": company_name, "difficulty": "Medium"},
                questions=official_questions,
                min_passing_marks=4,
                use_top_n=False,
                status=InstantTestStatus.OPEN
            )
            db.add(official_test)
            db.commit()
            print("Created static Official Drive Test successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_instant_tests()
