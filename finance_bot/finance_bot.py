import json
import os
import re
import smtplib
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

from flask import Flask, jsonify, request

try:
    from flask_cors import CORS
except ImportError:
    CORS = None

try:
    from twilio.twiml.messaging_response import MessagingResponse
except ImportError:
    MessagingResponse = None

from knowledge_base import init_db, save_unknown_question, find_learned_answer


app = Flask(__name__)
if CORS:
    CORS(app)

init_db()

BASE_DIR = Path(__file__).resolve().parent
LOG_FILE = BASE_DIR / "finance_chat_logs.jsonl"
USER_PREFS_FILE = BASE_DIR / "finance_user_preferences.json"


# Optional email alerts. Leave these blank unless you want unknown questions emailed to you.
SENDER_EMAIL = os.getenv("FINANCE_BOT_SENDER_EMAIL", "")
APP_PASSWORD = os.getenv("FINANCE_BOT_APP_PASSWORD", "")
RECEIVER_EMAIL = os.getenv("FINANCE_BOT_RECEIVER_EMAIL", "")


SUPPORTED_LANGS = {
    "1": "en",
    "english": "en",
    "en": "en",
    "2": "es",
    "spanish": "es",
    "español": "es",
    "espanol": "es",
    "es": "es",
    "3": "fr",
    "french": "fr",
    "français": "fr",
    "francais": "fr",
    "fr": "fr",
    "4": "he",
    "hebrew": "he",
    "עברית": "he",
    "he": "he",
}


def language_prompt():
    return """Please choose your language:

1. English
2. Español
3. Français
4. עברית"""


def language_saved_message(lang):
    if lang == "he":
        return "השפה נשמרה. איך אפשר לעזור עם התקציב או הכסף שלך?"
    if lang == "es":
        return "Idioma guardado. ¿Cómo puedo ayudarte con tu presupuesto o finanzas?"
    if lang == "fr":
        return "Langue enregistrée. Comment puis-je vous aider avec votre budget ou vos finances ?"
    return "Language saved. How can I help with your budget or finances?"


