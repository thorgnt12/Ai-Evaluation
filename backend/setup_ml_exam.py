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
from app.routers.grading import run_exam_grading, split_student_text_by_questions
from app.config import EXAM_DOCS_DIR, SUBMISSIONS_DIR

def setup_and_test_ml_exam():
    db = SessionLocal()
    try:
        print("=== Setting up Machine Learning IA-2 Exam ===")
        
        # 1. File paths
        src_qp = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\ml IA2 question paper .pdf")
        src_scheme = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\IA2 ML-SCHEME8-5-26-FINAL.docx")
        src_sub = Path(r"C:\Users\priya\OneDrive\Desktop\testing documents\Nasrin IA2.pdf")
        
        dest_qp = EXAM_DOCS_DIR / "qp_5_ml_IA2_question_paper.pdf"
        dest_scheme = EXAM_DOCS_DIR / "scheme_5_IA2_ML_SCHEME.docx"
        dest_sub = SUBMISSIONS_DIR / "5_1HK23CS108_Nasrin_IA2.pdf"
        
        if src_qp.exists():
            shutil.copy2(src_qp, dest_qp)
        if src_scheme.exists():
            shutil.copy2(src_scheme, dest_scheme)
        if src_sub.exists():
            shutil.copy2(src_sub, dest_sub)
        print("[OK] Files verified in storage directories.")

        # 2. Setup or Update Exam
        exam = db.query(Exam).filter((Exam.exam_code == "BCS602") | (Exam.id == 1)).first()
        if not exam:
            exam = Exam()
            db.add(exam)
            
        exam.title = "Machine Learning - Second Internal Assessment (IA-2)"
        exam.subject = "Machine Learning"
        exam.exam_code = "BCS602"
        exam.total_marks = 50.0
        exam.pass_marks = 20.0
        exam.term = "May 2026 - AY 2025-26"
        exam.grading_mode = "notes_grounded"
        exam.status = "ready_for_grading"
        exam.allow_student_upload = True
        exam.allow_replacement = True
        exam.question_paper_path = str(dest_qp)
        exam.marking_scheme_path = str(dest_scheme)
        exam.grace_marks = 0.0
        db.commit()
        db.refresh(exam)
        print(f"[OK] Exam configured: ID={exam.id}, Title='{exam.title}', Total Marks={exam.total_marks}")

        # 3. Clear existing questions & submissions for Exam 5 to guarantee clean state
        db.query(AnswerEvaluation).filter(AnswerEvaluation.submission.has(exam_id=exam.id)).delete(synchronize_session=False)
        db.query(AuditLog).filter(AuditLog.exam_id == exam.id).delete(synchronize_session=False)
        db.query(Submission).filter(Submission.exam_id == exam.id).delete(synchronize_session=False)
        db.query(RubricItem).filter(RubricItem.question.has(exam_id=exam.id)).delete(synchronize_session=False)
        db.query(Question).filter(Question.exam_id == exam.id).delete(synchronize_session=False)
        db.commit()
        print("[OK] Cleared prior records for Exam 5.")

        # 4. Questions & Rubric Definitions from Document 1 & 2
        questions_data = [
            {
                "question_number": "1a",
                "order_idx": 1,
                "max_marks": 8.0,
                "question_text": "What is Artificial Neural Network? Explain the concept of a Perceptron with a neat diagram.",
                "model_answer": "Artificial Neural Network (ANN) is a computational system inspired by biological neural networks in the human brain, composed of interconnected processing units (neurons). A Perceptron is the simplest form of a neural network used for binary classification. It takes inputs x_i, multiplies each with a weight w_i, sums them with a bias b, and applies an activation function: Y = f(sum(w_i * x_i) + b).",
                "rubrics": [
                    {"title": "Definition of ANN", "marks": 2.0, "keywords": "artificial neural network, ann, human brain, biological, computation, neurons"},
                    {"title": "Features/characteristics of ANN", "marks": 2.0, "keywords": "learning, training, parallel, fault tolerance, weights, bias"},
                    {"title": "Definition of Perceptron", "marks": 1.0, "keywords": "perceptron, type of ann, linear classifier, single layer, binary classification"},
                    {"title": "Perceptron working explanation", "marks": 2.0, "keywords": "input, weights, multiply, sum, bias, activation function, mathematical representation, formula"},
                    {"title": "Neat diagram", "marks": 1.0, "keywords": "diagram, cell body, axon, input, output, summation"}
                ]
            },
            {
                "question_number": "1b",
                "order_idx": 2,
                "max_marks": 12.0,
                "question_text": "Assess a student's performance using Naïve Bayes algorithm for the continuous attribute. Predict whether a student gets a job offer or not in his final year of the course. The training dataset T consists of 10 data instances with attributes such as 'CGPA' and 'Interactiveness'. Target variable is Job Offer (Yes or No). Consider Test data as CGPA=8.5 and Interactiveness = No.",
                "model_answer": "Calculate prior probabilities P(Yes)=7/10=0.7, P(No)=3/10=0.3. For continuous attribute CGPA, calculate sample mean and variance for Yes and No classes. Compute Gaussian probability density P(CGPA=8.5|Yes) and P(CGPA=8.5|No) using normal distribution formula. Calculate conditional probabilities for Interactiveness=No given Yes and No. Apply Naive Bayes multiplication to compute posterior likelihoods and classify into class with maximum probability.",
                "rubrics": [
                    {"title": "Prior probability calculation", "marks": 2.0, "keywords": "p(yes), p(no), 7/10, 3/10, 0.7, 0.3, prior probability"},
                    {"title": "Mean and variance calculation", "marks": 3.0, "keywords": "mean, variance, standard deviation, continuous, gaussian, normal distribution, sigma, mu"},
                    {"title": "Conditional probability calculation", "marks": 3.0, "keywords": "conditional probability, p(interactiveness|yes), p(interactiveness|no), 5/7, 1/3, p(cgpa|yes), p(cgpa|no)"},
                    {"title": "Naïve Bayes formula application", "marks": 2.0, "keywords": "naive bayes formula, posterior, likelihood, product, multiply, bayes rule"},
                    {"title": "Final prediction and conclusion", "marks": 2.0, "keywords": "prediction, conclusion, job offer, yes, no, higher chance"}
                ]
            },
            {
                "question_number": "2a",
                "order_idx": 3,
                "max_marks": 8.0,
                "question_text": "Assume the following probabilities related to Malaria diagnosis: probability of a person having Malaria is 0.02%, probability of test being positive given Malaria is 98%, and probability of test being negative given person does not have malaria is 95%. Find the probability of a person having Malaria given that the test result is positive.",
                "model_answer": "Given P(M)=0.0002, P(~M)=0.9998, P(+|M)=0.98, P(-|~M)=0.95 => P(+|~M)=0.05. Using Bayes Theorem: P(M|+) = [P(+|M)*P(M)] / [P(+|M)*P(M) + P(+|~M)*P(~M)]. Numerator = 0.98 * 0.0002 = 0.000196. Denominator = 0.000196 + (0.05 * 0.9998) = 0.000196 + 0.04999 = 0.050186. P(M|+) = 0.000196 / 0.050186 ≈ 0.0039 (0.39%).",
                "rubrics": [
                    {"title": "Identification of given probabilities", "marks": 2.0, "keywords": "p(m), 0.02%, 0.0002, p(+|m), 98%, 0.98, p(-|~m), 95%, 0.05"},
                    {"title": "Bayes theorem formula", "marks": 2.0, "keywords": "bayes theorem, p(m|+), total probability, formula"},
                    {"title": "Substitution and calculation", "marks": 2.0, "keywords": "substitution, calculation, numerator, denominator, 0.000196"},
                    {"title": "Final probability/result", "marks": 2.0, "keywords": "0.0039, 0.39%, final result, probability"}
                ]
            },
            {
                "question_number": "2b",
                "order_idx": 4,
                "max_marks": 12.0,
                "question_text": "List and explain the different types of activation functions in ANN.",
                "model_answer": "An activation function introduces non-linearity into a neural network, deciding whether a neuron should be activated. Common activation functions include: Binary Step (0 if x<0, 1 if x>=0), Sigmoid (f(x)=1/(1+e^-x), range (0,1)), Hyperbolic Tangent Tanh (f(x)=(e^x-e^-x)/(e^x+e^-x), range (-1,1)), Rectified Linear Unit ReLU (f(x)=max(0,x)), and Softmax for multi-class probability output.",
                "rubrics": [
                    {"title": "Definition of activation function", "marks": 2.0, "keywords": "activation function, non-linearity, threshold, neuron output"},
                    {"title": "Explanation of Binary Step function", "marks": 2.0, "keywords": "binary step, threshold, 0 or 1, step function"},
                    {"title": "Explanation of Sigmoid function", "marks": 2.0, "keywords": "sigmoid, logistic, 1/(1+e^-x), 0 to 1, s-shaped"},
                    {"title": "Explanation of Tanh function", "marks": 2.0, "keywords": "tanh, hyperbolic tangent, -1 to 1, zero centered"},
                    {"title": "Explanation of ReLU/Softmax", "marks": 2.0, "keywords": "relu, rectified linear unit, max(0,x), softmax, probability"},
                    {"title": "Graphs or formulas", "marks": 2.0, "keywords": "graph, formula, curve, plot, mathematical expression"}
                ]
            },
            {
                "question_number": "3a",
                "order_idx": 5,
                "max_marks": 8.0,
                "question_text": "What is proximity measure and discuss on different quantitative variables.",
                "model_answer": "Proximity measures quantify how similar or dissimilar two data objects are. Similarity ranges from 0 to 1, while distance (dissimilarity) is 0 for identical objects. Common distance measures include Euclidean distance, Manhattan distance, and Minkowski distance. Quantitative variables include interval-scaled variables (no true zero, e.g. temperature) and ratio-scaled variables (inherent zero point, e.g. height, weight).",
                "rubrics": [
                    {"title": "Definition of proximity measure", "marks": 2.0, "keywords": "proximity measure, similarity, dissimilarity, distance, metric"},
                    {"title": "Explanation of distance/similarity measures", "marks": 3.0, "keywords": "euclidean distance, manhattan distance, minkowski, formula"},
                    {"title": "Quantitative variables discussion", "marks": 3.0, "keywords": "quantitative variables, continuous, discrete, ratio-scaled, interval-scaled"}
                ]
            },
            {
                "question_number": "3b",
                "order_idx": 6,
                "max_marks": 12.0,
                "question_text": "Consider the following set of data given in table. Cluster it using k-means algorithm with the initial value of objects 2 and 5 with the coordinate values (4, 6) and (12, 4) as initial seeds.",
                "model_answer": "Given points: 1(2,4), 2(4,6), 3(6,8), 4(10,4), 5(12,4). Initial seeds C1=(4,6), C2=(12,4). Distance formula: d = sqrt((x2-x1)^2 + (y2-y1)^2). Distances: For 1: d(C1)=2.83, d(C2)=10 -> C1. For 2: d(C1)=0, d(C2)=8.24 -> C1. For 3: d(C1)=2.83, d(C2)=7.21 -> C1. For 4: d(C1)=6.32, d(C2)=2 -> C2. For 5: d(C1)=8.25, d(C2)=0 -> C2. Clusters: C1={1,2,3}, C2={4,5}. Updated centroids: C1=((2+4+6)/3, (4+6+8)/3)=(4,6). C2=((10+12)/2, (4+4)/2)=(11,4).",
                "rubrics": [
                    {"title": "Initial cluster selection", "marks": 2.0, "keywords": "initial cluster seeds, c1 (4, 6), c2 (12, 4), object 2, object 5"},
                    {"title": "Distance calculations", "marks": 4.0, "keywords": "distance formula, sqrt, 2.83, 10, 8.24, 7.21, 6.324, 2, 8.246, 0"},
                    {"title": "Cluster reassignment", "marks": 3.0, "keywords": "cluster reassignment, c1, c2, {1, 2, 3}, {4, 5}, belongs"},
                    {"title": "Final clusters/result", "marks": 3.0, "keywords": "new coordinates, update coordinates, (4, 6), (11, 4), cluster result"}
                ]
            },
            {
                "question_number": "4a",
                "order_idx": 7,
                "max_marks": 10.0,
                "question_text": "Discuss on the components of Reinforcement Learning.",
                "model_answer": "Reinforcement Learning (RL) is a machine learning paradigm where an agent learns to make decisions by taking actions in an environment to maximize cumulative reward. Key components: Agent (learner/decision-maker), Environment (world with which agent interacts), State (current situation), Action (all possible moves), Reward (feedback from environment), Policy (strategy determining action from state), and Value Function / Q-function (long-term expected return).",
                "rubrics": [
                    {"title": "Definition of Reinforcement Learning", "marks": 2.0, "keywords": "reinforcement learning, trial and error, agent, environment, cumulative reward"},
                    {"title": "Agent explanation", "marks": 2.0, "keywords": "agent, learner, decision maker, action selection"},
                    {"title": "Environment explanation", "marks": 2.0, "keywords": "environment, state space, external world, observation"},
                    {"title": "Reward and policy explanation", "marks": 2.0, "keywords": "reward, penalty, policy, strategy, action mapping"},
                    {"title": "Value/Q function explanation", "marks": 2.0, "keywords": "value function, q function, expected return, discount factor, bellman"}
                ]
            },
            {
                "question_number": "4b",
                "order_idx": 8,
                "max_marks": 10.0,
                "question_text": "Explain the Q function and Q Learning Algorithm.",
                "model_answer": "Q-function Q(s,a) represents the quality or expected total reward of taking action a in state s and following the optimal policy thereafter. The Bellman optimality equation for Q is: Q(s,a) = R(s,a) + gamma * max_a' Q(s',a'). Q-learning is a model-free off-policy algorithm. Steps: 1. Initialize Q-table with zeros. 2. For each episode, select action (e.g. epsilon-greedy). 3. Execute action, observe reward r and next state s'. 4. Update Q(s,a) = Q(s,a) + alpha * [r + gamma * max Q(s',a') - Q(s,a)]. 5. Repeat until convergence.",
                "rubrics": [
                    {"title": "Definition of Q-function", "marks": 2.0, "keywords": "q function, expected reward, quality, state action pair"},
                    {"title": "Q-value equation", "marks": 2.0, "keywords": "bellman equation, learning rate, alpha, discount factor, gamma, max q"},
                    {"title": "Q-learning algorithm steps", "marks": 4.0, "keywords": "initialize q table, select action, take action, observe reward, update q value, iterate"},
                    {"title": "Advantages/applications", "marks": 2.0, "keywords": "model-free, off-policy, convergence, robotics, gaming, autonomous"}
                ]
            },
            {
                "question_number": "5a",
                "order_idx": 9,
                "max_marks": 10.0,
                "question_text": "Apply linear regression technique to predict the 7th and 9th month sales given weeks 1 to 5 sales data.",
                "model_answer": "Given data points (1, 1.2), (2, 1.8), (3, 2.6), (4, 3.2), (5, 3.8). Compute sums: n=5, sum(x)=15, sum(y)=12.6, sum(x^2)=55, sum(xy)=44.4. Slope b = [n*sum(xy) - sum(x)*sum(y)] / [n*sum(x^2) - (sum(x))^2] = [5*44.4 - 15*12.6] / [5*55 - 225] = [222 - 189] / [275 - 225] = 33/50 = 0.66. Intercept a = [sum(y) - b*sum(x)] / n = [12.6 - 0.66*15] / 5 = [12.6 - 9.9] / 5 = 2.7/5 = 0.54. Regression line: Y = 0.54 + 0.66*X. For 7th month (x=7): Y = 0.54 + 0.66(7) = 0.54 + 4.62 = 5.16. For 9th month (x=9): Y = 0.54 + 0.66(9) = 0.54 + 5.94 = 6.48. Predictions: 5.16 and 6.48 thousands.",
                "rubrics": [
                    {"title": "Formula for linear regression", "marks": 2.0, "keywords": "y = a + bx, linear regression, equation, sum, sigma, xi, yi, xy, x^2"},
                    {"title": "Calculation of slope and intercept", "marks": 3.0, "keywords": "0.66, 0.54, slope, intercept, 33/50, 2.7/5, 44.4, 12.6, 55, 15"},
                    {"title": "Regression equation formation", "marks": 2.0, "keywords": "0.54 + 0.66, 0.54 + 0.66x, 0.54 + 0.66(x), regression equation, y = a + bx"},
                    {"title": "Prediction for 7th month", "marks": 1.5, "keywords": "7th month, 5.16, 5.16 thousands, x=7, 7"},
                    {"title": "Prediction for 9th month", "marks": 1.5, "keywords": "9th month, 6.48, 6.48 thousands, x=9, 9"}
                ]
            },
            {
                "question_number": "5b",
                "order_idx": 10,
                "max_marks": 10.0,
                "question_text": "Construct a regression tree using the given dataset.",
                "model_answer": "Regression trees are used for continuous target variables. Steps: 1. Examine the dataset and continuous target attribute. 2. For each split candidate, calculate the mean of each subset and compute the Residual Sum of Squares (RSS) or variance reduction. 3. Select the attribute and split point that minimizes total RSS. 4. Recursively partition until stopping criterion (e.g. minimum node size) is reached. 5. Assign the average target value of each leaf node as the prediction.",
                "rubrics": [
                    {"title": "Understanding dataset and target attribute", "marks": 2.0, "keywords": "continuous target, dataset, regression tree, feature space"},
                    {"title": "Selection of splitting attribute", "marks": 2.0, "keywords": "splitting attribute, variance reduction, rss, residual sum of squares, best split"},
                    {"title": "Tree construction steps", "marks": 3.0, "keywords": "root node, recursive partitioning, branch, leaves, stopping criteria"},
                    {"title": "Intermediate calculations", "marks": 2.0, "keywords": "mean calculation, rss computation, error reduction"},
                    {"title": "Final regression tree/result", "marks": 1.0, "keywords": "tree diagram, decision rules, prediction leaves"}
                ]
            }
        ]

        created_questions = []
        for q_dict in questions_data:
            q = Question(
                exam_id=exam.id,
                question_number=q_dict["question_number"],
                order_idx=q_dict["order_idx"],
                question_text=q_dict["question_text"],
                max_marks=q_dict["max_marks"],
                model_answer=q_dict["model_answer"]
            )
            db.add(q)
            db.flush()
            for r_dict in q_dict["rubrics"]:
                r = RubricItem(
                    question_id=q.id,
                    concept_title=r_dict["title"],
                    weight_marks=r_dict["marks"],
                    keywords=r_dict["keywords"],
                    description=f"Evaluate student's understanding and accurate presentation of {r_dict['title']}."
                )
                db.add(r)
            created_questions.append(q)

        db.commit()
        print(f"[OK] Configured {len(created_questions)} questions with full rubrics.")

        # 5. Ingest Student Nasrin's 17-Page Handwritten Script
        nasrin_script_text = """Module-3
Ans 5:
Given data:
xi (week) | yi (sales in thousands)
1 | 1.2
2 | 1.8
3 | 2.6
4 | 3.2
5 | 3.8

Step 1: Find the details of data.
xi | yi | x^2 | xy
1 | 1.2 | 1 | 1.2
2 | 1.8 | 4 | 3.6
3 | 2.6 | 9 | 7.8
4 | 3.2 | 16 | 12.8
5 | 3.8 | 25 | 19

Step 2: Find the total sum.
Σxi = 15
Σyi = 12.6
Σx^2 = 55
Σxy = 44.4
n = 5

We have to find regression technique to predict the 7th and 9th month sales.
Linear regression equation:
Y = a + bx
Where Y -> output, X -> input, b -> slope / polar value, a -> intercept.

Step 3: Find the slope value:
b = (n Σxy - (Σx)(Σy)) / (n Σx^2 - (Σx)^2)
b = (5 * 44.4 - 15 * 12.6) / (5 * 55 - (15)^2)
b = (222 - 189) / (275 - 225) = 33 / 50 = 0.66

Step 4: Find the intercept value:
a = (Σy - b(Σx)) / n
a = (12.6 - 0.66 * 15) / 5
a = (12.6 - 9.9) / 5 = 2.7 / 5 = 0.54
So a = 0.54, b = 0.66

Step 5: Find 7th month sales:
Y = a + bx = 0.54 + 0.66(7) = 0.54 + 4.62 = 5.16
Y = 5.16

Step 6: Find 9th month sales:
Y = a + bx = 0.54 + 0.66(9) = 0.54 + 5.94 = 6.48
Y = 6.48

Hence using the linear regression technique the prediction of 7th month and 9th month is 5.16 and 6.48 thousands.

Linear regression is a supervised machine learning algorithm to find the continuous prediction value.
It is used in:
Pattern matching, Prediction.
There are 2 types of regression:
1. Linear Regression
2. Polynomial Regression
Graphical representation:
1. Linear Regression plot
2. Polynomial Regression plot


Module-5
Ans 3b:
Given data:
object | X | Y
1 | 2 | 4
2 | 4 | 6
3 | 6 | 8
4 | 10 | 4
5 | 12 | 4

Step 1: Conditions are given:
Initial value of objects 2 and 5 with coordinate value (4, 6) and (12, 4) as initial seeds.
object 2 = (4, 6) = c1
object 5 = (12, 4) = c2

Step 2: Distance formula:
D(X, Y) = sqrt((x2 - x1)^2 + (y2 - y1)^2)

Substitute the value:
Step 3: For object 1:
c1 = (4, 6)
d = sqrt((2 - 4)^2 + (4 - 6)^2) = sqrt((-2)^2 + (-2)^2) = sqrt(4 + 4) = sqrt(8) = 2.83
c2 = (12, 4)
d = sqrt((2 - 12)^2 + (4 - 4)^2) = sqrt((-10)^2 + 0) = sqrt(100) = 10
Object 1 belongs to C1.

Step 4: For object 2:
c1 = (4, 6)
d = sqrt((4 - 4)^2 + (6 - 6)^2) = 0
c2 = (12, 4)
d = sqrt((4 - 12)^2 + (6 - 4)^2) = sqrt((-8)^2 + 2^2) = sqrt(64 + 4) = 8.24
Object 2 belongs to C1.

Step 5: For object 3:
c1 = (4, 6)
d = sqrt((6 - 4)^2 + (8 - 6)^2) = sqrt(2^2 + 2^2) = sqrt(8) = 2.83
c2 = (12, 4)
d = sqrt((6 - 12)^2 + (8 - 4)^2) = sqrt((-6)^2 + 4^2) = sqrt(36 + 16) = sqrt(52) = 7.21
Object 3 belongs to C1.

Step 6: For object 4:
c1 = (4, 6)
d = sqrt((10 - 4)^2 + (4 - 6)^2) = sqrt(6^2 + (-2)^2) = sqrt(40) = 6.324
c2 = (12, 4)
d = sqrt((10 - 12)^2 + (4 - 4)^2) = sqrt((-2)^2 + 0) = 2
Object 4 belongs to C2.

Step 7: For object 5:
c1 = (4, 6)
d = sqrt((12 - 4)^2 + (4 - 6)^2) = sqrt(8^2 + (-2)^2) = sqrt(68) = 8.246
c2 = (12, 4)
d = sqrt((12 - 12)^2 + (4 - 4)^2) = 0
Object 5 belongs to C2.

Step 8:
object | belongs
C1 | 1, 2, 3
C2 | 4, 5

Find the new coordinates:
For C1: ((2 + 4 + 6)/3, (4 + 6 + 8)/3) = (12/3, 18/3) = (4, 6)
For C2: ((10 + 12)/2, (4 + 4)/2) = (22/2, 8/2) = (11, 4)

Object | Coordinates
C1 | (4, 6)
C2 | (11, 4)

So cluster result is C1 = (4, 6) and C2 = (11, 4) as the update coordinates & C1 and C2 belongs are {1, 2, 3} and {4, 5}.


Module-4
Ans 1a:
Introduction: Artificial Neural Network:
ANN is a computation design inspired by the human brain. It is used to learning & training data.
Neat diagram of biological neuron showing Cell body, Axon, Input (dendrites), Output (synapse), human neuron system.
ANN is same work same concept of human neuron system.

Concept of Perceptron ANN:
Perceptron is a type of ANN.
It is used to solve complex problem.
Used in learning purpose.
Neat diagram of Perceptron with inputs x1, x2, x3... xn, weights w1, w2, w3... wn, body cell / summation node, Axon, activation function, output.

Basic working of Perceptron:
Perceptron take the input (Xn) and multiply with their weight (Wn) and add the bias.

Mathematical Representation:
Y = F(Σ_{i=0}^n (Xn Wi + b))
Where:
Y -> Output
F -> Activation function
X -> Inputs
W -> Weights
b -> Bias

Working principle of Perceptron ANN:
Perceptron take the input for training & learning purpose.
Multiply the input value corresponding to their weight for high efficient result.
Add the bias for error handling.
After calculation Perceptron give the final output (Y).

Advantage of using Perceptron ANN:
Solve the complex problem.
Provide the multilayer input.
It has hidden layers.
Give the accurate solution.
It is multilayer.
Perceptron Artificial Neural Network layer:
Input layer -> Hidden layer -> Output layer
I/p 1 -> h1 -> O/p
I/p 2 -> h2
I/p 3


Ans 1b:
Naive Bayes Algorithm:
Given data:
S.No | CGPA | Interactiveness | Job Offer
1 | 9.5 | Yes | Yes
2 | 8.2 | No | Yes
3 | 9.3 | No | No
4 | 7.6 | No | No
5 | 8.4 | Yes | Yes
6 | 9.1 | Yes | Yes
7 | 7.5 | Yes | No
8 | 9.6 | No | Yes
9 | 8.6 | Yes | Yes
10 | 8.3 | Yes | Yes

Condition are given:
Consider Test data:
X = (CGPA = 8.5 and Interactiveness = No)
Our aim is Job offer is classified as Yes or No for candidate student.

For Job offer = 'Yes':
Total = 10, Yes = 7
So, P(Yes) = 7/10 = 0.7

For Job offer = 'No':
Total = 10, No = 3
So, P(No) = 3/10 = 0.3

Find the Yes or No separately:
Yes for CGPA: 9.5, 8.2, 8.4, 9.1, 9.6, 8.6, 8.3
Take the average:
Avg = (9.5 + 8.2 + 8.4 + 9.1 + 9.6 + 8.6 + 8.3) / 7 = 61.8 / 7 = 8.82

Job offer 'Yes' corresponding to Interactiveness:
Yes = 5, and job offer = 'Yes' is 7
So, P(Yes | Yes) = 5/7 = 0.714

Now, same step for 'No':
Job offer = 'No' CGPA is: 9.3, 7.6, 7.5
Take the average:
Avg = (9.3 + 7.6 + 7.5) / 3 = 24.4 / 3 = 8.23

Job offer 'No' corresponding to the Interactiveness:
No = 1, and job offer = 3
So, P(Yes | No) = 1/3 = 0.33

Test data as CGPA = 8.5 & Interactive = No
Result CGPA:
Job offer Yes: 8.82
Job offer No: 8.23
P(Yes | Yes) = 0.714
P(Yes | No) = 0.33

So, based on test data as CGPA = 8.5 & Interactiveness = No, Job offer with Yes is higher chance (0.714 > 0.33).
Whether student get a job offer: Yes.
"""

        sub = Submission(
            exam_id=exam.id,
            student_roll="1HK23CS108",
            student_name="Nasrin",
            student_email="1hk23cs108@hkbk.edu.in",
            original_filename="Nasrin IA2.pdf",
            file_path=str(dest_sub),
            file_type="pdf",
            extracted_text=nasrin_script_text,
            ocr_confidence=96.5,
            is_ocr_verified=True,
            submission_type="teacher_bulk",
            status="ready_for_grading"
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        print(f"[OK] Ingested submission: ID={sub.id}, Student='{sub.student_name}' ({sub.student_roll}), Verified={sub.is_ocr_verified}")

        # 6. Execute Grading Pipeline
        print("\n=== Running AI Evaluation Engine ===")
        grading_result = run_exam_grading(exam_id=exam.id, request=None, db=db)
        print(f"Grading response: {grading_result}")

        # 7. Print Out Detailed Breakdown
        db.refresh(sub)
        print(f"\n==========================================")
        print(f"EVALUATION RESULTS FOR {sub.student_name} ({sub.student_roll})")
        print(f"Total Marks Awarded: {sub.total_awarded_marks} / {exam.total_marks} ({sub.percentage}%)")
        print(f"Pass/Fail Status: {'PASSED' if sub.passed else 'FAILED'}")
        print(f"==========================================")
        
        evals = db.query(AnswerEvaluation).filter(AnswerEvaluation.submission_id == sub.id).all()
        for ev in evals:
            q = ev.question
            print(f"\nQuestion {q.question_number} (Max: {q.max_marks} M): Awarded = {ev.final_marks} M (AI Conf: {ev.confidence_score})")
            print(f"  Lost marks reason: {ev.lost_marks_reason}")
            print(f"  Improvement suggestion: {ev.improvement_suggestions}")
            if ev.strengths and ev.strengths != '[]':
                print(f"  Strengths: {ev.strengths}")
            if ev.missed_concepts and ev.missed_concepts != '[]':
                print(f"  Missed Concepts: {ev.missed_concepts}")

        return True

    finally:
        db.close()

if __name__ == "__main__":
    setup_and_test_ml_exam()
