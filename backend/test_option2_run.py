import json
from app.services.ai_grader import ai_grader
from app.models.question import Question

# Define the questions from the exam paper (BCS602 Machine Learning)
# Notice: Under Option 2, NO RUBRICS OR TEACHER NOTES ARE PROVIDED.
questions = [
    Question(
        id=1,
        question_number="2a",
        question_text="Explain key concept of multivariate statistics and its applications in Machine Learning.",
        max_marks=6.0,
        grading_type="concept_coverage",
        model_answer=""  # No model answer provided
    ),
    Question(
        id=2,
        question_number="2b",
        question_text="Explain Data mining process in Machine Learning with example.",
        max_marks=6.0,
        grading_type="concept_coverage",
        model_answer=""  # No model answer provided
    ),
    Question(
        id=3,
        question_number="2c",
        question_text="The following table shows two variables X and Y. Compute: 1. Covariance between X and Y 2. Pearson Correlation Coefficient.",
        max_marks=8.0,
        grading_type="numerical_step",
        model_answer=""  # No model answer provided
    ),
    Question(
        id=4,
        question_number="3a",
        question_text="Solve the following set of equations using Gaussian Elimination method: 2x+y-z=8, -3x-y+2z=-11, -2x+y+2z=-3.",
        max_marks=8.0,
        grading_type="numerical_step",
        model_answer=""  # No model answer provided
    ),
    Question(
        id=5,
        question_number="3b",
        question_text="Write the algorithm for Find S? Find the Optimal Hypothesis considering the below Table data set using Find S Algorithm.",
        max_marks=6.0,
        grading_type="concept_coverage",
        model_answer=""  # No model answer provided
    ),
    Question(
        id=6,
        question_number="3c",
        question_text="Explain Feature Engineering and Dimensionality Reduction Techniques with examples (PCA, LDA, Feature Selection).",
        max_marks=6.0,
        grading_type="concept_coverage",
        model_answer=""  # No model answer provided
    ),
    Question(
        id=7,
        question_number="5a",
        question_text="Given data: Height = 162, Weight = 55, and use k = 3. Classify person as Fit or Unfit using K-Nearest Neighbors (KNN) Euclidean distance algorithm.",
        max_marks=10.0,
        grading_type="numerical_step",
        model_answer=""  # No model answer provided
    ),
]

