import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models.user import User
from ..models.exam import Exam
from ..models.question import Question, RubricItem
from ..models.submission import Submission
from ..models.evaluation import AnswerEvaluation
from ..models.audit import AuditLog
from .auth import get_password_hash
from ..services.ai_grader import ai_grader

router = APIRouter(prefix="/api/seed", tags=["Seed Demo Data"])

@router.post("/demo-data")
def seed_all_demo_data(db: Session = Depends(get_db)):
    """
    Seeds comprehensive realistic demonstration exams covering both Scenario A and Scenario B.
    """
    # 1. Create Default Teacher
    teacher = db.query(User).filter(User.email == "teacher@smartgrade.edu").first()
    if not teacher:
        teacher = User(
            email="teacher@smartgrade.edu",
            full_name="Prof. Eleanor Vance",
            hashed_password=get_password_hash("teacher123"),
            role="teacher"
        )
        db.add(teacher)
        db.flush()

    # Clear existing demo exams if present to refresh cleanly
    existing_exams = db.query(Exam).filter(Exam.exam_code.in_(["CS301-MID", "ENV204-FINAL"])).all()
    for ex in existing_exams:
        db.delete(ex)
    db.commit()

    # =========================================================================
    # SCENARIO A: Notes-Grounded Evaluation (Computer Science - OS)
    # =========================================================================
    exam_a = Exam(
        title="CS301: Operating Systems & Virtualization",
        subject="Computer Science",
        exam_code="CS301-MID",
        total_marks=25.0,
        pass_marks=10.0,
        term="Fall Mid-Term",
        grace_marks=1.0,
        grading_mode="notes_grounded",
        status="in_review",
        allow_student_upload=True,
        created_by_id=teacher.id,
        notes_extracted_text=(
            "Operating Systems Lecture Notes - Unit 3 & 4\n\n"
            "Deadlock Conditions (Coffman):\n"
            "1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.\n"
            "2. Hold and Wait: A process must be holding at least one resource and waiting to acquire additional resources held by other processes.\n"
            "3. No Preemption: Resources cannot be preempted; a resource can be released only voluntarily by the process holding it.\n"
            "4. Circular Wait: A set of waiting processes {P0, P1, ..., Pn} exists such that P0 is waiting for a resource held by P1, and Pn is waiting for P0.\n"
            "Prevention vs Avoidance: Prevention invalidates one of the four necessary conditions statically. Avoidance uses dynamic state algorithms like Banker's Algorithm.\n\n"
            "Virtual Memory & Paging:\n"
            "Virtual memory separates user logical memory from physical storage. Page tables map virtual page numbers (VPN) to physical frame numbers (PFN). "
            "When an unmapped or non-resident page is accessed, the MMU triggers a Page Fault trap: OS locates page on backing store, loads it into a free frame, updates page table, and restarts instruction.\n\n"
            "Microkernel vs Monolithic:\n"
            "Monolithic runs all OS services (VFS, IPC, Drivers, Scheduler) in kernel space (fast, but driver crash crashes OS). Microkernel runs minimal services (IPC, basic scheduling) in kernel space and drivers/servers in user space (higher reliability, but IPC context switch overhead)."
        )
    )
    db.add(exam_a)
    db.flush()

    # Questions for Exam A
    q1_a = Question(
        exam_id=exam_a.id,
        question_number="Q1",
        question_text="Explain the four Coffman conditions required for a deadlock. How does deadlock prevention differ from deadlock avoidance?",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Four Coffman conditions: 1) Mutual Exclusion, 2) Hold and Wait, 3) No Preemption, 4) Circular Wait. Prevention invalidates at least one condition statically, whereas avoidance dynamically checks state using algorithms like Banker's.",
        order_idx=0
    )
    q2_a = Question(
        exam_id=exam_a.id,
        question_number="Q2",
        question_text="Define Virtual Memory. Detail the role of Page Tables and the sequence of events during a Page Fault.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Virtual memory provides memory abstraction. Page tables map virtual pages to physical frames. On page fault: MMU trap -> OS traps -> load page from swap to free frame -> update page table valid bit -> restart instruction.",
        order_idx=1
    )
    q3_a = Question(
        exam_id=exam_a.id,
        question_number="Q3",
        question_text="Differentiate between Monolithic and Microkernel operating system architectures.",
        max_marks=5.0,
        grading_type="concept_coverage",
        model_answer="Monolithic kernels run all OS services in kernel mode (high performance, lower fault isolation). Microkernels keep only minimal primitives in kernel space and run drivers/filesystems in user space (modular, high reliability, IPC overhead).",
        order_idx=2
    )
    db.add_all([q1_a, q2_a, q3_a])
    db.flush()

    # Rubric Items for Exam A Questions
    db.add_all([
        RubricItem(question_id=q1_a.id, concept_title="Mutual Exclusion & Hold-and-Wait", description="Accurate definition of non-shareable resources and processes holding while requesting more", weight_marks=2.5, keywords="mutual exclusion, hold and wait, non-shareable, resource", order_idx=0),
        RubricItem(question_id=q1_a.id, concept_title="No Preemption & Circular Wait", description="Resources cannot be forcibly seized and circular dependency chain", weight_marks=2.5, keywords="no preemption, circular wait, chain, process", order_idx=1),
        RubricItem(question_id=q1_a.id, concept_title="Deadlock Prevention Strategy", description="Static elimination of at least one Coffman condition", weight_marks=2.5, keywords="prevention, static, invalidate, eliminate", order_idx=2),
        RubricItem(question_id=q1_a.id, concept_title="Deadlock Avoidance & Banker's Algorithm", description="Dynamic state monitoring and safe state verification", weight_marks=2.5, keywords="avoidance, dynamic, safe state, banker's algorithm", order_idx=3),

        RubricItem(question_id=q2_a.id, concept_title="Virtual Memory Definition & Abstraction", description="Logical address space separation from physical RAM", weight_marks=3.0, keywords="virtual memory, logical address, physical memory, abstraction", order_idx=0),
        RubricItem(question_id=q2_a.id, concept_title="Page Table Address Translation", description="Mapping virtual page numbers (VPN) to physical frames (PFN)", weight_marks=3.5, keywords="page table, translation, VPN, PFN, frame, offset", order_idx=1),
        RubricItem(question_id=q2_a.id, concept_title="Page Fault Handling Steps", description="Trap to OS, disk fetch, frame allocation, page table update, instruction restart", weight_marks=3.5, keywords="page fault, trap, disk, swap, frame, restart instruction", order_idx=2),

        RubricItem(question_id=q3_a.id, concept_title="Monolithic Architecture & Performance", description="All subsystems in kernel space, fast direct calls, monolithic vulnerability", weight_marks=2.5, keywords="monolithic, kernel space, monolithic performance, drivers", order_idx=0),
        RubricItem(question_id=q3_a.id, concept_title="Microkernel Architecture & Fault Isolation", description="Minimal core in kernel, services in user space, message passing IPC", weight_marks=2.5, keywords="microkernel, user space, IPC, message passing, reliability", order_idx=1)
    ])
    db.flush()

    # Submissions for Exam A
    subs_a = [
        {
            "roll": "21CS001",
            "name": "Aarav Patel",
            "email": "aarav.patel@student.edu",
            "ocr_conf": 98.5,
            "is_verified": True,
            "text": (
                "Ans 1: A deadlock occurs when four Coffman conditions hold: Mutual Exclusion (non-shareable resources), Hold and Wait (processes hold allocated resources while requesting new ones), No Preemption (resources cannot be seized until voluntarily released), and Circular Wait (a closed loop of processes waiting for each other). Deadlock prevention statically disallows one condition. Deadlock avoidance dynamically evaluates resource allocation to stay in a safe state, such as with Banker's Algorithm.\n\n"
                "Ans 2: Virtual memory is a technique providing the illusion of a large contiguous memory by separating logical from physical address spaces. The Page Table translates virtual page numbers to physical frame numbers using page table entries. When a page is not resident, the MMU triggers a Page Fault. The OS traps, fetches the page from swap disk into a free physical frame, updates the page table valid bit, and restarts the faulted instruction.\n\n"
                "Ans 3: Monolithic kernels execute all OS services (file systems, networking, device drivers) in privileged kernel space, ensuring high performance but allowing a driver bug to crash the entire system. Microkernels execute only core scheduling and IPC in kernel space, running file systems and device drivers as user space servers, increasing modularity and crash resilience."
            )
        },
        {
            "roll": "21CS014",
            "name": "Elena Rostova",
            "email": "elena.rostova@student.edu",
            "ocr_conf": 94.0,
            "is_verified": True,
            "text": (
                "Ans 1: Deadlocks need 4 conditions: mutual exclusion, hold & wait, no preemption, circular wait. Prevention means we break one condition beforehand (like ordering resource requests). Avoidance checks every request at runtime using Banker's algorithm to avoid unsafe states.\n\n"
                "Ans 2: Virtual memory maps virtual memory to physical RAM. Page table translates page number to frame. In a page fault, OS traps, loads missing page from hard drive, and updates the table.\n\n"
                "Ans 3: Monolithic puts everything inside kernel space. Microkernel puts drivers in user space and uses message passing. Microkernel is safer but can be slower due to context switches."
            )
        },
        {
            "roll": "21CS029",
            "name": "Marcus Vance",
            "email": "marcus.vance@student.edu",
            "ocr_conf": 58.0,  # Scanned image with low OCR confidence!
            "is_verified": False,
            "text": (
                "Ans 1: Deadlock has mutual exclusion, hold and wait, no preemption, circular wait. Prevention breaks one rule. Avoidance uses safe state algorithms.\n\n"
                "Ans 2: Virtual memory separates logical addresses from physical memory using page tables. Page fault happens when page is in swap, OS loads it into RAM.\n\n"
                "Ans 3: Monolithic has all services in kernel. Microkernel moves drivers to user space."
            )
        },
        {
            "roll": "21CS042",
            "name": "Sophia Chen",
            "email": "sophia.chen@student.edu",
            "ocr_conf": 91.0,
            "is_verified": True,
            "text": (
                "Ans 1: Deadlock is when computers freeze. It happens with mutual exclusion and waiting. Prevention is stopping it.\n\n"
                "Ans 2: Virtual memory is extra RAM from the hard disk. Page fault is an error message when RAM is full.\n\n"
                "Ans 3: Monolithic is big and old. Microkernel is smaller."
            )
        }
    ]

    for s_info in subs_a:
        sub = Submission(
            exam_id=exam_a.id,
            student_roll=s_info["roll"],
            student_name=s_info["name"],
            student_email=s_info["email"],
            original_filename=f"{s_info['roll']}_{s_info['name'].replace(' ', '_')}.pdf",
            file_path=f"/uploads/submissions/{exam_a.id}_{s_info['roll']}.pdf",
            file_type="pdf" if s_info["ocr_conf"] > 70 else "image",
            extracted_text=s_info["text"],
            ocr_confidence=s_info["ocr_conf"],
            is_ocr_verified=s_info["is_verified"],
            submission_type="teacher_bulk",
            status="ocr_flagged" if (s_info["ocr_conf"] < 70 and not s_info["is_verified"]) else "ready_for_grading"
        )
        db.add(sub)
        db.flush()

        # Grade eligible submissions
        if sub.status == "ready_for_grading":
            # Grade Q1, Q2, Q3
            answers = {
                q1_a.id: s_info["text"].split("Ans 2:")[0].replace("Ans 1:", "").strip(),
                q2_a.id: s_info["text"].split("Ans 2:")[1].split("Ans 3:")[0].strip() if "Ans 2:" in s_info["text"] and "Ans 3:" in s_info["text"] else "",
                q3_a.id: s_info["text"].split("Ans 3:")[1].strip() if "Ans 3:" in s_info["text"] else ""
            }
            total_score = 0.0
            for q in [q1_a, q2_a, q3_a]:
                ans_text = answers.get(q.id, "")
                res = ai_grader.grade_answer(q, ans_text, grading_mode="notes_grounded", teacher_notes=exam_a.notes_extracted_text)
                
                # Sample override for Elena on Q2 to demonstrate audit trail
                is_override = (s_info["roll"] == "21CS014" and q.id == q2_a.id)
                final_m = 8.5 if is_override else res["awarded_marks"]

                ev = AnswerEvaluation(
                    submission_id=sub.id,
                    question_id=q.id,
                    student_answer_text=ans_text,
                    ai_awarded_marks=res["awarded_marks"],
                    final_marks=final_m,
                    confidence_score=res["confidence_score"],
                    strengths=json.dumps(res["strengths"]),
                    missed_concepts=json.dumps(res["missed_concepts"]),
                    lost_marks_reason=res["lost_marks_reason"],
                    improvement_suggestions=res["improvement_suggestions"],
                    contradictions_detected=json.dumps(res["contradictions"]),
                    web_evidence=json.dumps([]),
                    is_overridden=is_override,
                    override_reason="Awarded partial credit for concise explanation of trap and swap loading." if is_override else None,
                    override_by="Prof. Eleanor Vance" if is_override else None
                )
                db.add(ev)
                total_score += final_m

                if is_override:
                    db.add(AuditLog(
                        exam_id=exam_a.id,
                        submission_id=sub.id,
                        question_id=q.id,
                        user_email=teacher.email,
                        action="MARK_OVERRIDE",
                        old_value=str(res["awarded_marks"]),
                        new_value="8.5",
                        reason="Awarded partial credit for concise explanation of trap and swap loading."
                    ))

            total_with_grace = min(exam_a.total_marks, total_score + exam_a.grace_marks)
            sub.total_awarded_marks = round(total_with_grace, 2)
            sub.percentage = round((total_with_grace / exam_a.total_marks) * 100, 1)
            sub.passed = (total_with_grace >= exam_a.pass_marks)
            sub.status = "in_review"

    # =========================================================================
    # SCENARIO B: Rubric + Internet-Validated Evaluation (Environmental Science)
    # =========================================================================
    exam_b = Exam(
        title="ENV204: Environmental Science & Bio-Energetics",
        subject="Environmental Science",
        exam_code="ENV204-FINAL",
        total_marks=20.0,
        pass_marks=8.0,
        term="Spring Final",
        grace_marks=0.0,
        grading_mode="rubric_web_validated",
        status="in_review",
        allow_student_upload=True,
        created_by_id=teacher.id,
        marking_scheme_text=(
            "Official Marking Scheme - ENV204 Final Examination\n\n"
            "Question 1: Photosynthesis Mechanism (10 Marks)\n"
            "- Light-dependent reactions (Thylakoids, chlorophyll absorbs photons, photolysis of water, ATP and NADPH generated): 5.0 Marks\n"
            "- Calvin cycle / Light-independent reactions (Stroma, CO2 fixation via RuBisCO, glucose synthesis): 5.0 Marks\n\n"
            "Question 2: Cellular Respiration Pathways (10 Marks)\n"
            "- Stages: Glycolysis (cytoplasm), Krebs cycle (mitochondrial matrix), Electron Transport Chain (inner membrane): 5.0 Marks\n"
            "- ATP yield comparison: Aerobic (~30-32 ATP with oxygen) vs Anaerobic/Fermentation (2 ATP, lactic acid/ethanol): 5.0 Marks"
        )
    )
    db.add(exam_b)
    db.flush()

    q1_b = Question(
        exam_id=exam_b.id,
        question_number="Q1",
        question_text="Explain the biochemical mechanism of photosynthesis, distinguishing between the light-dependent reactions and the Calvin cycle.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Photosynthesis: Light reactions occur in thylakoid membranes generating ATP and NADPH from water photolysis. Calvin cycle occurs in stroma using RuBisCO to fix CO2 into glucose.",
        order_idx=0
    )
    q2_b = Question(
        exam_id=exam_b.id,
        question_number="Q2",
        question_text="Describe the stages of cellular respiration and contrast the ATP yield between aerobic and anaerobic pathways.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Cellular respiration: Glycolysis in cytoplasm, Krebs cycle in matrix, ETC on inner mitochondrial membrane. Aerobic respiration yields 30-32 ATP with oxygen as final electron acceptor; anaerobic yields only 2 ATP.",
        order_idx=1
    )
    db.add_all([q1_b, q2_b])
    db.flush()

    db.add_all([
        RubricItem(question_id=q1_b.id, concept_title="Light-Dependent Reactions (Thylakoid)", description="Photon absorption by chlorophyll, photolysis of water, ATP and NADPH synthesis", weight_marks=5.0, keywords="thylakoid, chlorophyll, photon, photolysis, ATP, NADPH", order_idx=0),
        RubricItem(question_id=q1_b.id, concept_title="Calvin Cycle & CO2 Fixation (Stroma)", description="Light-independent CO2 fixation using RuBisCO enzyme to produce glucose", weight_marks=5.0, keywords="calvin cycle, stroma, CO2, RuBisCO, glucose", order_idx=1),
        RubricItem(question_id=q2_b.id, concept_title="Three Respiration Stages & Locations", description="Glycolysis in cytoplasm, Krebs cycle in matrix, Electron Transport Chain on inner membrane", weight_marks=5.0, keywords="glycolysis, cytoplasm, krebs cycle, mitochondrial matrix, electron transport chain", order_idx=0),
        RubricItem(question_id=q2_b.id, concept_title="Aerobic vs Anaerobic ATP Yield", description="Aerobic produces ~30-32 ATP; anaerobic fermentation yields 2 ATP without oxygen", weight_marks=5.0, keywords="aerobic, anaerobic, ATP yield, oxygen, fermentation, 32 ATP", order_idx=1)
    ])
    db.flush()

    # Submissions for Exam B
    subs_b = [
        {
            "roll": "22ENV001",
            "name": "Devin Murphy",
            "email": "devin.murphy@student.edu",
            "ocr_conf": 96.0,
            "text": (
                "Ans 1: Photosynthesis occurs in two phases. In the light-dependent reactions within thylakoid membranes, chlorophyll captures sunlight and splits water molecules through photolysis, generating oxygen, ATP, and NADPH. In the stroma, the Calvin cycle fixes CO2 using the RuBisCO enzyme and chemical energy from ATP/NADPH to synthesize glucose.\n\n"
                "Ans 2: Cellular respiration consists of Glycolysis in the cytoplasm, the Krebs Cycle in the mitochondrial matrix, and the Electron Transport Chain in the inner mitochondrial membrane. Aerobic respiration utilizes oxygen as the terminal electron acceptor to generate ~32 ATP per glucose. In contrast, anaerobic respiration / fermentation occurs without oxygen, producing only 2 ATP."
            )
        },
        {
            "roll": "22ENV007",
            "name": "Priya Nair",
            "email": "priya.nair@student.edu",
            "ocr_conf": 92.0,
            "text": (
                "Ans 1: Photosynthesis converts light to glucose. Light reactions happen in thylakoids making ATP and NADPH. Calvin cycle happens in the stroma and fixes carbon dioxide into sugar.\n\n"
                "Ans 2: Respiration has glycolysis, Krebs cycle, and electron transport chain. Aerobic respiration produces 30 to 32 ATP using oxygen, while anaerobic respiration only produces 2 ATP through fermentation."
            )
        }
    ]

    for s_info in subs_b:
        sub = Submission(
            exam_id=exam_b.id,
            student_roll=s_info["roll"],
            student_name=s_info["name"],
            student_email=s_info["email"],
            original_filename=f"{s_info['roll']}_{s_info['name'].replace(' ', '_')}.docx",
            file_path=f"/uploads/submissions/{exam_b.id}_{s_info['roll']}.docx",
            file_type="docx",
            extracted_text=s_info["text"],
            ocr_confidence=s_info["ocr_conf"],
            is_ocr_verified=True,
            submission_type="teacher_bulk",
            status="graded"
        )
        db.add(sub)
        db.flush()

        # Grade with Scenario B (Web Validation)
        answers = {
            q1_b.id: s_info["text"].split("Ans 2:")[0].replace("Ans 1:", "").strip(),
            q2_b.id: s_info["text"].split("Ans 2:")[1].strip() if "Ans 2:" in s_info["text"] else ""
        }
        total_score = 0.0
        for q in [q1_b, q2_b]:
            ans_text = answers.get(q.id, "")
            res = ai_grader.grade_answer(q, ans_text, grading_mode="rubric_web_validated")

            ev = AnswerEvaluation(
                submission_id=sub.id,
                question_id=q.id,
                student_answer_text=ans_text,
                ai_awarded_marks=res["awarded_marks"],
                final_marks=res["awarded_marks"],
                confidence_score=res["confidence_score"],
                strengths=json.dumps(res["strengths"]),
                missed_concepts=json.dumps(res["missed_concepts"]),
                lost_marks_reason=res["lost_marks_reason"],
                improvement_suggestions=res["improvement_suggestions"],
                contradictions_detected=json.dumps(res["contradictions"]),
                web_evidence=json.dumps(res["web_evidence"]),
                is_overridden=False
            )
            db.add(ev)
            total_score += res["awarded_marks"]

        sub.total_awarded_marks = round(total_score, 2)
        sub.percentage = round((total_score / exam_b.total_marks) * 100, 1)
        sub.passed = (total_score >= exam_b.pass_marks)

    db.commit()
    return {
        "success": True,
        "message": "Demo data successfully seeded for Scenario A (Notes-Grounded OS) and Scenario B (Rubric + Web-Validated ENV).",
        "exams_seeded": [
            {"exam_id": exam_a.id, "code": exam_a.exam_code, "title": exam_a.title, "mode": exam_a.grading_mode},
            {"exam_id": exam_b.id, "code": exam_b.exam_code, "title": exam_b.title, "mode": exam_b.grading_mode}
        ]
    }