def load_user_preferences():
    if not USER_PREFS_FILE.exists():
        return {}

    try:
        with open(USER_PREFS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def save_user_preferences(data):
    with open(USER_PREFS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def get_user_language(user_id):
    prefs = load_user_preferences()
    return prefs.get(user_id, {}).get("language")


def set_user_language(user_id, lang):
    prefs = load_user_preferences()
    prefs.setdefault(user_id, {})
    prefs[user_id]["language"] = lang
    save_user_preferences(prefs)


def is_language_choice(text):
    return text.strip().lower() in SUPPORTED_LANGS


def get_language_from_choice(text):
    return SUPPORTED_LANGS.get(text.strip().lower())


def wants_to_change_language(text):
    text = text.strip().lower()
    return text in [
        "change language", "language", "switch language",
        "cambiar idioma", "idioma",
        "changer de langue", "langue",
        "שנה שפה", "שפה",
    ]


def normalize_text(text):
    return text.strip().lower()


def normalize_question(text):
    text = text.lower().strip()
    text = re.sub(r"[^\w\s\u0590-\u05FF]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def count_matches(text, keywords):
    return sum(1 for keyword in keywords if keyword in text)


INTENT_KEYWORDS = {
    "greeting": [
        "hi", "hey", "hello", "good morning", "good afternoon",
        "hola", "bonjour", "shalom", "שלום", "היי", "הי"
    ],
    "budget_setup": [
        "budget", "monthly plan", "set up", "start", "begin", "how do i use",
        "income", "extra income", "paycheck", "weekly", "biweekly", "every two weeks",
        "presupuesto", "ingreso", "budget mensuel", "revenu", "תקציב", "הכנסה"
    ],
    "savings_charity": [
        "save", "savings", "saving percentage", "charity", "donate", "tzedakah",
        "goal", "emergency fund", "ahorrar", "donar", "épargne", "charité",
        "חיסכון", "צדקה", "לשמור כסף"
    ],
    "expenses": [
        "expense", "expenses", "rent", "mortgage", "utilities", "grocery", "groceries",
        "gas", "necessary", "bill", "bills", "insurance", "medical", "childcare",
        "gastos", "alquiler", "servicios", "essentiel", "loyer", "חשבונות", "שכירות"
    ],
    "purchases_gifts": [
        "purchase", "purchases", "shopping", "clothes", "shoes", "restaurant",
        "restaurants", "gift", "gifts", "spending money", "one time",
        "compras", "regalos", "restaurant", "cadeaux", "קניות", "מתנות", "מסעדה"
    ],
    "recurring": [
        "recurring", "monthly purchase", "every month", "subscription", "one time",
        "repeat", "repeats", "mensual", "recurrente", "abonnement", "חודשי", "קבוע"
    ],
    "vacation": [
        "vacation", "trip", "travel", "flight", "airline", "hotel", "museum",
        "attraction", "taxi", "uber", "lyft", "plane", "bus", "holiday",
        "viaje", "vacaciones", "hotel", "vol", "voyage", "חופשה", "נסיעה", "מלון"
    ],
    "investments": [
        "investment", "invest", "index fund", "index funds", "compound interest",
        "return", "7.5", "stock", "stocks", "etf", "voo", "vti", "spy", "qqq",
        "inversión", "invertir", "fonds indiciel", "השקעה", "ריבית דריבית"
    ],
    "credit_cards": [
        "credit card", "card", "cash back", "points", "miles", "rewards",
        "costco card", "target card", "southwest", "hotel card", "airline card",
        "annual fee", "tarjeta", "cashback", "carte de crédit", "כרטיס אשראי"
    ],
    "summary": [
        "summary", "history", "previous month", "last month", "total", "year",
        "all months", "old month", "past spending", "resumen", "historial",
        "récapitulatif", "historique", "סיכום", "חודש קודם", "היסטוריה"
    ],
    "privacy": [
        "private", "privacy", "safe", "secure", "password", "where is my data",
        "localstorage", "local storage", "github", "public", "privacidad", "sécurité",
        "פרטיות", "אבטחה"
    ],
    "disclaimer": [
        "advice", "financial advice", "guaranteed", "guarantee", "risk", "should i buy",
        "which stock", "recommend stock", "not guaranteed", "consejo financiero",
        "garanti", "סיכון", "ייעוץ פיננסי"
    ],
}


def classify_intent(text):
    text = normalize_text(text)
    scores = {}

    for intent, keywords in INTENT_KEYWORDS.items():
        scores[intent] = count_matches(text, keywords)

    best_intent = max(scores, key=scores.get)
    best_score = scores[best_intent]

    if best_score == 0:
        return "unknown", 0, scores

    return best_intent, best_score, scores


def reply_text(intent, lang):
    replies = {
        "greeting": {
            "en": "Hi, I’m LoviesLedger’s finance helper. Ask me about budgeting, expenses, trips, investments, summaries, or credit cards.",
            "es": "Hola, soy el asistente financiero de LoviesLedger. Pregúntame sobre presupuesto, gastos, viajes, inversiones, resúmenes o tarjetas.",
            "fr": "Bonjour, je suis l’assistant financier de LoviesLedger. Posez-moi une question sur le budget, les dépenses, les voyages, les investissements ou les cartes.",
            "he": "היי, אני העוזר הפיננסי של LoviesLedger. אפשר לשאול על תקציב, הוצאות, חופשות, השקעות, סיכומים או כרטיסי אשראי.",
        },
        "budget_setup": {
            "en": "Start on the Monthly page. Enter your income amount, choose whether it is monthly, weekly, or every 2 weeks, then add extra income if you have any. The app converts income into a monthly estimate and updates the money-left number automatically.",
            "es": "Empieza en la página Monthly. Escribe tu ingreso, elige si es mensual, semanal o cada dos semanas, y agrega ingreso extra si tienes. La app lo convierte a un estimado mensual.",
            "fr": "Commencez sur la page Monthly. Entrez votre revenu, choisissez mensuel, hebdomadaire ou toutes les deux semaines, puis ajoutez un revenu extra si besoin.",
            "he": "מתחילים בעמוד Monthly. מכניסים הכנסה, בוחרים אם היא חודשית, שבועית או כל שבועיים, ואז מוסיפים הכנסה נוספת אם יש.",
        },
        "savings_charity": {
            "en": "Savings and charity are percentage goals based on monthly income plus extra income. For example, if income is $4,000 and savings is 20%, the app shows $800 to save before calculating spending money left.",
            "es": "Ahorro y caridad son porcentajes del ingreso mensual más ingreso extra. La app calcula esas cantidades antes de mostrar el dinero disponible.",
            "fr": "L’épargne et la charité sont des pourcentages du revenu mensuel plus revenu extra. L’app les calcule avant l’argent restant.",
            "he": "חיסכון וצדקה הם אחוזים מההכנסה החודשית ועוד הכנסה נוספת. האפליקציה מחשבת אותם לפני הכסף שנשאר לבזבוז.",
        },
        "expenses": {
            "en": "Use expense categories only for necessary costs: rent, mortgage, utilities, groceries, gas, insurance, medical bills, childcare, and similar essentials. This helps the app understand your real spending patterns.",
            "es": "Usa gastos para costos necesarios como renta, hipoteca, servicios, comida, gasolina, seguro y gastos médicos.",
            "fr": "Utilisez les dépenses pour les coûts nécessaires : loyer, hypothèque, services, courses, essence, assurance et frais médicaux.",
            "he": "הוצאות הן רק דברים נחוצים כמו שכירות, משכנתא, חשבונות, מצרכים, דלק, ביטוח ורפואה.",
        },
        "purchases_gifts": {
            "en": "Purchases are flexible spending like clothes, shoes, electronics, restaurants, or personal items. Gifts are separate so birthdays, holidays, and presents do not get mixed with normal purchases.",
            "es": "Compras son gastos flexibles como ropa, zapatos, electrónicos o restaurantes. Regalos están separados.",
            "fr": "Les achats sont les dépenses flexibles comme vêtements, chaussures, électronique ou restaurants. Les cadeaux sont séparés.",
            "he": "קניות הן הוצאות גמישות כמו בגדים, נעליים, אלקטרוניקה או מסעדות. מתנות נשמרות בנפרד.",
        },
        "recurring": {
            "en": "Mark an item as Monthly if it repeats every month. When you start the next month, monthly items copy forward automatically, while one-time purchases do not.",
            "es": "Marca un gasto como Monthly si se repite cada mes. Al empezar el siguiente mes, se copia automáticamente.",
            "fr": "Cochez Monthly si l’élément se répète chaque mois. Au mois suivant, il sera copié automatiquement.",
            "he": "מסמנים Monthly אם זה חוזר כל חודש. כשפותחים חודש חדש, פריטים חודשיים עוברים אוטומטית.",
        },
        "vacation": {
            "en": "Use the Vacation page for trips. It separates travel, hotels, food, activities, and other trip costs. Each trip is saved, so the Summary page can show past vacations and total trip costs.",
            "es": "Usa Vacation para viajes. Separa transporte, hoteles, comida, actividades y otros costos.",
            "fr": "Utilisez Vacation pour les voyages : transport, hôtels, nourriture, activités et autres coûts.",
            "he": "עמוד Vacation מיועד לחופשות: נסיעות, מלונות, אוכל, פעילויות ועלויות נוספות.",
        },
        "investments": {
            "en": "The Investments page is for index funds. Enter what you already have, what you add, how often you add it, and the assumed annual return. The 7.5% default is only a long-term estimate, not a guarantee.",
            "es": "La página Investments es para fondos indexados. El 7.5% es solo un estimado de largo plazo, no una garantía.",
            "fr": "La page Investments est pour les fonds indiciels. Le 7,5 % est seulement une estimation à long terme, pas une garantie.",
            "he": "עמוד Investments מיועד לקרנות מחקות מדד. 7.5% הוא רק אומדן ארוך טווח, לא הבטחה.",
        },
        "credit_cards": {
            "en": "The Credit Cards page looks at categories and merchant names like Costco, Target, Southwest, Hilton, groceries, gas, and restaurants. It suggests cards to research, but you should always check current fees, rewards, interest rates, and terms before applying.",
            "es": "La página Credit Cards revisa categorías y tiendas como Costco, Target, Southwest, Hilton, comida, gasolina y restaurantes.",
            "fr": "La page Credit Cards regarde les catégories et marchands comme Costco, Target, Southwest, Hilton, courses, essence et restaurants.",
            "he": "עמוד Credit Cards מסתכל על קטגוריות ושמות חנויות כמו Costco, Target, Southwest, Hilton, מצרכים, דלק ומסעדות.",
        },
        "summary": {
            "en": "The Summary page adds up saved months. It shows income, extra income, savings, charity, investments, expenses, purchases, gifts, money left, and vacation history.",
            "es": "La página Summary suma los meses guardados y muestra ingresos, ahorros, caridad, inversiones, gastos y viajes.",
            "fr": "La page Summary additionne les mois enregistrés : revenus, épargne, charité, investissements, dépenses et voyages.",
            "he": "עמוד Summary מסכם חודשים שמורים: הכנסה, חיסכון, צדקה, השקעות, הוצאות, קניות, מתנות וחופשות.",
        },
        "privacy": {
            "en": "This project saves app data in the browser with localStorage unless you add a backend. Do not put real passwords, secret API keys, or private banking information in public GitHub files.",
            "es": "El proyecto guarda datos en el navegador con localStorage, a menos que agregues un backend.",
            "fr": "Le projet sauvegarde les données dans le navigateur avec localStorage sauf si vous ajoutez un backend.",
            "he": "הפרויקט שומר נתונים בדפדפן עם localStorage אלא אם מוסיפים שרת backend.",
        },
        "disclaimer": {
            "en": "I can explain how the app works, but I cannot guarantee returns or give personalized financial advice. Investment projections and credit card suggestions are educational estimates only.",
            "es": "Puedo explicar la app, pero no puedo garantizar rendimientos ni dar asesoría financiera personalizada.",
            "fr": "Je peux expliquer l’app, mais je ne peux pas garantir les rendements ni donner des conseils financiers personnalisés.",
            "he": "אני יכול להסביר את האפליקציה, אבל לא להבטיח תשואות או לתת ייעוץ פיננסי אישי.",
        },
    }

    fallback = {
        "en": "I’m not sure yet. I saved this question so you can teach me the answer from the dashboard.",
        "es": "Todavía no estoy seguro. Guardé esta pregunta para que puedas enseñarme la respuesta desde el panel.",
        "fr": "Je ne suis pas encore sûr. J’ai enregistré cette question pour que vous puissiez m’apprendre la réponse.",
        "he": "אני עדיין לא בטוח. שמרתי את השאלה כדי שתוכל ללמד אותי תשובה בלוח הבקרה.",
    }

    return replies.get(intent, fallback).get(lang) or replies.get(intent, fallback)["en"]


def log_interaction(user_id, profile_name, user_message, lang, intent, confidence, status, bot_reply, scores):
    record = {
        "time": datetime.now().isoformat(),
        "user_id": user_id,
        "profile_name": profile_name,
        "user_message": user_message,
        "language": lang,
        "intent": intent,
        "confidence": confidence,
        "status": status,
        "bot_reply": bot_reply,
        "scores": scores,
    }

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def send_email_alert(user_message, bot_reply, status, lang, user_id, profile_name):
    if not SENDER_EMAIL or not APP_PASSWORD or not RECEIVER_EMAIL:
        return

    subject = f"LoviesLedger finance bot: {status}"
    body = f"""Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
Language: {lang}
Status: {status}

User:
{user_id}

Name:
{profile_name}

User message:
{user_message}

Bot reply:
{bot_reply}
"""

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL
    msg["To"] = RECEIVER_EMAIL
    msg.set_content(body)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(SENDER_EMAIL, APP_PASSWORD)
        smtp.send_message(msg)


def handle_message(original_msg, user_id="WEBSITE_USER", profile_name="Website User", lang=None):
    user_message = original_msg.strip()
    incoming_msg = normalize_text(user_message)

    if wants_to_change_language(user_message):
        return language_prompt(), "language_prompt", 1, "BOT ANSWERED", {}

    if is_language_choice(user_message):
        chosen_lang = get_language_from_choice(user_message)
        set_user_language(user_id, chosen_lang)
        return language_saved_message(chosen_lang), "language_choice", 1, "BOT ANSWERED", {}

    saved_lang = lang or get_user_language(user_id)
    if not saved_lang:
        return language_prompt(), "language_prompt", 1, "BOT ANSWERED", {}

    question_key = normalize_question(user_message)
    learned = find_learned_answer(question_key, saved_lang, threshold=0.84)

    if learned:
        reply = learned["answer"]
        intent = "learned_answer"
        confidence = round(learned.get("score", 1.0), 3)
        status = "BOT ANSWERED"
        scores = {}
    else:
        intent, confidence, scores = classify_intent(incoming_msg)
        if confidence < 1:
            intent = "unknown"

        status = "BOT ANSWERED"
        if intent == "unknown":
            status = "NEEDS HUMAN ANSWER"
            save_unknown_question(
                user_message=user_message,
                normalized_message=question_key,
                language=saved_lang,
                user_id=user_id,
                profile_name=profile_name
            )

        reply = reply_text(intent, saved_lang)

    log_interaction(
        user_id=user_id,
        profile_name=profile_name,
        user_message=user_message,
        lang=saved_lang,
        intent=intent,
        confidence=confidence,
        status=status,
        bot_reply=reply,
        scores=scores
    )

    send_email_alert(user_message, reply, status, saved_lang, user_id, profile_name)
    return reply, intent, confidence, status, scores


@app.route("/api/chat", methods=["POST"])
def website_chat():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message", "")).strip()
    user_id = str(data.get("user_id", "WEBSITE_USER"))
    profile_name = str(data.get("profile_name", "Website User"))
    lang = data.get("language")

    if not message:
        return jsonify({
            "reply": "Please send a message.",
            "intent": "empty",
            "status": "BOT ANSWERED"
        }), 400

    reply, intent, confidence, status, scores = handle_message(
        original_msg=message,
        user_id=user_id,
        profile_name=profile_name,
        lang=lang
    )

    return jsonify({
        "reply": reply,
        "intent": intent,
        "confidence": confidence,
        "status": status,
        "scores": scores
    })


@app.route("/whatsapp", methods=["POST"])
def whatsapp():
    if MessagingResponse is None:
        return "Twilio is not installed. Install twilio to use WhatsApp mode.", 500

    incoming_msg = request.values.get("Body", "")
    from_number = request.values.get("From", "UNKNOWN")
    profile_name = request.values.get("ProfileName", "Unknown User")

    reply, *_ = handle_message(
        original_msg=incoming_msg,
        user_id=from_number,
        profile_name=profile_name
    )

    response = MessagingResponse()
    response.message(reply)
    return str(response), 200, {"Content-Type": "application/xml"}


if __name__ == "__main__":
    print("LoviesLedger finance bot local test")
    print("Type a message. Type 'quit' to stop.\n")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "quit":
            break

        bot_reply, *_ = handle_message(
            original_msg=user_input,
            user_id="LOCAL_TEST",
            profile_name="Test User",
            lang="en"
        )
        print("Bot:", bot_reply)
        print()
