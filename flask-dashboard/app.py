from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from dateutil import parser
import random
import xmlrpc.client


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dashboard.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Models ---
class Record(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(80), nullable=False)   # e.g., "A", "B", "C"
    value = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    label = db.Column(db.String(200), default="")         # text for search

    def to_dict(self):
        return {
            "id": self.id,
            "category": self.category,
            "value": self.value,
            "created_at": self.created_at.isoformat(),
            "label": self.label
        }

# --- Routes ---
@app.route('/')
def index():
    return render_template('dashboard.html')


def get_odoo_dashboard_data():
    url = "http://192.168.2.15:8069"
    db = "LEIH"
    uid = 74
    password = "api@mk"
    model = "dashboard.dashboard"
    method = "custom_dashboard"

    try:
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

        # Call the custom_dashboard method
        result = models.execute_kw(
            db, uid, password,
            model, method,
            []  # No arguments
        )
        return result
    except Exception as e:
        print("Error connecting to Odoo:", e)
        return None


@app.route('/api/data', methods=['GET'])
def api_data():
    
    odoo_data = get_odoo_dashboard_data()
    # odoo_data = {'dental_income': {'amount': 22000, 'count': 6},
    #         'dental_opd': {'amount': 1200, 'count': 4},
    #         'opd_income': {'amount': 93400, 'count': 301},
    #         'physiotherapy_bill': {'amount': 22000, 'count': 6},
    #         'physiotherpay_opd': {'amount': 1200, 'count': 4}}

  

    # if not odoo_data:
    #     return jsonify({"error": "Failed to fetch data from Odoo"}), 500

    # Sample output (based on your example):
    # {
    #   'opd': 100,
    #   'bill': 500,
    #   'other': 450,
    #   'sting': 'strings value'
    # }

    # Transform it into chart-friendly JSON
    # categories = [
    #     {"category": "OPD", "total": odoo_data.get("opd", 0)},
    #     {"category": "Bill", "total": odoo_data.get("bill", 0)},
    #     {"category": "Other", "total": odoo_data.get("other", 0)}
    # ]

    # response = {
    #     "records": [
    #         {"label": "OPD", "value": odoo_data.get("opd", 0)},
    #         {"label": "Bill", "value": odoo_data.get("bill", 0)},
    #         {"label": "Other", "value": odoo_data.get("other", 0)},
    #         {"label": "String", "value": odoo_data.get("sting", "")}
    #     ],
    #     "categories": categories,
    #     "timeseries": [],
    #     "top_labels": []
    # }

    return jsonify({"stats":odoo_data})

# --- Utility: create DB + seed (if empty) ---
def seed_db():
    db.create_all()
    if Record.query.count() == 0:
        now = datetime.utcnow()
        cats = ['Alpha', 'Beta', 'Gamma', 'Delta']
        sample_texts = [
            "Order #1001", "Signup campaign", "Promo click", "Refund", "Support request",
            "Feature request", "Purchase", "Mobile install"
        ]
        # seed 300 records across last 30 days
        for i in range(300):
            days_ago = random.randint(0, 29)
            created = now - timedelta(days=days_ago, hours=random.randint(0,23), minutes=random.randint(0,59))
            rec = Record(
                category=random.choice(cats),
                value=round(random.uniform(1, 50), 2),
                created_at=created,
                label=random.choice(sample_texts) + f" #{random.randint(1,200)}"
            )
            db.session.add(rec)
        db.session.commit()
        print("Seeded DB with sample records.")

if __name__ == '__main__':
    with app.app_context():
        seed_db()
    app.run(debug=True, host='0.0.0.0', port=5001)
