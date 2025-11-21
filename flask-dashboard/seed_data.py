from app import db, Record
from datetime import datetime, timedelta
import random

def run():
    db.create_all()
    # ... same seeding code as app.seed_db ...
