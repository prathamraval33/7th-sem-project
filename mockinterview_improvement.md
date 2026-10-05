# mockinterview_improvement.md — AI Mock Interview System: Full Rewrite Spec

## How to use this document

You are working on the AI Mock Interview feature of an existing placement portal (FastAPI + SQLAlchemy 2.0 + PostgreSQL backend, React + Vite + Tailwind frontend, Groq API with `llama-3.3-70b-versatile` model). The base feature already exists and works — sessions are created, questions are generated, answers are submitted, and results are shown. This document specifies a set of targeted improvements to the existing logic. Do not rebuild from scratch. Read the existing files first (`interview_engine.py`, `mock_interview.py`, `groq_client.py`, `MockInterviewSetupPage.jsx`, `MockInterviewSessionPage.jsx`, `MockInterviewResultPage.jsx`) and then apply the changes described here on top of what already exists.

The changes in this document cover five areas:
1. Company-aware question generation with full deduplication
2. Interview-style questions (not quiz/aptitude-puzzle style)
3. Resume mode rewritten to actually ask resume-specific questions
4. Rating system replaced from 0-100 numeric to four named bands
5. Student-selected difficulty level applied across the whole session

Read all five parts before touching any code. Several changes interact with each other — for example, the difficulty level chosen in Part 5 feeds into both the question generation prompt in Part 1 and the evaluation prompt in Part 4, so implementing them in isolation would produce an incomplete result.

---

## PART 1 — Company-Aware Question Generation with Full Deduplication

### 1.1 The problem being fixed
The current question generation prompt passes the company name as a string but gives the AI no information about how that company actually conducts interviews. A TCS interview is fundamentally different from a Google interview — different question style, different depth expected, different evaluation criteria. Without this context, the AI generates generic questions that could belong to any company, defeating the purpose of a company-specific mock interview. Additionally, the current prompt does not pass previously asked questions into context, which means the AI can and does repeat similar questions across the session.

### 1.2 Company style map — add to interview_engine.py
Add this dictionary at the top of `interview_engine.py`, outside any class or function, as a module-level constant. This is the source of truth for how each company's interview style is described to the AI. When a student enters a company name, normalize it to lowercase and strip whitespace before looking it up. If the name is not found in the map, use the "default" entry — do not error out.

```python
COMPANY_INTERVIEW_STYLES = {
    "google": "focuses on problem-solving approach, system design thinking, and explaining reasoning step by step. Rarely asks definition questions. Always asks 'why' and 'how would you scale this'. Expects candidates to think aloud and challenge their own assumptions.",
    "tcs": "focuses on basic CS fundamentals, communication skills, and straightforward technical definitions. Questions are direct and not puzzle-style. HR fit is heavily weighted.",
    "amazon": "leadership-principle-heavy behavioral questions mixed with DSA. Always ties technical questions back to real-world product impact. Expects candidates to reference past experience using the STAR format.",
    "infosys": "verbal aptitude, basic programming logic, and straightforward HR questions. Not heavy on advanced DSA. Expects clarity of communication more than technical depth.",
    "microsoft": "deep technical depth, system design, and behavioral questions. Expects candidates to think aloud, arrive at answers collaboratively, and challenge their own initial approach.",
    "wipro": "communication-heavy, basic technical concepts, and situational HR. Emphasizes teamwork and adaptability over raw technical skill.",
    "cognizant": "similar to TCS and Infosys — fundamental CS, verbal reasoning, and HR. Expects clear communication and basic project knowledge.",
    "flipkart": "strong DSA focus, system design for scale, and product thinking. Closer to Google/Amazon style than service companies.",
    "adobe": "creative problem-solving, strong DSA, and product design thinking. Expects candidates to discuss trade-offs and user experience considerations.",
    "oracle": "database and backend heavy — SQL, data structures, and system architecture. Behavioral questions focus on problem-solving in ambiguous situations.",
    "default": "standard placement interview style — balanced technical, behavioral, and problem-solving questions appropriate for a campus placement drive."
}
```

