import json
from pathlib import Path

import pandas as pd
import streamlit as st

try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None

from knowledge_base import init_db, get_pending_questions, save_learned_answer


init_db()

BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = BASE_DIR / "finance_chat_logs.jsonl"

LANGUAGE_LABELS = {
    "en": "English",
    "he": "עברית",
    "es": "Español",
    "fr": "Français",
}

UI_TEXT = {
    "dashboard_language": "Dashboard language",
    "dashboard_title": "LoviesLedger Finance Bot Dashboard",
    "reading_logs": "Reading logs from:",
    "analytics_tab": "Analytics",
    "teach_tab": "Teach the Bot",
    "no_logs": "No logs found yet.",
    "rows_loaded": "Rows loaded:",
    "filters": "Filters",
    "language": "Language",
    "status_filter": "Status",
    "total_messages": "Total Messages",
    "bot_answered": "Bot Answered",
    "needs_human": "Needs Human",
    "top_language": "Top Language",
    "intent_distribution": "Intent Distribution",
    "language_distribution": "Language Distribution",
    "status_distribution": "Status Distribution",
    "confidence": "Confidence",
    "recent_interactions": "Recent Interactions",
    "profile_name": "Profile Name",
    "user_id": "User ID",
    "time": "Time",
    "intent": "Intent",
    "status": "Status",
    "question": "Question",
    "bot_reply": "Bot Reply",
    "pending_unknown_questions": "Pending Unknown Questions",
    "no_pending": "No pending unknown questions.",
    "save_the_answer": "Save the answer",
    "answer_en": "Answer in English",
    "answer_es": "Answer in Spanish",
    "answer_fr": "Answer in French",
    "answer_he": "Answer in Hebrew",
    "save_answer": "Save Answer",
    "answer_saved": "Answer saved.",
    "refresh": "Refresh",
}


st.set_page_config(page_title="LoviesLedger Finance Bot Dashboard", layout="wide")

worker_language = st.selectbox(
    UI_TEXT["dashboard_language"],
    options=["en", "he", "es", "fr"],
    format_func=lambda x: LANGUAGE_LABELS[x],
)

st.title(UI_TEXT["dashboard_title"])

top_left, top_right = st.columns([1, 5])
with top_left:
    if st.button(UI_TEXT["refresh"]):
        st.cache_data.clear()
        st.rerun()

with top_right:
    st.write(f'{UI_TEXT["reading_logs"]} {str(LOG_FILE)}')


def load_logs(path: str) -> pd.DataFrame:
    file_path = Path(path)
    if not file_path.exists():
        return pd.DataFrame()

    rows = []
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"], errors="coerce")
    return df


@st.cache_data(show_spinner=False)
def translate_text(text: str, target_lang: str) -> str:
    if text is None or pd.isna(text):
        return ""

    text = str(text).strip()
    if not text:
        return ""

    if GoogleTranslator is None:
        return text

    translator_target = "iw" if target_lang == "he" else target_lang
    try:
        return GoogleTranslator(source="auto", target=translator_target).translate(text)
    except Exception:
        return text


df = load_logs(str(LOG_FILE))
tab1, tab2 = st.tabs([UI_TEXT["analytics_tab"], UI_TEXT["teach_tab"]])

