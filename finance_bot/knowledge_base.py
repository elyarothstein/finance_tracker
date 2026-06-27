import sqlite3
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "finance_bot.db"


def get_connection():
    return sqlite3.connect(DB_FILE)


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS unknown_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_message TEXT NOT NULL,
        normalized_message TEXT NOT NULL,
        language TEXT,
        user_id TEXT,
        profile_name TEXT,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS learned_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_key TEXT NOT NULL UNIQUE,
        answer_en TEXT,
        answer_es TEXT,
        answer_fr TEXT,
        answer_he TEXT,
        source_question_id INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_question_id) REFERENCES unknown_questions(id)
    )
    """)

    conn.commit()
    conn.close()


def save_unknown_question(user_message, normalized_message, language, user_id, profile_name):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO unknown_questions (
        user_message, normalized_message, language, user_id, profile_name, created_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        user_message,
        normalized_message,
        language,
        user_id,
        profile_name,
        datetime.now().isoformat(),
        "pending"
    ))

    question_id = cur.lastrowid
    conn.commit()
    conn.close()
    return question_id


def get_pending_questions():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT id, user_message, normalized_message, language, user_id, profile_name, created_at
    FROM unknown_questions
    WHERE status = 'pending'
    ORDER BY created_at DESC
    """)

    rows = cur.fetchall()
    conn.close()
    return rows


def save_learned_answer(question_id, question_key, answer_en="", answer_es="", answer_fr="", answer_he=""):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    INSERT OR REPLACE INTO learned_answers (
        question_key, answer_en, answer_es, answer_fr, answer_he, source_question_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        question_key,
        answer_en,
        answer_es,
        answer_fr,
        answer_he,
        question_id,
        datetime.now().isoformat()
    ))

    cur.execute("""
    UPDATE unknown_questions
    SET status = 'answered'
    WHERE id = ?
    """, (question_id,))

    conn.commit()
    conn.close()


def _pick_answer_by_language(row, lang):
    answer_en, answer_es, answer_fr, answer_he = row

    if lang == "he" and answer_he:
        return answer_he
    if lang == "es" and answer_es:
        return answer_es
    if lang == "fr" and answer_fr:
        return answer_fr

    return answer_en


def find_learned_answer_exact(question_key, lang):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT answer_en, answer_es, answer_fr, answer_he
    FROM learned_answers
    WHERE question_key = ?
    """, (question_key,))

    row = cur.fetchone()
    conn.close()

    if not row:
        return None

    return _pick_answer_by_language(row, lang)


def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()


def find_learned_answer_fuzzy(question_key, lang, threshold=0.84):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
    SELECT question_key, answer_en, answer_es, answer_fr, answer_he
    FROM learned_answers
    """)

    rows = cur.fetchall()
    conn.close()

    best_match = None
    best_score = 0

    for row in rows:
        saved_question = row[0]
        score = similarity(question_key, saved_question)

        if score > best_score:
            best_score = score
            best_match = row

    if best_match and best_score >= threshold:
        answer = _pick_answer_by_language(best_match[1:], lang)
        return {
            "answer": answer,
            "matched_question": best_match[0],
            "score": best_score
        }

    return None


def find_learned_answer(question_key, lang, threshold=0.84):
    exact = find_learned_answer_exact(question_key, lang)
    if exact:
        return {
            "answer": exact,
            "matched_question": question_key,
            "score": 1.0
        }

    return find_learned_answer_fuzzy(question_key, lang, threshold=threshold)
