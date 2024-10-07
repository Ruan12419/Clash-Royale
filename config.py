import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://<user>:<password>@rideshare.oxp2hvt.mongodb.net/")
DB_NAME = os.getenv("DB_NAME", "ClashRoyale")
API_URL = os.getenv("API_URL", "https://api.clashroyale.com/v1")
API_KEY = os.getenv("API_KEY", "MY_API")