### 1.3 New question generation prompt — replaces _generate_question's current prompt entirely

The following is the exact system prompt and user prompt to use. Replace whatever the current `_generate_question` function sends to Groq with this. Every placeholder in curly braces must be filled before the call is made.

`{company_name}` — the student's entered company name (title-cased for display)
`{company_style}` — looked up from COMPANY_INTERVIEW_STYLES using the normalized name
`{stage}` — current interview stage (aptitude / technical / coding / hr)
`{difficulty_label}` — the student's chosen difficulty (see Part 5)
`{difficulty_instruction}` — expanded instruction string derived from difficulty (see Part 5)
`{n}` — current question number (1-indexed)
`{total}` — total questions in this session (typically 10)
`{previous_questions_json}` — a JSON array of all question_text strings asked so far in this session. On the first question this is an empty array `[]`. This must be passed on EVERY call — it is the deduplication mechanism.

```
SYSTEM PROMPT:
You are a senior interviewer at {company_name}. Your company's interview style: {company_style}

This is a MOCK INTERVIEW simulating a real face-to-face or video interview — not a practice test, not a quiz. Ask questions exactly the way a real interviewer would ask them in an actual interview conversation.

Current stage: {stage}
Difficulty: {difficulty_label}
{difficulty_instruction}
Question {n} of {total}

Stage-specific rules you must follow without exception:

APTITUDE stage: Ask verbal reasoning, estimation, or situational judgment questions — the kind a real interviewer asks in conversation. NOT arithmetic puzzles ("a train travels 60km..."). Ask things like "How would you approach a problem where you have incomplete information?" or "Walk me through how you'd estimate the number of ATMs in a city." The question should test logical thinking, not arithmetic speed.

TECHNICAL stage: Ask concept-understanding and application questions, not definition lookups. "Explain how you would design X" or "What trade-offs would you consider when choosing between X and Y?" — not "Define X." Expect the candidate to explain their reasoning, not recite a textbook answer.

CODING stage: Describe a coding problem verbally as a real interviewer would in a conversation — natural language, not a formatted problem statement. "Given a list of numbers, how would you find all pairs that sum to a target?" not a LeetCode-formatted block of text with constraints and examples. The student will type code or pseudocode in response.

HR stage: Ask genuine behavioral questions about past experience, approach to challenges, teamwork, and professional values. Use the STAR format implicitly — questions should naturally invite a structured response without explicitly saying "use STAR."

Deduplication — this is mandatory: do not generate a question that is the same as, similar to, or a rephrasing of any question in this list: {previous_questions_json}. If you find yourself wanting to ask about the same topic, pick a different angle or a different topic entirely.

Vary your question opening — do not start consecutive questions with the same word or phrase.

Respond ONLY with a valid JSON object, no surrounding text, no markdown:
{"question_text": string, "q_type": string, "difficulty": string, "interviewer_note": string}

q_type must be one of: "aptitude", "technical", "coding", "hr", "resume"
difficulty must be one of: "easy", "medium", "hard"
interviewer_note is a one-sentence internal note on what a complete answer should cover — this is shown to the student ONLY after they submit their answer, never before.

USER PROMPT:
Generate the next interview question for stage "{stage}".
```

### 1.4 Implementation notes
- The `previous_questions_json` list must be built by querying all existing `Question` rows for the current session and extracting their `question_text` values into a Python list, then `json.dumps`-ing that list before interpolation into the prompt.
- The `interviewer_note` field returned by the AI should be stored on the `Question` model (add this column if it does not already exist: `interviewer_note TEXT nullable`).
- The `interviewer_note` must NOT be sent to the frontend when delivering a question to the student. It must only be included in the answer evaluation response (see Part 4) after the student has submitted their answer.

---

## PART 2 — Resume Mode: Full Rewrite

