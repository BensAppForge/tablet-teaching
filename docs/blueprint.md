# **App Name**: Tablet Teaching

## Core Features:

- Account Creation: Account creation via email/password or social login (Google, Microsoft).
- Teacher Dashboard: Dashboard for creating, editing, cloning, deleting, distributing, and evaluating tests.
- Test Creation: Manual and AI-assisted test creation.
- Test Distribution: Test distribution via QR code or short alphanumeric code.
- PDF Export: PDF export of quizzes in A4 format, optimized for printing and handwriting.
- Quiz Configuration: Quiz configuration options: Target language, CEFR level, Topic, Description, Default time per question (5–30 seconds), Default credit points, Multiplier per question (steps of 0.5)
- Leaderboard View: Leaderboard view with CSV export and manual deletion of student attempts.
- Student Access: Access via code and nickname (no login required).
- Responsive Quiz Interface: Responsive quiz interface for mobile and tablets.
- Quiz Modes: Two quiz modes: Live: Teacher starts each question synchronously. Individual: Students complete quizzes on their own.
- Unique Nickname: Nickname must be unique per quiz.
- Code/Nickname Warning: Warning to remember code and nickname.
- Leaderboard Access: Leaderboard view after test (even after expiration).
- Privacy Disclaimer: Privacy disclaimer shown before quiz, with “don’t show again” option.
- Retake Control: Retakes allowed or blocked based on teacher setting.
- Expired Quiz Handling: Expired quiz codes trigger a read-only leaderboard view.
- Quiz Formats: Supported quiz formats: Multiple Choice (2–4 options), True/False, Gap-Fill (with distractors), Matching (left-right items), Reordering: Horizontal (sentence building), Vertical (verb conjugation steps)
- AI Assistant: Teachers must enter a prompt ("AI instructions"). Backend uses system prompts and function calling (e.g., OpenAI API) to generate structured test data in JSON.
- Single Question Display: One question per screen.
- Question Timer: Timer per question (configurable).
- Immediate Feedback: Immediate feedback after each question (correct/wrong with explanation).
- Quiz Effects: Confetti and sound effects (toggleable). Customizable confetti (default or emoji-based). Fullscreen mode for quizzes.

## Style Guidelines:

- Framework: React with shadcn/ui, Tailwind CSS, and Lucide icons.
- Accent color: Friendly orange (`#f97316` or similar).
- Layout: Fixed header and footer, Responsive content area, Dark/light mode
- German UI labels and flow
- Clean, card-based dashboard for teachers
- Streamlined quiz flow for students

## Original User Request:
A pwa/spa called tablet teaching. It's for teachers teaching foreign languages and their students. It help teachers create and distribute tests or quizzes for printout and live play predominantly on tablets.
  