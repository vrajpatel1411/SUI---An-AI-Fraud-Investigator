import os
import urllib.parse

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def get_database_url():
    encoded_password = urllib.parse.quote_plus(os.environ['DB_PASSWORD'])
    DB_USERNAME = os.environ['DB_USER']
    DB_HOST = os.environ['DB_HOST']
    DB_PORT = os.environ['DB_PORT']
    DB_NAME = os.environ['DB_NAME']

    DATABASE_URL = f"postgresql://{DB_USERNAME}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    return DATABASE_URL