# Exact extracted answers from student Nasrin Khatoon's Blue Book (1HK23CS108)
student_answers = {
    "2a": """
    multivariant statistic:
    A statistic which solve the multiple variable simultaneously at the same time.
    Key concept of multivariant:
    - Multiple Variable: at the same time find and analyze the variable.
    - Correlation: Find the correlation between the variable.
    - Relation between two variable: Select between the variable and map the relation based on the same.
    Application of reliable data: Machine learning, Finance, Health, Marketing.
    """,
    "2b": """
    Introduction:
    Data mining is a mathematical or program to find the pattern and apply and analyzed it.
    Features of Data Mining:
    Data collection: Collect the data from various source.
    Data Train: Train the data by approach.
    Data Test: Test it.
    Predication: Then take a decision.
    Process in ML:
    - Data creation: Collect the data from multiple various source.
    - Data Cleaning: Filter and clean the data.
    - Data Integrity: Data should have quality.
    - Data Selection: Select the reliable data.
    - Data Transfer: Transfer the data to a file.
    - Data Mining: Finding the pattern from data.
    - Data Evaluate: Evaluate and deploy the result.
    Flowchart: Collect Problem -> Collect data -> Preprocessing data -> Select Algorithm -> Technique -> Evaluate -> Result.
    """,
    "2c": """
    Given data:
    X: 2, 4, 6, 8, 10
    Y: 4, 6, 8, 10, 12
    (i) Covariance between X and Y:
    Step 1: Find the mean, n = 5
    X_bar = (2+4+6+8+10)/5 = 30/5 = 6 => X_bar = 6
    Y_bar = (4+6+8+10+12)/5 = 40/5 = 8 => Y_bar = 8
    Step 2: Find the difference between X, Y and X_bar, Y_bar:
    sum((X-X_bar)(Y-Y_bar)) = 16 + 4 + 0 + 4 + 16 = 40
    sum((X-X_bar)^2) = 16 + 4 + 0 + 4 + 16 = 40
    sum((Y-Y_bar)^2) = 16 + 4 + 0 + 4 + 16 = 40
    Step 3: Covariance formula:
    Cov(x, y) = sum((x - x_bar)(y - y_bar)) / n = 40 / 5 = 8
    Cov(x, y) = 8
    2. Pearson Correlation Coefficient:
    r = sum((x - x_bar)(y - y_bar)) / sqrt(sum(x - x_bar)^2 * sum(y - y_bar)^2)
    r = 40 / sqrt(40 * 40) = 40 / 40 = 1
    So that Pearson Correlation Coefficient is r = 1.
    """,
    "3a": """
    Given:
    2x + y - z = 8
    -3x - y + 2z = -11
    -2x + y + 2z = -3
    Augmented matrix Gaussian Elimination:
    R2 -> R2 + 3/2 R1
    R3 -> R3 + R1
    R3 -> R3 - 4 R2
    Back substitution:
    -z = 1 => z = -1
    0.5y + 0.5(z) = 1 => 0.5y + 0.5(-1) = 1 => 0.5y = 1.5 => y = 3
    2x + y - z = 8 => 2x + 3 - (-1) = 8 => 2x + 4 = 8 => 2x = 4 => x = 2
    Solution using Gaussian Elimination method: (x, y, z) = (2, 3, -1)
    """,
    "3b": """
    Optimal hypothesis table:
    G0 = <phi, phi, phi, phi, phi, phi, phi, phi>
    G1 = <No, S, Y, N, N, Bla, No, Big>
    I1 = <No, S, Y, N, N, Bla, No, Big>
    I2 = <?, S, ?, No, No, ?, ?, ?>
    I3 = <?, Sh, ?, No, No, ?, No, Med>
    I4 = <No, ?, ?, ?, ?, ?, No, Med>
    I5 = <No, ?, ?, Yes, Yes, ?, No, ?>
    I0 = <?, ?, ?, ?, ?, ?, ?, ?>
    """,
    "3c": """
    Feature Engineering:
    In Feature Engineering select the data, filter it and find the usable data. Basically in feature engineering motive is find the usable and relatable data.
    Key feature of feature engineering:
    1) Feature Selection: First step to select the feature.
    2) Feature Transfer: Transfer the feature for best solution.
    3) Feature Creation: Create a feature and find the best approach to solve problem.
    Dimensionality Reduction Techniques:
    In dimensionality reduction technique machine learning minimize the complexity and step and give the more efficiency result. It reduce time and energy and give the same result.
    Reduction Techniques Example:
    - PCA: It reduce the size of solution such as provide the same answer as well.
    - Feature Selection: Select the feature selection is most important for quality data.
    - LDA: Reduce the complexity of the problem and give the best approach to solve problem.
    Conclusion: Feature Engineering provide quality of data and Dimensionality Reduction Techniques reduce the complexity and time as well.
    """,
    "5a": """
    Given data: Height = 162, Weight = 55, and use k = 3
    Table:
    Person A: Height 160, Weight 55, Fit
    Person B: Height 165, Weight 65, Unfit
    Person C: Height 170, Weight 72, Unfit
    Person D: Height 155, Weight 48, Fit
    Person E: Height 158, Weight 50, Fit
    Step 1: Euclidean distance Formula: d = sqrt((x1 - x2)^2 + (y1 - y2)^2)
    dA = sqrt((162-160)^2 + (55-55)^2) = 2
    dB = sqrt((162-165)^2 + (55-65)^2) = 10.44
    dC = sqrt((162-170)^2 + (55-72)^2) = 18.78
    dD = sqrt((162-155)^2 + (55-48)^2) = 9.89
    dE = sqrt((162-158)^2 + (55-50)^2) = 6.40
    Step 2: Table sorted by distance:
    Person A: distance 2, Fit
    Person E: distance 6.40, Fit
    Person D: distance 9.89, Fit
    Person B: distance 10.44, Unfit
    Person C: distance 18.78, Unfit
    Step 3: Take k-nearest Neighbors (k = 3):
    Person A: Fit
    Person E: Fit
    Person D: Fit
    Hence the Height = 162, Weight = 55 and using k=3, Person will under the Fit class.
    """
}

print("=" * 80)
print("TESTING OPTION 2: OPEN WEB SEARCH EVALUATION (LENIENT CORRECTION)")
print("Student: Nasrin Khatoon (1HK23CS108) | Subject: Machine Learning (BCS602)")
print("Mode: Option 2 (No Rubric or Teacher Notes Provided -> Web Search Grounding)")
print("=" * 80)

total_marks_awarded = 0.0
total_max_marks = 0.0

# In the exam, student is asked to "Answer any Three full Questions".
# Student attempted: Q2 (2a, 2b, 2c), Q3 (3a, 3b, 3c), and Q5 (5a).
results = []

for q in questions:
    ans = student_answers.get(q.question_number, "")
    res = ai_grader.grade_answer(
        question=q,
        student_answer=ans,
        grading_mode="rubric_web_validated",  # OPTION 2: Web Search + Lenient Correction
        teacher_notes=None                     # NO TEACHER NOTES / NO RUBRIC
    )
    
    total_marks_awarded += res["awarded_marks"]
    total_max_marks += q.max_marks
    results.append((q, res))
    
    print(f"\n[Question {q.question_number}] Max Marks: {q.max_marks}")
    print(f"Prompt: {q.question_text[:85]}...")
    print(f"Awarded Marks: {res['awarded_marks']} / {q.max_marks} (Confidence: {res['confidence_score']})")
    print(f"Reason: {res['lost_marks_reason']}")
    print(f"Strengths: {res['strengths']}")
    if res['missed_concepts']:
        print(f"Missed/Gaps: {res['missed_concepts']}")
    if res['improvement_suggestions']:
        print(f"Suggestion: {res['improvement_suggestions']}")
    print(f"Web Citations Retrieved: {len(res['web_evidence'])}")
    for ev in res['web_evidence'][:2]:
        print(f"   -> [{ev['domain']}] {ev['source_title']} ({ev['source_url']})")

print("\n" + "=" * 80)
print(f"TOTAL EVALUATION RESULT: {round(total_marks_awarded, 2)} / {total_max_marks} Marks")
print("=" * 80)