### 2.1 The problem being fixed
The current resume mode substitutes the resume text in place of the `skills` field in the standard question generation prompt. This means the AI is not actually being instructed to ask resume-specific questions — it is just using resume content as a richer skills description and generating the same kind of generic questions it would otherwise. The student ends up getting technical questions about topics mentioned in their resume rather than genuine "I read your resume, tell me about this specific thing you did" questions that characterize a real interview.

### 2.2 Resume mode question generation prompt — completely replaces the current approach

When the session was started with `mode="resume"` (or however the resume-based mode is currently flagged), use this prompt instead of the standard one from Part 1.

`{full_resume_text}` — the complete parsed text of the selected resume. Do NOT truncate this to 2000 characters. Pass the full content. If the resume parser produces very long output, truncate at 4000 characters rather than 2000, preferring to keep the projects and experience sections over the skills header section if a choice must be made.
`{previous_questions_json}` — same as Part 1, full list of previously asked question texts.
`{difficulty_label}` and `{difficulty_instruction}` — same as Part 1 from student's chosen difficulty.
`{n}` and `{total}` — same as Part 1.

```
SYSTEM PROMPT:
You are an interviewer who has just finished reading a candidate's resume. You are now conducting a face-to-face interview. Your job is to ask genuine follow-up questions about what they have actually written — their real projects, their actual internship or work experience, the technologies they claim to know, and the achievements they listed.

Every single question you generate must be directly traceable to something specific in their resume. Do not ask generic questions that could be asked of any candidate. If you cannot point to a specific line, project, skill, or experience on their resume that prompted this question, do not ask it.

Examples of the style you should follow:
- "I see you built a restaurant reservation system — how did you handle concurrent bookings?"
- "You listed Redis under skills — have you used it in production? Walk me through how."
- "Your internship was at X company — what was the most technically challenging problem you solved there, and how did you approach it?"
- "You mentioned React in your project — tell me about a specific component you're proud of and what made it difficult to build."
- "I notice you worked with both SQL and MongoDB — how did you decide which to use for your project, and what trade-offs did you consider?"

Difficulty: {difficulty_label}
{difficulty_instruction}
Question {n} of {total}

Previously asked questions — do not repeat or closely overlap with any of these: {previous_questions_json}

Resume content:
{full_resume_text}

Respond ONLY with a valid JSON object, no surrounding text, no markdown:
{"question_text": string, "q_type": "resume", "difficulty": string, "resume_reference": string, "interviewer_note": string}

resume_reference is the specific resume item this question is about, e.g. "Redis under Skills section" or "Restaurant reservation system project" — used for internal tracking only, never shown to the student during the question.
interviewer_note is a one-sentence note on what a strong answer should demonstrate — shown to student only after they submit their answer.

USER PROMPT:
Generate the next interview question based on the candidate's resume.
```

### 2.3 Schema addition
Add `resume_reference TEXT nullable` to the `Question` model if it does not exist. Store the value returned by the AI in this field for every resume-mode question. This is useful later for analytics (which resume sections generated the most follow-up questions, which areas the student struggled with).

---

## PART 3 — Stage Distribution Reminder (no change, but verify)

The existing stage distribution for Full Mode (10 questions) is:
- Q1-Q2: Aptitude
- Q3-Q5: Technical
- Q6-Q8: Coding
- Q9-Q10: HR

This distribution should remain unchanged. What changes is the character of the questions within each stage, per Part 1's stage-specific rules. Verify that the stage assignment logic in `interview_engine.py` correctly maps question number to stage before applying the new prompts — the prompts above depend on the `{stage}` variable being accurately set per question.

For resume mode, use a modified distribution that heavily weights the resume and technical stages:
- Q1-Q3: Resume (questions directly about resume content)
- Q4-Q6: Technical (deeper technical follow-ups on technologies from the resume)
- Q7-Q8: Coding (one coding problem related to a project/skill on the resume if possible)
- Q9-Q10: HR (behavioral questions, may reference resume achievements as anchors)

