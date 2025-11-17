functionality Achieved

User Management: You can create distinct "teacher" and "student" accounts (/api/auth/register).

Quiz Creation: A teacher can create a quiz with questions and correct answers (/api/quizzes).

Lobby Creation: A teacher can create a "live session" for their quiz, set a duration, and get a PIN (/api/quizzes/:id/start).

Student Joining: A student can use that PIN to join the lobby (/api/sessions/join).

Starting the Quiz: A teacher can "activate" the session, which locks the lobby and starts the master timer on the backend (/api/sessions/:id/start).

Ending the Quiz: A teacher can manually end the quiz at any time (/api/sessions/:id/end)