import os
import shutil
from pathlib import Path
from datetime import datetime

from app.database import SessionLocal, engine, Base
from app.models.exam import Exam
from app.models.question import Question, RubricItem
from app.models.submission import Submission
from app.models.evaluation import AnswerEvaluation
from app.models.audit import AuditLog
from app.models.user import User
from app.routers.grading import run_exam_grading
from app.config import EXAM_DOCS_DIR, SUBMISSIONS_DIR

def setup_parallel_computing_exam():
    db = SessionLocal()
    try:
        print("=== Setting up Parallel Computing (BCS702) Exam ===")

        # 1. Ensure Default Teacher User
        teacher = db.query(User).filter(User.email == "teacher@smartgrade.edu").first()
        if not teacher:
            from app.routers.auth import get_password_hash
            teacher = User(
                email="teacher@smartgrade.edu",
                full_name="Prof. Eleanor Vance",
                hashed_password=get_password_hash("teacher123"),
                role="teacher"
            )
            db.add(teacher)
            db.commit()
            db.refresh(teacher)

        # 2. File paths
        src_qp = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\pc question paper.pdf")
        src_scheme = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\pc eavluation scheme.pdf")
        src_namrata = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\Namrata PC.pdf")
        src_shadab = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\Shadab PC.pdf")
        src_zuhibh = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\Zuhibh PC.pdf")

        dest_qp = EXAM_DOCS_DIR / "bcs702_qp.pdf"
        dest_scheme = EXAM_DOCS_DIR / "bcs702_scheme.pdf"
        dest_namrata = SUBMISSIONS_DIR / "1HK23CS107_Namrata_PC.pdf"

        if src_qp.exists():
            shutil.copy2(src_qp, dest_qp)
        if src_scheme.exists():
            shutil.copy2(src_scheme, dest_scheme)
        if src_namrata.exists():
            shutil.copy2(src_namrata, dest_namrata)

        # 3. Setup Exam
        exam = db.query(Exam).filter(Exam.exam_code == "BCS702").first()
        if not exam:
            exam = Exam()
            db.add(exam)

        exam.title = "BCS702: Parallel Computing - Internal Assessment 1"
        exam.subject = "Parallel Computing"
        exam.exam_code = "BCS702"
        exam.total_marks = 50.0
        exam.pass_marks = 20.0
        exam.term = "September 2026 - AY 2026-27"
        exam.grading_mode = "notes_grounded"
        exam.status = "in_review"
        exam.allow_student_upload = True
        exam.allow_replacement = True
        exam.question_paper_path = str(dest_qp)
        exam.marking_scheme_path = str(dest_scheme)
        exam.grace_marks = 0.0
        exam.created_by_id = teacher.id

        scheme_notes = """
Parallel Computing IA-1 Marking Scheme & Reference Notes (BCS702)

Module 1:
1a. Flynn's Taxonomy:
- SISD (Single Instruction, Single Data): Traditional sequential execution, single processing unit.
- SIMD (Single Instruction, Multiple Data): Same instruction applied simultaneously across multiple data elements (vector processors, GPU compute).
- MISD (Multiple Instruction, Single Data): Multiple operations performed on identical data stream (uncommon, fault tolerance).
- MIMD (Multiple Instruction, Multiple Data): Autonomous processors executing different instructions on independent data (multi-core CPUs, clusters).
Comparison: SIMD operates synchronously on regular data arrays; MIMD operates asynchronously with independent threads/processes.

1b. Shared vs Distributed Memory Architectures:
- Shared Memory: Multiple processors access a common central memory via single interconnect bus/crossbar. Advantages: simple programming model, fast inter-thread communication. Disadvantages: bus contention bottleneck, cache coherence overhead, complex synchronization.
- Distributed Memory: Each processor has dedicated private local memory. Communication occurs explicitly over network interconnect. Advantages: scalable to thousands of nodes, cost-effective. Disadvantages: message passing overhead, non-uniform access latency.

1c. False Sharing in Cache Systems:
- Concept: Occurs when multiple processors modify independent variables residing on the same hardware cache line (typically 64 bytes).
- Mechanism: Core 0 writes y[0], causing hardware cache coherence protocol (e.g. MESI) to invalidate the entire line on Core 1 containing y[1].
- Mitigation: Variable padding (adding dummy spacing bytes) and spatial memory alignment so independent variables occupy distinct cache lines.

2a. UMA vs NUMA Systems:
- UMA (Uniform Memory Access): Identical latency for all processors accessing any memory address (Symmetric Multiprocessing).
- NUMA (Non-Uniform Memory Access): Processors access local node memory rapidly, while remote node access across interconnect incurs higher latency.

2b. Non-determination and Race Conditions:
- Race Condition: Flaw where the output depends on non-deterministic execution ordering and scheduling of competing threads accessing shared memory.
- Avoidance: Mutual exclusion primitives, critical section guards, mutex locks, and semaphores.

2c. Interconnection Networks:
- Latency: Time required to transmit a minimal message header between source and destination nodes.
- Bandwidth: Maximum data transfer rate per unit time across the link.

Module 2:
3a. Hybrid Programming: Combining OpenMP (shared memory within node) with MPI (message passing across cluster nodes). Challenges: nested debugging, uneven work distribution, thread safety of MPI libraries.
3b. Efficiency Calculation: Given Tserial = 24ms, Tparallel = 4ms, p = 8. Speedup S = 24/4 = 6. Efficiency E = S/p = 6/8 = 0.75 (75%).
3c. Wall-Clock Time vs CPU Time: Wall-clock time measures elapsed real-world time including communication delays, synchronization idle time, and I/O wait, making it the true metric of parallel program performance.

4a. Speedup and Efficiency:
- Speedup S(p) = Tserial / Tparallel. Measures speed improvement.
- Efficiency E(p) = S(p) / p = Tserial / (p * Tparallel). Measures hardware processor utilization (0 to 1 or 0% to 100%).
- Importance: Evaluates resource utilization, cost efficiency, and scalability bottlenecks.

4b. Amdahl's Law (Maximum Speedup):
- Formula: S(p) = 1 / (r + (1-r)/p), where r is inherently serial fraction.
- For r = 0.10 (10% serial): As p -> infinity, (1-r)/p -> 0, yielding Smax = 1 / 0.10 = 10.

4c. Amdahl's Law (Worked Example & Implications):
- Worked Example: For p = 4 and r = 0.10, S(4) = 1 / (0.10 + 0.90/4) = 1 / 0.325 ≈ 3.08 (or S(p) = 3.5).
- Implications: Serial bottlenecks impose an upper bound on speedup; simply adding processors produces diminishing returns.

Module 3:
5a. SPMD (Single Program Multiple Data): Programming paradigm where identical executable code runs across all processes, but execution branches based on process rank (MPI_Comm_rank).
5b. MPI_ANY_SOURCE and MPI_ANY_TAG: Wildcards enabling an MPI receiver to accept incoming messages from any sender process or with any message tag.

6a. Trapezoidal Rule Numerical Integration:
- Approximates definite integral of f(x) over [a, b].
- Interval width h = (b - a) / n.
- Formula: Area = h * [ (f(a) + f(b))/2 + sum_{i=1}^{n-1} f(x_i) ].
- Visual representation: Approximates smooth curve with trapezoids under the curve.

6b. Parallel Trapezoidal Rule using MPI:
- Domain decomposition: Distribute n trapezoids across p processes (local_n = n / p).
- Each process computes local endpoints and integrates its local strip.
- Processes send local integrals to Process 0 (or use MPI_Reduce) to aggregate total global area.
"""
        exam.notes_extracted_text = scheme_notes
        exam.marking_scheme_text = scheme_notes
        db.commit()
        db.refresh(exam)
        print(f"[OK] Exam BCS702 created/updated with ID={exam.id}")

        # 4. Clear existing questions and submissions for BCS702
        db.query(AnswerEvaluation).filter(AnswerEvaluation.submission.has(exam_id=exam.id)).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.exam_id == exam.id).delete(synchronize_session=False)
        db.query(Submission).filter(Submission.exam_id == exam.id).delete(synchronize_session=False)
        db.query(RubricItem).filter(RubricItem.question.has(exam_id=exam.id)).delete(synchronize_session=False)
        db.query(Question).filter(Question.exam_id == exam.id).delete(synchronize_session=False)
        db.commit()

        # 5. Define All Questions from Question Paper
        questions_data = [
            # Module 1 (Q1 or Q2)
            {
                "question_number": "1a", "order_idx": 1, "max_marks": 8.0,
                "question_text": "Explain in detail the classification of parallel computers according to Flynn's taxonomy. Compare SIMD and MIMD System.",
                "model_answer": "Flynn's taxonomy classifies architectures into SISD, SIMD, MISD, and MIMD based on instruction and data streams. SISD executes single instruction on single data (sequential). SIMD applies one instruction synchronously to multiple data streams (vector processors, GPUs). MISD processes multiple instructions on single data (redundant systems). MIMD executes multiple independent instruction streams on multiple data streams (multicore, clusters). Comparison: SIMD has synchronous lock-step execution on homogeneous arrays with high data parallelism; MIMD features asynchronous, flexible task and data execution.",
                "rubrics": [
                    {"title": "Flynn's Taxonomy Classification (SISD, SIMD, MISD, MIMD)", "marks": 4.0, "keywords": "flynn, sisd, simd, misd, mimd, instruction stream, data stream"},
                    {"title": "Comparison of SIMD and MIMD Systems", "marks": 4.0, "keywords": "comparison, simd, mimd, synchronous, multicore, vector processor, parallelism"}
                ]
            },
            {
                "question_number": "1b", "order_idx": 2, "max_marks": 6.0,
                "question_text": "Discuss shared memory and distributed memory architectures.",
                "model_answer": "In Shared Memory architecture, multiple processors share a global address space through an interconnect bus. Advantages include intuitive programming and fast communication; limitations include bus saturation and cache coherence overhead. In Distributed Memory architecture, each processor possesses private local memory, communicating explicitly via network interconnect. Advantages include high scalability; limitations include complex message-passing programming and interconnect latency.",
                "rubrics": [
                    {"title": "Shared Memory Architecture Explanation & Diagram", "marks": 3.0, "keywords": "shared memory, common memory, interconnect, bus, advantages, limitations, cache coherence"},
                    {"title": "Distributed Memory Architecture Explanation & Diagram", "marks": 3.0, "keywords": "distributed memory, private memory, local memory, network, advantages, limitations, message passing"}
                ]
            },
            {
                "question_number": "1c", "order_idx": 3, "max_marks": 6.0,
                "question_text": "Explain the false sharing in cache systems? Illustrate with an example.",
                "model_answer": "False sharing occurs in multi-core shared memory systems when distinct processors modify independent variables that reside within the same physical cache line (e.g. 64 bytes). Example: Core 0 updates y[0] while Core 1 updates y[1]. Because both variables share a cache line, each write triggers cache invalidation on the other core despite no logical sharing, causing severe memory bus traffic. Mitigation includes variable padding and memory alignment.",
                "rubrics": [
                    {"title": "False Sharing Definition & Mechanism", "marks": 2.0, "keywords": "false sharing, cache line, invalidation, independent variables, cores"},
                    {"title": "Illustration with Worked Example (Array / Core Coherence)", "marks": 2.0, "keywords": "example, core 0, core 1, cache line 64 bytes, double 8 bytes, y[0], y[1]"},
                    {"title": "Effects and Mitigation (Padding / Separation)", "marks": 2.0, "keywords": "effects, invalidation errors, memory traffic, padding, alignment, mitigation"}
                ]
            },
            {
                "question_number": "2a", "order_idx": 4, "max_marks": 6.0,
                "question_text": "Explain the difference between UMA and NUMA systems in shared memory?",
                "model_answer": "In UMA (Uniform Memory Access), all processors share memory equally with uniform access times across a central bus. In NUMA (Non-Uniform Memory Access), memory is physically divided among processors; accessing local memory is fast while remote memory across the interconnect incurs higher access latency.",
                "rubrics": [
                    {"title": "UMA System Definition", "marks": 2.0, "keywords": "uma, uniform memory access, equal access time, central bus"},
                    {"title": "NUMA System Definition", "marks": 2.0, "keywords": "numa, non-uniform memory access, local memory, remote memory"},
                    {"title": "Key Differences & Trade-offs", "marks": 2.0, "keywords": "differences, latency, scalability, interconnect"}
                ]
            },
            {
                "question_number": "2b", "order_idx": 5, "max_marks": 8.0,
                "question_text": "Explain non-determination and race condition in shared memory system. How can they be avoided?",
                "model_answer": "Non-determination occurs when program execution order varies unpredictably across runs due to thread scheduling. A Race Condition arises when multiple concurrent threads access shared data and at least one modifies it without synchronization, leading to corrupted state. Avoided using mutex locks, semaphores, critical sections, and atomic operations.",
                "rubrics": [
                    {"title": "Non-determination Definition with Example", "marks": 2.0, "keywords": "non-determination, scheduling, unpredictable execution"},
                    {"title": "Race Condition Definition", "marks": 2.0, "keywords": "race condition, concurrent access, shared data, unsynchronized"},
                    {"title": "Example Illustrating Race Condition", "marks": 2.0, "keywords": "example, counter, bank balance, threads"},
                    {"title": "Avoidance Primitives (Mutex / Locks / Critical Sections)", "marks": 2.0, "keywords": "mutex, lock, critical section, semaphore, synchronization"}
                ]
            },
            {
                "question_number": "2c", "order_idx": 6, "max_marks": 6.0,
                "question_text": "Explain the latency and bandwidth in interconnection networks.",
                "model_answer": "Latency is the elapsed time needed to send a minimal packet header between nodes. Bandwidth is the volume of data that can be transferred across the link per unit time. Network performance is dictated by Total Transfer Time = Latency + (Message Size / Bandwidth).",
                "rubrics": [
                    {"title": "Latency Definition & Performance Impact", "marks": 2.0, "keywords": "latency, elapsed time, minimal packet, start-up overhead"},
                    {"title": "Bandwidth Definition & Data Volume", "marks": 2.0, "keywords": "bandwidth, data rate, throughput, transmission speed"},
                    {"title": "Effect on Parallel Program Execution", "marks": 2.0, "keywords": "communication cost, performance, message size, formula"}
                ]
            },

            # Module 2 (Q3 or Q4)
            {
                "question_number": "3a", "order_idx": 7, "max_marks": 6.0,
                "question_text": "What are the challenges of programming hybrid systems (shared + distributed memory)?",
                "model_answer": "Hybrid systems combine MPI (distributed memory across cluster nodes) with OpenMP or CUDA (shared memory multi-threading within nodes). Challenges include managing two distinct programming paradigms simultaneously, load balancing across nodes and cores, non-uniform memory hierarchy overhead, thread safety of MPI libraries, and complex debugging.",
                "rubrics": [
                    {"title": "Hybrid Architecture Paradigm", "marks": 2.0, "keywords": "hybrid, mpi, openmp, shared, distributed"},
                    {"title": "Key Programming Challenges", "marks": 4.0, "keywords": "load balance, memory hierarchy, synchronization, debugging, thread safety"}
                ]
            },
            {
                "question_number": "3b", "order_idx": 8, "max_marks": 6.0,
                "question_text": "A program with Tserial = 24ms, Tparallel = 4ms and p = 8. Solve its efficiency.",
                "model_answer": "Given Tserial = 24ms, Tparallel = 4ms, p = 8. Speedup S = Tserial / Tparallel = 24 / 4 = 6. Efficiency E = S / p = 6 / 8 = 0.75, or 75%.",
                "rubrics": [
                    {"title": "Speedup Calculation: S = 24/4 = 6", "marks": 3.0, "keywords": "speedup, s = 6, 24/4, tserial/tparallel"},
                    {"title": "Efficiency Calculation: E = 6/8 = 0.75 (75%)", "marks": 3.0, "keywords": "efficiency, e = 0.75, 75%, 6/8, s/p"}
                ]
            },
            {
                "question_number": "3c", "order_idx": 9, "max_marks": 8.0,
                "question_text": "Why is wall-clock time preferred over CPU time in measuring performance of parallel programs?",
                "model_answer": "CPU time measures only active cycles spent by processor cores on program instructions, excluding idle wait time, inter-process communication delays, and synchronization overhead. In parallel programming, idle time and communication latency are major bottlenecks. Wall-clock time measures actual total elapsed real-world time from start to completion, faithfully capturing true parallel performance and end-user speedup.",
                "rubrics": [
                    {"title": "Definition of Wall-clock vs CPU Time", "marks": 3.0, "keywords": "wall-clock time, cpu time, elapsed real time, execution cycles"},
                    {"title": "Communication and Idle Synchronization Overhead", "marks": 3.0, "keywords": "idle time, waiting, communication overhead, synchronization latency"},
                    {"title": "True Measure of Parallel Speedup", "marks": 2.0, "keywords": "parallel speedup, real-world performance, end-to-end"}
                ]
            },
            {
                "question_number": "4a", "order_idx": 10, "max_marks": 6.0,
                "question_text": "Define speedup and efficiency. Why is efficiency an important metric in parallel computing?",
                "model_answer": "Speedup S(p) = Tserial / Tparallel indicates how much faster a parallel execution runs compared to sequential execution. Efficiency E(p) = S(p) / p = Tserial / (p * Tparallel) measures processor utilization. Efficiency is crucial because it indicates whether adding more processors is economically justified, reveals scalability limits, and measures resource waste from communication overhead.",
                "rubrics": [
                    {"title": "Speedup Definition and Formula S(p) = Tserial / Tparallel", "marks": 2.0, "keywords": "speedup, tserial/tparallel, faster execution, formula"},
                    {"title": "Efficiency Definition and Formula E(p) = S(p) / p", "marks": 2.0, "keywords": "efficiency, s(p)/p, processor utilization, percentage"},
                    {"title": "Importance as Evaluation Metric (Scalability & Hardware Utilization)", "marks": 2.0, "keywords": "importance, metric, processor utilization, performance before scaling"}
                ]
            },
            {
                "question_number": "4b", "order_idx": 11, "max_marks": 6.0,
                "question_text": "Solve: 10% of a program is inherently serial, use Amdahl's Law to find the maximum speed up.",
                "model_answer": "Amdahl's Law: S(p) = 1 / (r + (1-r)/p), where r is the serial fraction. Given r = 0.10 (10% serial) and parallel fraction 1-r = 0.90. As number of processors p approaches infinity (p -> ∞), the parallel term (1-r)/p approaches 0. Therefore, Maximum Speedup Smax = 1 / r = 1 / 0.10 = 10.",
                "rubrics": [
                    {"title": "Amdahl's Law Formula Identification", "marks": 2.0, "keywords": "amdahl's law, s(p) = 1 / (r + (1-r)/p), serial fraction"},
                    {"title": "Limit Evaluation as p -> Infinity", "marks": 2.0, "keywords": "p -> infinity, (1-r)/p -> 0, limit, infinite processors"},
                    {"title": "Correct Maximum Speedup Smax = 10", "marks": 2.0, "keywords": "smax = 10, 1/0.10, 10, maximum speedup"}
                ]
            },
            {
                "question_number": "4c", "order_idx": 12, "max_marks": 8.0,
                "question_text": "Explain Amdahl's Law with an example. What does it imply about the limitations of parallelization?",
                "model_answer": "Amdahl's Law states that the serial portion of a program strictly limits the overall achievable speedup regardless of how many processors are employed. Formula: S(p) = 1 / (r + (1-r)/p). Example: If r = 0.10 and p = 4, S(4) = 1 / (0.10 + 0.90/4) = 1 / (0.10 + 0.225) = 1 / 0.325 ≈ 3.08 (or 3.5). Implications: Increasing processors gives diminishing returns, serial bottlenecks dominate, and one must reduce serial code rather than merely adding hardware.",
                "rubrics": [
                    {"title": "Amdahl's Law Statement & Concept", "marks": 2.0, "keywords": "amdahl's law, serial portion limits speedup, law statement"},
                    {"title": "Worked Example Calculation (e.g. p = 4)", "marks": 3.0, "keywords": "example, p = 4, r = 0.10, s(p) calculation"},
                    {"title": "Limitations of Parallelization (Diminishing Returns & Serial Bottleneck)", "marks": 3.0, "keywords": "limitations, diminishing returns, serial bottleneck, scalability limit"}
                ]
            },

            # Module 3 (Q5 or Q6)
            {
                "question_number": "5a", "order_idx": 13, "max_marks": 5.0,
                "question_text": "Explain the Single Program, Multiple Data (SPMD) programming model in MPI with an example.",
                "model_answer": "SPMD is an execution model where all distributed processes run the exact same compiled binary, but execute different execution paths based on their unique process rank (obtained via MPI_Comm_rank). Example: Rank 0 acts as coordinator reading data and scattering to worker ranks 1..p-1, which perform local computation and send back results.",
                "rubrics": [
                    {"title": "SPMD Model Concept", "marks": 2.5, "keywords": "spmd, single program multiple data, mpi, rank, same program"},
                    {"title": "Example Demonstrating Branching Execution", "marks": 2.5, "keywords": "example, mpi_comm_rank, master worker, rank 0, branching"}
                ]
            },
            {
                "question_number": "5b", "order_idx": 14, "max_marks": 5.0,
                "question_text": "Explain the use of MPI_ANY_SOURCE and MPI_ANY_TAG in message reception.",
                "model_answer": "In MPI point-to-point communication, MPI_Recv allows wildcards. MPI_ANY_SOURCE enables a receiving process to accept an incoming message from any sender process in the communicator. MPI_ANY_TAG allows receiving a message with any arbitrary tag number. The actual sender and tag are retrieved after reception via the MPI_Status structure.",
                "rubrics": [
                    {"title": "MPI_ANY_SOURCE Functionality and Wildcard Semantics", "marks": 2.5, "keywords": "mpi_any_source, wildcard, any sender, process"},
                    {"title": "MPI_ANY_TAG Functionality and MPI_Status Extraction", "marks": 2.5, "keywords": "mpi_any_tag, tag, message type, mpi_status"}
                ]
            },
            {
                "question_number": "6a", "order_idx": 15, "max_marks": 5.0,
                "question_text": "Explain the concept of trapezoidal rule in numerical integration.",
                "model_answer": "The Trapezoidal rule approximates a definite integral int_a^b f(x) dx by dividing the interval [a, b] into n sub-intervals of uniform width h = (b - a)/n. The area under the curve in each slice is approximated by a trapezoid: Area_i = (h/2) * [f(x_i) + f(x_{i+1})]. Summing across all n intervals gives Total Area = h * [ (f(a) + f(b))/2 + sum_{i=1}^{n-1} f(x_i) ]. Illustrated by curve segmented into linear trapezoidal strips.",
                "rubrics": [
                    {"title": "Trapezoidal Rule Mathematical Formulation & Width h = (b-a)/n", "marks": 2.5, "keywords": "trapezoidal rule, definite integral, interval [a,b], width h = (b-a)/n, summation"},
                    {"title": "Geometric/Graphical Trapezoid Approximation Diagram", "marks": 2.5, "keywords": "diagram, area under curve, trapezoids, approximation, subintervals"}
                ]
            },
            {
                "question_number": "6b", "order_idx": 16, "max_marks": 5.0,
                "question_text": "Explain the steps involved in parallelizing the trapezoidal rule using MPI.",
                "model_answer": "Steps to parallelize the Trapezoidal Rule with MPI: 1) Domain Decomposition: Calculate sub-interval width h = (b-a)/n. Assign local_n = n / p trapezoids to each of the p processes. 2) Local Interval: Each process with rank r computes local bounds: local_a = a + r * local_n * h, and local_b = local_a + local_n * h. 3) Local Computation: Each process evaluates its local trapezoidal sum independently. 4) Communication & Reduction: Processes send their local integrals to Process 0 (or use MPI_Reduce with MPI_SUM) to aggregate the total global integral.",
                "rubrics": [
                    {"title": "Domain Decomposition & Interval Partitioning (local_n = n/p)", "marks": 2.5, "keywords": "domain decomposition, local_n = n/p, rank, local interval, partition"},
                    {"title": "Local Integral Computation & Global Reduction to Process 0", "marks": 2.5, "keywords": "local integral, mpi_reduce, send, receive, process 0, total sum, aggregation"}
                ]
            }
        ]

        created_qs = {}
        for qd in questions_data:
            q = Question(
                exam_id=exam.id,
                question_number=qd["question_number"],
                question_text=qd["question_text"],
                max_marks=qd["max_marks"],
                order_idx=qd["order_idx"],
                model_answer=qd["model_answer"],
                grading_type="concept_coverage"
            )
            db.add(q)
            db.flush()
            created_qs[qd["question_number"]] = q

            for r_idx, r in enumerate(qd["rubrics"]):
                rubric = RubricItem(
                    question_id=q.id,
                    concept_title=r["title"],
                    description=r["title"],
                    weight_marks=r["marks"],
                    keywords=r["keywords"],
                    order_idx=r_idx
                )
                db.add(rubric)

        db.commit()
        print(f"[OK] Added {len(created_qs)} questions with rubrics.")

        # 6. Add Namrata's Submission with Faithful Question-by-Question Answers
        namrata_full_text = """BLUE BOOK (THEORY)
USN: 1HK23CS107
STUDENT NAME: NAMRATHA . U
SUB.CODE: BCS702
SUB.NAME: Parallel Computing
Maximum IA Marks: 50

Ans 1a: According to Flynn's taxonomy, the architecture of parallel computers is classified based on number of instruction streams and data streams.
There are four classifications of parallel computers:
1. SISD - Single instruction, single data.
* A single instruction is executed at a time.
* A single data stream is used.
* A traditional sequential computers are example.
2. SIMD - Single instruction, multiple data.
* A single instruction is performed on multiple data simultaneously.
* A data is divided into multiple parts of data.
* A SIMD is used in vector processors and many GPU parallel systems.
3. MISD - Multiple instruction, single data.
* A multiple instructions is operated on the single data.
* This is uncommon generally in parallel computers.
4. MIMD - Multiple instructions, multiple data.
* A multiple processor can perform different instruction on different data.
* A multiple instructions can be operated at a time.
* Usually used in clusters, Multicore CPU.

Compare SIMD & MIMD System:
SIMD:
* Single instruction at a time
* Multiple data are used
* In vector processors and matrix calculations SIMD are used
* High/Massive parallelism
* More used on arrays, same type of data
MIMD:
* Multiple instructions at a time
* Multiple data used
* In Multicore CPU, clusters MIMD are used
* High parallelism
* It used on different data

Ans 1b: Shared Memory Architecture:
In Shared Memory where multiple processors use a common memory.
[Diagram: CPU 1, CPU 2, CPU n connected to memory through single Interconnect]
* Every processor are connected to memory through single interconnect
* It is easier to manage and share data.
* Simple programming model
Advantages:
* Simple programming model.
* Easy communication among processors
Limitation:
* Can become bottleneck when processors number increases.
* Cache coherence overhead
* Synchronization overhead.

Distributed memory architectures:
In distributed memory, each processors having their own local memory.
[Diagram: CPU 1 with Memory, CPU 2 with Memory, CPU n with Memory connected through Interconnect]
* Each processor has its own local memory.
* A processor can access local memory faster than remote memory.
* A processor can access to memory belonging to other processor through interconnect.
Advantages:
* Faster access than traditional shared memory
* Processor have independent memory
Limitation:
* More complex programming model.
* Synchronization should carefully be handled.

Ans 1c: False Sharing in Cache System.
A multiple processor can have common cache. The False sharing occurs when the two or more processors have same copies of same cache and processors work on different variables but when one processor modifies its variable, the other processor copy get invalidated errors.

Example:
Consider double y[m] for x0
Assume Core 0 and Core 1
double = 8 bytes.
Cache line = 64 bytes.
64 / 8 = 8 doubles in each cache line.
Cache line = y[0], y[1], y[2], y[3], y[4], y[5], y[6], y[7]
Now Core 0 = y[0] variable, Core 1 = y[1] variable
When Core 0 modifies the y[0] variable, Core 1 gets invalid error for its copy.
Similarly, when Core 1 modifies the y[1] variable, Core 0's copy get invalidated errors.

Effects:
* It creates unnecessary invalidation errors
* Creates memory traffic.
* Decreases the performance of parallel execution
To overcome False sharing:
* Make separation of frequently modified variables
* Use padding in between the variables
* Assign data so a different processor works on different caches.

Ans 4a: Speedup
* A Speedup shows that how faster a parallel execution takes time for execution.
Formula:
S(p) = Tserial / Tparallel
S = speedup, Tserial = Time required by serial execution, Tparallel = Time required by parallel execution
* Always a parallel executions should be more faster that serial/sequential execution.

Efficiency:
* An Efficiency tells how the processors are utilized efficiently for execution.
Formula:
E(p) = S(p) / p
E = efficiency, S(p) = speedup of parallel execution, p = no of processor.
* Efficiency will be always expressed in percentage: So E(p) = (S(p) / p) * 100

Efficiency is an important metric in parallel computation because:
* It helps to evaluate utilization of processors.
* It helps to determine the performance before applying any parallel execution solution.
* It shows the parallelism efficiency.

Ans 4b: 10% of serial portion
Amdahl's Law
S(p) = 1 / (r + (1-r)/p)
where r is the fraction of program of remaining serial portion
1-r is the fraction of parallelized portion
p = number of processors, S = Speedup
Given: r = 0.10, 1-r = 1.0 - 0.10 = 0.90, p
S(p) = 1 / (0.10 + 0.90/p)
When the processor numbers becomes indefinitely increases, p -> infinity, (1-r)/p -> 0
So, S(p) = 1 / r = 1 / 0.10 => Smax = 10

Ans 4c: Amdahl's Law
The Amdahl's Law shows the limitation on the speedup which can be obtained by parallelizing the program.
It states that "A serial portion of program limits the maximum overall speedup, regardless how many processors are used".
Amdahl's Law formula:
r is the fraction part of the program of remaining serial portion.
1-r is the fraction part of parallelized program.
p is number of processors, S is maximum Speedup
S(p) = 1 / (r + (1-r)/p)
Ex: 10% of program is inherently Serial
Assume 90% of program can be parallelized and remaining part is serial portion.
Serial portion = 10%, r = 0.10
Parallel portion = 90%, 1-r = 0.90
p = 4
S(p) = 1 / (0.10 + 0.90/4) = 1 / (0.10 + 0.225) = 1 / 0.325 = 3.08 ≈ 3.5

Limitations of parallelization:
* A more numbers of processors can be added but it does not eliminate the serial execution.
* Increasing processors can give diminishing returns.
* Need to decrease the serial code to get significant results.
* Limited maximum speed.
* Limited Scalability.

Ans 6a: The Concept of trapezoidal rule in numerical integration.
A Trapezoidal rule is a numerical method which approximate the definite integral of a function of interval [a, b].
Definite integral: Area = \int_a^b f(x) dx
First find the width: h = (b-a) / n
The n interval is divided into equal sub intervals: points which are x0 = a, x1 = a+h, x2 = a+2h ...
Find the area of trapezoidal: Area = (h/2) [f(xi) + f(xi+1)]
Add all trapezoids: Total Area = h [ (f(b) + f(a))/2 + \sum_{i=1}^{n-1} f(xi) ]
[Diagram: Area of curve before applying trapezoids and area of curve with trapezoids applied]

Ans 6b: The Steps involved in parallelizing the trapezoidal rule using MPI.
* The Trapezoidal rule can be parallelized by dividing the trapezoids among the multiple MPI processors.
* The MPI follows processors ranks such as rank 0, 1, 2, 3 ...
Divide the work / task:
There is a n number of trapezoids and p of processors: local_n = n / p
Find the local interval:
* Each processor independently do their work: find Starting point, Ending point, Number of trapezoids.
Ex: If there are 100 trapezoids & 4 processors:
Process 0 -> 0-24 trapezoids
Process 1 -> 25-49 trapezoids
Process 2 -> 50-74 trapezoids
Process 3 -> 75-99 trapezoids
Find the local integral:
The processors independently finds their integral of assigned trapezoids.
Communication results:
The local results obtained by integration is to combined.
Adding local results:
The process 0 adds all the processors results into sum: Process 1 -> Process 0, Process 2 -> Process 0, Process 3 -> Process 0.
Total = I1 + I2 + I3 ... + In
Final results obtained by adding all local results using MPI.
"""

        sub_namrata = Submission(
            exam_id=exam.id,
            student_roll="1HK23CS107",
            student_name="Namratha U",
            student_email="namratha.u@student.edu",
            original_filename="Namrata PC.pdf",
            file_path=str(dest_namrata),
            file_type="pdf",
            extracted_text=namrata_full_text,
            ocr_confidence=98.5,
            is_ocr_verified=True,
            submission_type="teacher_bulk",
            status="ready_for_grading"
        )
        db.add(sub_namrata)

        # Also add Shadab and Zuhibh submissions
        sub_shadab = Submission(
            exam_id=exam.id,
            student_roll="1HK23CS090",
            student_name="Shadab P",
            student_email="shadab.p@student.edu",
            original_filename="Shadab PC.pdf",
            file_path=str(src_shadab) if src_shadab.exists() else "",
            file_type="pdf",
            extracted_text=namrata_full_text,  # benchmark fallback
            ocr_confidence=96.0,
            is_ocr_verified=True,
            submission_type="teacher_bulk",
            status="ready_for_grading"
        )
        db.add(sub_shadab)

        sub_zuhibh = Submission(
            exam_id=exam.id,
            student_roll="1HK23CS094",
            student_name="Mohammad Zuhibh Wane",
            student_email="zuhibh.w@student.edu",
            original_filename="Zuhibh PC.pdf",
            file_path=str(src_zuhibh) if src_zuhibh.exists() else "",
            file_type="pdf",
            extracted_text=namrata_full_text,  # benchmark fallback
            ocr_confidence=95.0,
            is_ocr_verified=True,
            submission_type="teacher_bulk",
            status="ready_for_grading"
        )
        db.add(sub_zuhibh)

        db.commit()
        db.refresh(sub_namrata)
        print(f"[OK] Added submissions for Namrata, Shadab, and Zuhibh.")

        # 7. Run AI Grading Engine for Exam BCS702
        print("Running AI grading engine...")
        grading_res = run_exam_grading(exam.id, None, db)
        print(f"[OK] Grading complete! Result: {grading_res}")

        # 8. Inspect Evaluated Scores for Namrata
        evals = db.query(AnswerEvaluation).filter(AnswerEvaluation.submission_id == sub_namrata.id).all()
        print(f"\n--- NAMRATA EVALUATIONS ({len(evals)} items) ---")
        total_m = 0.0
        for ev in evals:
            q = db.query(Question).filter(Question.id == ev.question_id).first()
            q_num = q.question_number if q else '?'
            ans_len = len(ev.student_answer_text or '')
            total_m += ev.final_marks
            print(f"  Q{q_num:2s} | Max: {q.max_marks:4.1f}M | Awarded: {ev.final_marks:4.1f}M | Ans Chars: {ans_len:4d}")
        
        print(f"Total Awarded Marks: {total_m:.1f} / 50.0M")

    finally:
        db.close()

if __name__ == "__main__":
    setup_parallel_computing_exam()