---

## PART 4 — Rating System: Replace 0-100 with Four Named Bands

### 4.1 The problem being fixed
A numeric score between 0 and 100 is meaningless in an interview context. The difference between a 68 and a 72 conveys nothing actionable to a student. More importantly, what constitutes a "70" in a behavioral HR question is completely different from a "70" in a coding question — but the current single prompt and single score field treats them identically. Replace the score entirely with a four-band categorical rating that the AI assigns based on explicit, question-type-aware criteria.

### 4.2 The four rating bands

```python
RATING_BANDS = {
    "interview_ready": {
        "color": "purple",
        "label": "Interview Ready",
        "meaning": "A real interviewer would be satisfied and move on positively. Answer is complete, structured, confident, and demonstrates real understanding."
    },
    "good": {
        "color": "yellow",
        "label": "Good",
        "meaning": "Answer covers the main point but lacks depth, a real example, or a connection to practical application. Interviewer would want a bit more."
    },
    "somewhat_closer": {
        "color": "green",
        "label": "Somewhat There",
        "meaning": "Answer shows partial understanding but misses key aspects or contains a misconception. Interviewer would probe further or redirect."
    },
    "not_relevant": {
        "color": "red",
        "label": "Not Relevant",
        "meaning": "Answer does not address the question, is too vague to evaluate, or demonstrates a significant knowledge gap."
    }
}
```

### 4.3 Answer evaluation prompt — replaces _evaluate_answer's current prompt entirely

```
SYSTEM PROMPT:
You are evaluating one answer from a mock placement interview. Assign exactly one of four rating bands based on how a real interviewer would genuinely react to this answer.

The four bands and when to use them:

"interview_ready" — The candidate answered this well. A real interviewer would be satisfied and move on. The answer is complete, clearly structured, and demonstrates real understanding. Use this only when the answer genuinely earns it — not as encouragement.

"good" — The candidate understood the question and gave a reasonable answer, but something important is missing: a concrete example, a trade-off consideration, a connection to real-world application, or sufficient depth. An interviewer would want a bit more before moving on confidently.

"somewhat_closer" — The candidate is on the right track but has a meaningful gap: a partial misconception, a missing key concept, or an answer that is too surface-level to demonstrate genuine knowledge. An interviewer would probe further or gently redirect.

"not_relevant" — The candidate did not address the question, gave a vague non-answer, confused fundamental concepts, or demonstrated a clear knowledge gap. An interviewer would note this as a concern.

Question type: {q_type}
Stage: {stage}
Difficulty: {difficulty_label}
Question: {question_text}
Candidate's answer: {answer_text}

Apply these type-specific grading criteria:

For q_type "technical": judge on correctness of understanding, depth of explanation, awareness of trade-offs, and real-world applicability. A definition alone without explanation of why or when is at most "good."

For q_type "coding": judge on algorithmic correctness, handling of edge cases, awareness of time/space complexity, and whether the code or pseudocode actually solves the stated problem. Correct brute-force with no complexity awareness = "somewhat_closer". Correct with complexity awareness = "good". Correct with complexity, edge cases, and optimization thinking = "interview_ready."

For q_type "aptitude": judge on clarity of reasoning process, logical structure of the approach, and whether the candidate arrives at a defensible answer through sound thinking — not just whether the final answer is numerically correct.

For q_type "hr": judge on STAR structure (situation, task, action, result), specificity of the example given, self-awareness demonstrated, and relevance to the question asked. Generic answers with no specific example = "somewhat_closer" at best.

For q_type "resume": judge on whether the candidate genuinely knows the detail of what they put on their resume. Vague answers about their own listed projects or skills = "not_relevant." Specific, detailed answers demonstrating real ownership = "interview_ready."

Respond ONLY with a valid JSON object, no surrounding text, no markdown:
{
  "rating": one of "interview_ready"|"good"|"somewhat_closer"|"not_relevant",
  "feedback": string,
  "what_was_missing": string or null,
  "interviewer_note_reveal": string
}

feedback: 2-3 sentences of specific, actionable feedback written as an interviewer speaking directly to the candidate in second person ("You explained X well, but you missed Y..."). Never start with "Great answer!" or generic praise. Be direct and constructive.
what_was_missing: one sentence on the single most important thing they should have added to reach the next band up. Set to null if rating is "interview_ready."
interviewer_note_reveal: copy the interviewer_note that was generated with the question — this is now revealed to the student as "what a strong answer would have covered."

USER PROMPT:
Evaluate the candidate's answer.
```

