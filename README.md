# Scrutiny Server (Backend)

This is the backend API for the Scrutiny quiz application. It handles user authentication, quiz creation, and the complete logic for managing real-time, timed quiz sessions.

## 🚀 Testing Prerequisites

Before you can test any endpoints, you must have the following set up:

1.  **API Client:** You must use an API client like **Postman** or **Insomnia**.

2.  **`.env` File:** Create a file named `.env` in the root of this project. It must contain your Supabase keys:
    ```ini
    SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
    SUPABASE_SERVICE_KEY=your-secret-service-role-key
    ```

3.  **Firebase Key:** Place your Firebase Admin SDK service account file in the root of the project. The server expects a file with this *exact name*:
    * `srtny-back-firebase-adminsdk-fbsvc-670f235282.json`

4.  **Install & Run:** Install dependencies and start the server:
    ```bash
    npm install
    npm start
    ```
    The server will run on `http://localhost:3001`.

5.  **Get a Token (Most Important!)**
    Your API is protected. You cannot test it without a valid JWT. Create a file named `getToken.js` in your project root to get tokens for your test users.

    * First, install the Supabase client: `npm install @supabase/supabase-js`
    * Then, use this code in `getToken.js`:

    ```javascript
    // getToken.js
    const { createClient } = require("@supabase/supabase-js");
    require("dotenv").config();

    // ❗️ ADD YOUR PUBLIC ANON KEY HERE (from Supabase Dashboard)
    const SUPABASE_ANON_KEY = "your-public-anon-key-goes-here";
    
    // --- EDIT THESE TO LOGIN ---
    const USER_EMAIL = "test-_-01@example.com";
    const USER_PASSWORD = "SecurePassword!";
    // ---

    const supabase = createClient(process.env.SUPABASE_URL, SUPABASE_ANON_KEY);

    async function signIn() {
      console.log(`Logging in as: ${USER_EMAIL}`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: USER_EMAIL, password: USER_PASSWORD
      });
      if (error) {
        console.error("Login failed:", error.message);
      } else {
        console.log("\n✅ LOGIN SUCCESSFUL. YOUR TOKEN IS:\n");
        console.log(data.session.access_token);
      }
    }
    signIn();
    ```
    * Run `node getToken.js` to get a token.
    * In Postman, set your authorization to **Bearer Token** and paste this token.

---

## 📖 API Endpoints

### 1. Authentication
Handles user registration and verification.

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | All | Creates a new user (with `role`: "student" or "teacher"). |
| `GET` | `/api/auth/me` | All | Tests a token and returns the user's profile. |

### 2. Quiz Management
CRUD operations for quizzes.

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/quizzes` | Teacher | Creates a new quiz with questions and answers. |
| `GET` | `/api/quizzes` | All | Gets a list of all quizzes (metadata only). |
| `GET` | `/api/quizzes/:id` | All | Gets a single quiz with all its questions. |

### 3. Live Session Flow
The main workflow for a live, timed quiz.

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/quizzes/:id/start` | Teacher | **1. Create Lobby:** Creates a new live session, sets a `duration`, and returns a `PIN`. |
| `POST` | `/api/sessions/join` | Student | **2. Join Lobby:** Student joins the session using the `PIN`. |
| `POST` | `/api/sessions/:id/start` | Teacher | **3. Start Quiz:** Activates the session, locks the lobby, and starts the timer. |
| `POST` | `/api/sessions/:id/submit`| Student | **4. Submit Answers:** Student submits answers. Fails if timer is up or session is not active. |
| `POST` | `/api/sessions/:id/end` | Teacher | **(Manual):** Manually ends the quiz (e.g., if timer runs out). |
| `GET` | `/api/sessions/:id/results`| Teacher | **5. Get Results:** Gets the final list of participants and their scores. |