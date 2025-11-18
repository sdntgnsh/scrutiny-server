# Scrutiny Server (Backend)

This is the complete backend API for the Scrutiny quiz application. It handles user authentication, quiz creation, and the full logic for managing secure, real-time, timed quiz sessions.

## 🚀 Testing Prerequisites

Before testing, you MUST have the following:

1.  **`.env` File:** Create a `.env` file in the project root with your Supabase keys:
    ```ini
    SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
    SUPABASE_SERVICE_KEY=your-secret-service-role-key
    ```
2.  **Firebase Key:** Place your Firebase Admin SDK `.json` file in the project root, named exactly: `srtny-back-firebase-adminsdk-fbsvc-670f235282.json`.
3.  **Run Server:** Install dependencies and start the server:
    ```bash
    npm install
    npm start
    ```
    The server runs on `http://localhost:3001`.
4.  **Get Tokens:** You cannot test protected routes without a token. Use a script like `getToken.js` (from a previous answer) to get access tokens for your test **teacher** and **student** users.

---

## 📖 API Endpoints

All protected endpoints require an `Authorization: Bearer <TOKEN>` header.

### 1. Authentication

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/auth/register` | All | Creates a new user. |
| **`GET`** | `/api/auth/me` | All | Tests a token and returns the user's profile. |

---
**`POST /api/auth/register`**
* **Input (Body):**
    ```json
    {
      "email": "teacher@example.com",
      "password": "password123",
      "name": "Test Teacher",
      "role": "teacher",
      "employee_id": "T-123"
    }
    ```
* **Output (Success `201`):**
    ```json
    {
      "message": "User registered successfully",
      "user": { "id": "...", "email": "...", "role": "teacher", ... }
    }
    ```
---
**`GET /api/auth/me`**
* **Input:** None (Header only).
* **Output (Success `200`):**
    ```json
    {
      "message": "Token is valid. User profile retrieved.",
      "user": { "id": "...", "email": "teacher@example.com", "role": "teacher" }
    }
    ```

### 2. Quiz Management

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/quizzes` | Teacher | Creates a new quiz. |
| **`GET`** | `/api/quizzes` | All | Gets a list of all available quizzes (metadata only). |
| **`GET`** | `/api/quizzes/:id`| Teacher | Gets a single quiz, **including correct answers**. (Locked to teachers). |

---
**`POST /api/quizzes`**
* **Input (Body):**
    ```json
    {
      "title": "History 101",
      "subject": "History",
      "questions": [
        { "questionText": "Q1?", "options": ["A", "B"], "correctAnswer": 0 }
      ]
    }
    ```
* **Output (Success `201`):**
    ```json
    { "message": "Quiz created successfully", "quizId": "...", "data": { ... } }
    ```
---
**`GET /api/quizzes`**
* **Input:** None (Header only).
* **Output (Success `200`):**
    ```json
    [
      { "id": "...", "title": "History 101", "subject": "History", ... }
    ]
    ```
---
**`GET /api/quizzes/:id`**
* **Input:** URL Param `:id` (the Quiz ID).
* **Output (Success `200`):**
    ```json
    {
      "id": "...",
      "title": "History 101",
      "questions": [
        { "questionText": "Q1?", "options": ["A", "B"], "correctAnswer": 0 }
      ]
    }
    ```
---

### 3. Live Session Flow

This is the main "game loop" for a timed quiz.

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| **`POST`** | `/api/quizzes/:id/start` | Teacher | **1. Create Lobby:** Creates a session, sets duration, gets `PIN`. |
| **`POST`** | `/api/sessions/join` | Student | **2. Join Lobby:** Student joins the session using the `PIN`. |
| **`GET`** | `/api/sessions/:id/status`| Student | **3. Poll Status:** Student polls this to check when the game starts. |
| **`POST`** | `/api/sessions/:id/start` | Teacher | **4. Start Quiz:** Teacher activates the session, starts the timer. |
| **`GET`** | `/api/sessions/:id/quiz` | Student | **5. Get Questions:** Student gets **sanitized** quiz (no answers). |
| **`POST`** | `/api/sessions/:id/submit`| Student | **6. Submit Answers:** Student submits answers; backend checks timer. |
| **`POST`** | `/api/sessions/:id/end` | Teacher | **(Manual):** Manually ends the quiz. |
| **`GET`** | `/api/sessions/:id/results`| Teacher | **7. Get Results:** Teacher gets the final scores. |