### 4.4 Schema changes
- Remove the `score` column from the `Answer` model (or keep it as nullable for backward compatibility with existing sessions).
- Add `rating VARCHAR(20)` to the `Answer` model with a check constraint allowing only the four valid values.
- Add `what_was_missing TEXT nullable` to the `Answer` model.
- The `feedback` field already exists — no change needed.

### 4.5 Numeric equivalent for readiness score calculation (internal only, never shown to student)
The existing readiness score formula in `scoring.py` uses `avg_interview_score`. To keep this working after removing the numeric score, map ratings to internal numeric equivalents in `scoring.py` only — these values are never sent to the frontend or displayed anywhere:
- `interview_ready` → 95
- `good` → 72
- `somewhat_closer` → 45
- `not_relevant` → 15

Compute `avg_interview_score` as the mean of these mapped values across all answers in the session. The readiness formula itself is unchanged.

---

## PART 5 — Student-Selected Difficulty Level

### 5.1 Overview
The student selects a difficulty level once at session setup. This choice applies to the entire session — not per question. The difficulty selection affects both the question generation prompt (what depth and complexity of question is generated) and the evaluation prompt (what standard of answer is expected for that band to be achieved). The student cannot change difficulty mid-session.

### 5.2 The three difficulty options and their prompt expansions

Add this to `interview_engine.py` as a module-level constant:

```python
DIFFICULTY_CONFIG = {
    "fresher": {
        "label": "Fresher",
        "description": "Final year student, first placement attempt",
        "generation_instruction": "The candidate is a final-year undergraduate student with academic knowledge and project experience but no industry exposure. Calibrate questions to this level: foundational concepts, project-based questions, and straightforward situational scenarios. Avoid expecting production-system experience or advanced architectural knowledge.",
        "evaluation_instruction": "Evaluate at the standard expected of a final-year undergraduate student. For 'interview_ready,' a clear foundational understanding with at least one practical example from academic projects is sufficient. Do not penalize for lack of industry experience."
    },
    "mid_level": {
        "label": "Mid-Level",
        "description": "1-2 years experience or strong academic background",
        "generation_instruction": "The candidate has 1-2 years of experience or is a strong student targeting competitive companies. Ask questions that require deeper explanation, awareness of trade-offs, and some practical application beyond textbook knowledge. Mix medium and hard difficulty.",
        "evaluation_instruction": "Evaluate at the standard of a candidate with solid fundamentals and some hands-on experience. 'Interview_ready' requires not just correct answers but demonstration of practical awareness and trade-off thinking."
    },
    "senior": {
        "label": "Senior",
        "description": "3+ years or targeting product companies",
        "generation_instruction": "The candidate is targeting top product companies or has significant experience. Ask deep technical questions requiring system design thinking, architectural trade-offs, scalability considerations, and real production experience. Hard difficulty throughout.",
        "evaluation_instruction": "Evaluate at a high bar. 'Interview_ready' requires depth, trade-off awareness, real-world applicability, and the ability to consider edge cases and scale. Surface-level correct answers should be rated 'good' at best."
    }
}
```

The values `generation_instruction` and `evaluation_instruction` are the exact strings interpolated into the question generation and answer evaluation prompts respectively as `{difficulty_instruction}`. The `label` is what appears in the UI and is stored in the session as `difficulty_level`.

