# LoviesLedger Finance Bot

This folder is a finance-chatbot version of the older WhatsApp customer-service bot.

It includes:

- `finance_bot.py` - Flask chatbot server for your website, plus optional WhatsApp/Twilio support.
- `knowledge_base.py` - SQLite database helpers for unknown questions and learned answers.
- `dashboard.py` - Streamlit dashboard for viewing chats and teaching the bot new answers.
- `requirements.txt` - Python packages to install.

## Run the bot locally

```bash
cd /Users/elyarothstein/finance_tracker/finance_bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python finance_bot.py
```

## Use the website API

When the Flask app is running, send a POST request to:

```text
http://127.0.0.1:5000/api/chat
```

Example JSON:

```json
{
  "message": "How do I track groceries?",
  "user_id": "website-user-1",
  "profile_name": "Website User",
  "language": "en"
}
```

The response looks like:

```json
{
  "reply": "Use expense categories only for necessary costs...",
  "intent": "expenses",
  "confidence": 1,
  "status": "BOT ANSWERED",
  "scores": {}
}
```

## Run the dashboard

```bash
cd /Users/elyarothstein/finance_tracker/finance_bot
streamlit run dashboard.py
```

The dashboard reads `finance_chat_logs.jsonl` and lets you teach answers to questions the bot did not understand.

## Safety notes

- Do not put real bank passwords, API keys, or private financial data into public GitHub files.
- Email alerts are optional and use environment variables:
  - `FINANCE_BOT_SENDER_EMAIL`
  - `FINANCE_BOT_APP_PASSWORD`
  - `FINANCE_BOT_RECEIVER_EMAIL`
- The bot explains the app and gives educational guidance only. It does not provide guaranteed investment results or personalized financial advice.