---
**`POST /api/quizzes/:id/start` (Create Lobby)**
* **Input:** URL Param `:id` (Quiz ID), Body:
    ```json
    { "duration": 45 }
    ```
* **Output (Success `201`):**
    ```json
    {
      "message": "Live session started. Waiting for students to join.",
      "sessionId": "abc-123",
      "pin": "654321",
      "duration": 45
    }
    ```
---
**`POST /api/sessions/join` (Join Lobby)**
* **Input (Body):**
    ```json
    { "pin": "654321" }
    ```
* **Output (Success `200`):**
    ```json
    {
      "message": "Successfully joined the lobby!",
      "sessionId": "abc-123",
      "quizId": "...",
      "teacherId": "..."
    }
    ```
---
**`GET /api/sessions/:id/status` (Poll Status)**
* **Input:** URL Param `:id` (Session ID).
* **Output (Success `200` - Lobby):**
    ```json
    { "status": "lobby", "endTime": null }
    ```
* **Output (Success `200` - Active):**
    ```json
    { "status": "active", "endTime": "2025-11-18T16:00:00.000Z" }
    ```
---
**`POST /api/sessions/:id/start` (Start Quiz)**
* **Input:** URL Param `:id` (Session ID).
* **Output (Success `200`):**
    ```json
    {
      "message": "Quiz session is now active!",
      "sessionId": "abc-123",
      "status": "active",
      "startTime": "...",
      "endTime": "..."
    }
    ```
---
**`GET /api/sessions/:id/quiz` (Get Questions)**
* **Input:** URL Param `:id` (Session ID).
* **Output (Success `200` - SANITIZED):**
    ```json
    {
      "id": "...",
      "title": "History 101",
      "questions": [
        { "questionText": "Q1?", "options": ["A", "B"] }
      ],
      "endTime": "..."
    }
    ```
---
**`POST /api/sessions/:id/submit` (Submit Answers)**
* **Input:** URL Param `:id` (Session ID), Body:
    ```json
    { "answers": [0] }
    ```
* **Output (Success `200`):**
    ```json
    {
      "message": "Quiz submitted successfully!",
      "score": 1,
      "totalQuestions": 1
    }
    ```
---
**`POST /api/sessions/:id/end` (Manual End)**
* **Input:** URL Param `:id` (Session ID).
* **Output (Success `200`):**
    ```json
    { "message": "Quiz session has been manually ended.", "status": "finished" }
    ```
---
**`GET /api/sessions/:id/results` (Get Results)**
* **Input:** URL Param `:id` (Session ID).
* **Output (Success `200`):**
    ```json
    {
      "sessionId": "abc-123",
      "status": "finished",
      "participants": [
        {
          "studentId": "...",
          "name": "Test Student",
          "status": "Submitted",
          "score": 1,
          "totalQuestions": 1,
          "submittedAt": "..."
        }
      ]
    }
    ```
---

## 🏁 Final API Flow (Brief)

1.  **Teacher:** `POST /api/quizzes` (Creates a quiz).
2.  **Teacher:** `POST /api/quizzes/:id/start` (Starts a lobby) -> Gets `pin` & `sessionId`.
3.  **Student:** `POST /api/sessions/join` (Uses `pin` to join).
4.  **Student App:** Polls `GET /api/sessions/:id/status` (Keeps getting `"lobby"`).
5.  **Teacher:** `POST /api/sessions/:id/start` (Clicks "Start Game").
6.  **Student App:** Polls `GET /api/sessions/:id/status` (Gets `"active"` and `endTime`).
7.  **Student App:** `GET /api/sessions/:id/quiz` (Gets all questions *without answers*).
8.  **Student:** `POST /api/sessions/:id/submit` (Submits answers before `endTime`).
9.  **Teacher:** `GET /api/sessions/:id/results` (Gets the final scores).