### 5.3 Schema change
Add `difficulty_level VARCHAR(20)` to the `InterviewSession` model with a check constraint allowing `"fresher"`, `"mid_level"`, `"senior"`. This is set at session creation from the setup form and never changed.

### 5.4 Frontend change — setup page
On `MockInterviewSetupPage.jsx`, add a difficulty selector before the "Start Interview" button. Show three options as selectable cards or radio buttons, each showing the label and the short description from `DIFFICULTY_CONFIG`. Default to "Fresher" if the student doesn't explicitly choose. Pass the selected value to the session creation API call.

---

## PART 6 — Frontend Display Changes (MockInterviewSessionPage and ResultPage)

### 6.1 Rating display during session
After a student submits an answer and the evaluation response comes back, show the rating band visually rather than a number. The rating card should show:
- The band label in its associated color (purple / yellow / green / red per the RATING_BANDS definition in Part 4.2)
- The feedback text below it
- `what_was_missing` shown as a small note if not null, labeled something like "To reach the next level:"
- `interviewer_note_reveal` shown below that, labeled "What a strong answer covers:" — this is the reveal moment, shown only after submission

Do not show any number. Do not show "Score: X/100" anywhere on this page. The rating band label is the only score indicator.

### 6.2 Result scorecard page
The existing result page shows overall percentage and question breakdown. Replace/update:
- Overall score display: instead of a percentage, show a distribution summary — e.g., "3 Interview Ready · 4 Good · 2 Somewhat There · 1 Not Relevant" with each count in its band color
- The accordion breakdown per question should show the rating band badge (not a number) alongside the question, answer, and feedback
- `resume_reference` (for resume-mode sessions) should be shown as a small grey tag on each question card so the student can see which resume item prompted each question
- The existing weak areas section remains unchanged

---

## PART 7 — What NOT to Change

To be explicit about scope: the following parts of the existing mock interview feature should remain exactly as they are. Do not touch them:
- The session lifecycle (start → answer loop → complete) — only the prompts inside it change
- The code editor UI for coding questions — the interface stays the same
- The weak area synthesis prompt and logic — it already works and feeds the Weak Areas Tracker correctly
- The readiness score formula in `scoring.py` — only the internal numeric mapping from Part 4.5 is added
- The number of questions per session (10 for full mode, 10 for specialized modes)
- The specialized single-stage modes (technical-only, aptitude-only, coding-only, HR-only) — they use the same new prompts from Part 1, just with their stage fixed for all 10 questions
- The database relationship structure between InterviewSession, Question, and Answer — only column additions are needed, no relationship changes

---

## PART 8 — Implementation Order

Build in this order to avoid blocking dependencies:

1. Schema migrations first (add `difficulty_level` to InterviewSession, `rating`/`what_was_missing` to Answer, `interviewer_note`/`resume_reference` to Question) — everything else depends on these columns existing
2. Add `COMPANY_INTERVIEW_STYLES` and `DIFFICULTY_CONFIG` constants to `interview_engine.py`
3. Rewrite `_generate_question` with the new prompt from Part 1 — test with a few manual API calls before wiring to the router
4. Rewrite `_generate_question` resume-mode branch with the prompt from Part 2 — test separately
5. Rewrite `_evaluate_answer` with the new prompt from Part 4 — update the Answer record to store `rating` instead of (or alongside) `score`
6. Update `scoring.py` to map rating bands to numeric equivalents for readiness score calculation
7. Update `MockInterviewSetupPage.jsx` to add the difficulty selector
8. Update `MockInterviewSessionPage.jsx` to display the new rating band UI instead of a numeric score
9. Update `MockInterviewResultPage.jsx` to show the distribution summary and updated per-question breakdown
10. End-to-end test: one full fresher-mode session with a company in the map, one resume-mode session, one session with a company not in the map (should fall back to default gracefully)