with tab1:
    if df.empty:
        st.warning(UI_TEXT["no_logs"])
    else:
        st.write(f'{UI_TEXT["rows_loaded"]} {len(df)}')
        st.sidebar.header(UI_TEXT["filters"])

        languages = ["All"] + sorted(df["language"].dropna().unique().tolist()) if "language" in df.columns else ["All"]
        selected_language = st.sidebar.selectbox(UI_TEXT["language"], languages)

        statuses = ["All"] + sorted(df["status"].dropna().unique().tolist()) if "status" in df.columns else ["All"]
        selected_status = st.sidebar.selectbox(UI_TEXT["status_filter"], statuses)

        filtered_df = df.copy()
        if selected_language != "All":
            filtered_df = filtered_df[filtered_df["language"] == selected_language]
        if selected_status != "All":
            filtered_df = filtered_df[filtered_df["status"] == selected_status]

        col1, col2, col3, col4 = st.columns(4)
        total_messages = len(filtered_df)
        bot_answered = (filtered_df["status"] == "BOT ANSWERED").sum() if "status" in filtered_df.columns else 0
        needs_human = (filtered_df["status"] == "NEEDS HUMAN ANSWER").sum() if "status" in filtered_df.columns else 0
        top_language = filtered_df["language"].mode().iloc[0] if "language" in filtered_df.columns and not filtered_df.empty else "N/A"

        col1.metric(UI_TEXT["total_messages"], total_messages)
        col2.metric(UI_TEXT["bot_answered"], int(bot_answered))
        col3.metric(UI_TEXT["needs_human"], int(needs_human))
        col4.metric(UI_TEXT["top_language"], top_language)

        st.divider()
        left, right = st.columns(2)

        with left:
            st.subheader(UI_TEXT["intent_distribution"])
            if "intent" in filtered_df.columns:
                st.bar_chart(filtered_df["intent"].value_counts())

        with right:
            st.subheader(UI_TEXT["language_distribution"])
            if "language" in filtered_df.columns:
                st.bar_chart(filtered_df["language"].value_counts())

        st.divider()
        left2, right2 = st.columns(2)

        with left2:
            st.subheader(UI_TEXT["status_distribution"])
            if "status" in filtered_df.columns:
                st.bar_chart(filtered_df["status"].value_counts())

        with right2:
            st.subheader(UI_TEXT["confidence"])
            if "confidence" in filtered_df.columns:
                st.line_chart(filtered_df["confidence"].reset_index(drop=True))

        st.divider()
        st.subheader(UI_TEXT["recent_interactions"])

        display_df = filtered_df.copy()
        if "user_message" in display_df.columns:
            display_df["question_for_worker"] = display_df["user_message"].apply(lambda x: translate_text(x, worker_language))
        if "bot_reply" in display_df.columns:
            display_df["reply_for_worker"] = display_df["bot_reply"].apply(lambda x: translate_text(x, worker_language))

        show_cols = [
            col for col in [
                "time", "profile_name", "user_id", "language", "question_for_worker",
                "reply_for_worker", "intent", "confidence", "status", "user_message", "bot_reply"
            ]
            if col in display_df.columns
        ]

        if "time" in display_df.columns:
            display_df = display_df.sort_values("time", ascending=False)

        st.dataframe(display_df[show_cols], width="stretch")

with tab2:
    st.subheader(UI_TEXT["pending_unknown_questions"])
    pending = get_pending_questions()

    if not pending:
        st.success(UI_TEXT["no_pending"])
    else:
        for row in pending:
            question_id, user_message, normalized_message, language, user_id, profile_name, created_at = row
            translated_question = translate_text(user_message, worker_language)

            with st.expander(f"#{question_id} | {translated_question}"):
                st.write(f"**Language:** {language}")
                st.write(f"**User:** {user_id}")
                st.write(f"**Name:** {profile_name}")
                st.write(f"**Received:** {created_at}")
                st.write(f"**Question key:** {normalized_message}")
                st.markdown("### Question")
                st.write(translated_question)
                st.markdown(f"### {UI_TEXT['save_the_answer']}")

                answer_en = st.text_area(UI_TEXT["answer_en"], key=f"en_{question_id}")
                answer_es = st.text_area(UI_TEXT["answer_es"], key=f"es_{question_id}")
                answer_fr = st.text_area(UI_TEXT["answer_fr"], key=f"fr_{question_id}")
                answer_he = st.text_area(UI_TEXT["answer_he"], key=f"he_{question_id}")

                if st.button(UI_TEXT["save_answer"], key=f"save_{question_id}"):
                    save_learned_answer(
                        question_id=question_id,
                        question_key=normalized_message,
                        answer_en=answer_en,
                        answer_es=answer_es,
                        answer_fr=answer_fr,
                        answer_he=answer_he
                    )
                    st.success(UI_TEXT["answer_saved"])
                    st.cache_data.clear()
                    st.rerun()
