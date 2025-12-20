from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from dateutil import parser
import random
import xmlrpc.client
import requests
import os
from flask import send_from_directory
import psycopg2
from psycopg2 import pool






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


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico', mimetype='image/vnd.microsoft.icon'
    )



def get_odoo_dashboard_data_via_http(params):
    url = "http://192.168.3.9:8069/dashboard/data"  # your route
    headers = {
        'Content-Type': 'application/json',
    }

    # If you have Odoo session (user login), you may need cookies
    # For demo, assuming public auth or user sess
    # ion already exists

    if params and len(params) == 2:
            start_date = params[0].split("T")[0]   # '2025-11-17'
            end_date = params[1].split("T")[0]
    
    else:
            start_date=datetime.today()
            end_date=datetime.today()

    print("preparing data for execute")
    payload = {
        "start_date": start_date,
        "end_date": end_date
    }

    try:
        response = requests.post(url, data=payload)
        response.raise_for_status()
        data = response.json()
        print("Odoo dashboard data:", data)
        return data
    except Exception as e:
        print("Error fetching dashboard data:", e)
        return None

# # Example call:
# get_odoo_dashboard_data_via_http("2025-12-01", "2025-12-04")

# for try some thing
# -----------------------------
# 1. Setup Connection Pool (reuse connections)
# -----------------------------
pg_pool = pool.SimpleConnectionPool(
    1, 20,  # min 1, max 20 connections
    dbname="LEIH",
    user="dashboard",
    password="dashboard",
    host="192.168.2.15",
    port=5432
)

def get_conn():
    return pg_pool.getconn()

def release_conn(conn):
    pg_pool.putconn(conn)




# -----------------------------
# 2. Optimized Dashboard Query
# -----------------------------
def get_dashboard_data_db(params):
    conn = get_conn()
    cur = conn.cursor()

    try:
        # -----------------------------
        # Prepare date ranges
        # -----------------------------
        if params and len(params) == 2:
            start_date = params[0].split("T")[0] + " 00:00:00"
            end_date = params[1].split("T")[0] + " 23:59:59"
        else:
            today = datetime.today().strftime("%Y-%m-%d")
            start_date = today + " 00:00:00"
            end_date = today + " 23:59:59"

        # -----------------------------
        # 3. Merge OPD/Dental/Physio queries
        # -----------------------------
        cur.execute("""
        SELECT
            COUNT(ot.id) FILTER (WHERE ot.state='confirmed') AS opd_count,
            SUM(otl.total_amount) FILTER (WHERE ot.state='confirmed') AS opd_amount,

            COUNT(ot.id) FILTER (WHERE ot.state='confirmed' AND otl.department ILIKE 'dental') AS dental_count,
            SUM(otl.total_amount) FILTER (WHERE ot.state='confirmed' AND otl.department ILIKE 'dental') AS dental_amount,

            COUNT(ot.id) FILTER (WHERE ot.state='confirmed' AND otl.department ILIKE '%%physiotherapy%%') AS physio_count,
            SUM(otl.total_amount) FILTER (WHERE ot.state='confirmed' AND otl.department ILIKE '%%physiotherapy%%') AS physio_amount
        FROM opd_ticket ot
        JOIN opd_ticket_line otl ON otl.opd_ticket_id = ot.id
        WHERE ot.create_date BETWEEN %s AND %s
        """, (start_date, end_date))

        opd_count, opd_amount, dental_count, dental_amount, physio_count, physio_amount = cur.fetchone()

        result = {
            'opd_income': {'count': opd_count or 0, 'amount': opd_amount or 0},
            'dental_opd': {'count': dental_count or 0, 'amount': dental_amount or 0},
            'physiotherapy_opd': {'count': physio_count or 0, 'amount': physio_amount or 0},
        }

        # -----------------------------
        # 4. Merge Dental/Physio Bills
        # -----------------------------
        cur.execute("""
        SELECT
        COUNT(*) AS bill_count,
        SUM(br.grand_total) AS bill_total
        FROM bill_register br
        WHERE br.state = 'confirmed'
        AND br.create_date BETWEEN %s AND %s
         AND EXISTS (
          SELECT 1
          FROM bill_register_line brl
          WHERE brl.bill_register_id = br.id
            AND brl.department ILIKE 'dental'
      )
        """, (start_date, end_date))

        d_count, d_total = cur.fetchone()

        result['dental_income'] = {
            'count': d_count or 0,
            'amount': d_total or 0
        }

        cur.execute("""
        SELECT
        COUNT(*) AS bill_count,
        SUM(br.grand_total) AS bill_total
        FROM bill_register br
        WHERE br.state = 'confirmed'
        AND br.create_date BETWEEN %s AND %s
        AND EXISTS (
          SELECT 1
          FROM bill_register_line brl
          WHERE brl.bill_register_id = br.id
            AND brl.department ILIKE 'physiotherapy'
        )
        """, (start_date, end_date))

        p_count, p_total = cur.fetchone()

        result['physiotherapy_bill'] = {
            'count': p_count or 0,
            'amount': p_total or 0
        }


        # -----------------------------
        # 5. Admission & Surgery
        # -----------------------------
        cur.execute("""
        SELECT
        COUNT(*) AS admission_count,
        SUM(grand_total) AS total,
        COUNT(operation_date) AS surgery_count
        FROM leih_admission
        WHERE state='activated'
        AND operation_date BETWEEN %s AND %s
        """, (start_date, end_date))
        adm_count, adm_total, surgery_count = cur.fetchone()

# Admission paid amount (separate & indexed)
        cur.execute("""
        SELECT SUM(amount)
        FROM leih_money_receipt
        WHERE state='confirm'
        AND admission_id IN (
        SELECT id FROM leih_admission
        WHERE state='activated'
        AND date BETWEEN %s AND %s
        )
        """, (start_date, end_date))

        adm_paid = cur.fetchone()[0]

        result['admission'] = {
        'count': adm_count or 0,
        'amount': adm_total or 0,
        'paid': adm_paid or 0,
        }
        result['surgery'] = {
        'count': surgery_count or 0
        }


# -----------------------------
# 2. Optics
# -----------------------------
        cur.execute("""
            SELECT
                COUNT(os.id) AS count,
                SUM(os.total) AS total,
                (
                    SELECT SUM(mr.amount)
                    FROM leih_money_receipt mr
                    WHERE mr.state = 'confirm'
                    AND mr.optics_sale_id IS NOT NULL
                    AND mr.create_date BETWEEN %s AND %s
                ) AS paid
            FROM optics_sale os
            WHERE os.date BETWEEN %s AND %s
        """, (start_date, end_date, start_date, end_date))

        opt_count, opt_total, opt_paid = cur.fetchone()

        result['optics_income'] = {
            'count': opt_count or 0,
            'amount': opt_total or 0,
            'paid': opt_paid or 0,
        }



        # -----------------------------
        # 3. Investigation Income
        # -----------------------------
        cur.execute("""
            SELECT
                COUNT(*) AS count,
                SUM(br.grand_total) AS total,
                SUM(mr.amount) AS paid
            FROM bill_register br
            LEFT JOIN bill_register_line brl ON brl.bill_register_id = br.id
            LEFT JOIN leih_money_receipt mr
                ON mr.bill_id = br.id AND mr.state='confirm'
            WHERE br.create_date BETWEEN %s AND %s
            AND brl.department NOT ILIKE 'dental'
            AND brl.department NOT ILIKE 'physiot'
        """, (start_date, end_date))

        inv_count, inv_total, inv_paid = cur.fetchone()

        result['investigation_income'] = {
            'count': inv_count or 0,
            'amount': inv_total or 0,
            'paid': inv_paid or 0
        }


        # -----------------------------
        # 4. POS Income
        # -----------------------------
        cur.execute("""
            SELECT
                COUNT(*) AS count,
                SUM(pol.price_subtotal) AS subtotal
            FROM pos_order po
            LEFT JOIN pos_order_line pol ON pol.order_id = po.id
            WHERE po.date_order BETWEEN %s AND %s
        """, (start_date, end_date))

        pos_count, pos_subtotal = cur.fetchone()

        result['pos_income'] = {
            'count': pos_count or 0,
            'subtotal': f"{(pos_subtotal or 0):.2f}"
        }


        # -----------------------------
        # 5. Money Receipt (All Cash Collection)
        # -----------------------------
        cur.execute("""
            SELECT COUNT(*), SUM(amount)
            FROM leih_money_receipt
            WHERE create_date BETWEEN %s AND %s
            AND state='confirm'
        """, (start_date, end_date))

        cash_count, cash_total = cur.fetchone()

        result['money_receipt'] = {
            'count': cash_count or 0,
            'amount': cash_total or 0
        }


        # -----------------------------
        # 6. Discount
        # -----------------------------
        cur.execute("""
            SELECT COUNT(*), SUM(total_discount)
            FROM discount
            WHERE date BETWEEN %s AND %s
            AND state='approve'
        """, (start_date, end_date))

        disc_count, disc_total = cur.fetchone()

        result['discount'] = {
            'count': disc_count or 0,
            'total_discount': disc_total or 0
        }


    # for doctor income

        cur.execute("""
            SELECT
            dp.id AS doctor_id,
            dp.name AS doctor_name,
            SUM(total_income),
            SUM(total_count)
            FROM (
            SELECT
                la.ref_doctors AS doctor_id,
                SUM(la.grand_total) AS total_income,
                COUNT(*) AS total_count
            FROM leih_admission la
            WHERE la.state='activated'
            AND la.date BETWEEN %s AND %s
            GROUP BY la.ref_doctors

            UNION ALL

            SELECT
                br.ref_doctors AS doctor_id,
                SUM(br.grand_total) AS total_income,
                COUNT(*) AS total_count
            FROM bill_register br
            JOIN bill_register_line brl ON brl.bill_register_id = br.id
            JOIN examination_entry ee ON ee.id = brl.name
            JOIN diagnosis_department dd ON dd.id = ee.department
            WHERE br.state='confirmed'
            AND br.ref_doctors IS NOT NULL
            AND br.create_date BETWEEN %s AND %s
            AND dd.name ILIKE ANY (ARRAY[
                'Retinal Procedure',
                'minor-ot',
                'retinal surgery',
                'other surgery'
            ])
            GROUP BY br.ref_doctors
        ) AS combined
        JOIN doctors_profile dp ON dp.id = combined.doctor_id
        GROUP BY dp.id, dp.name
        ORDER BY SUM(total_income) DESC
        """, (start_date, end_date, start_date, end_date))

        rows = cur.fetchall()

        result['doctor_total_income'] = [
    {
        'doctor_id': r[0],
        'doctor_name': r[1],
        'income': r[2] or 0,
        'count': r[3] or 0,
    }
    for r in rows
    ]
# end doctor income

#dental income

        dental_pattern = '%dental%'

        cur.execute("""
        SELECT
        COALESCE(dp.id, 0) AS doctor_id,
        COALESCE(dp.name, 'Undefined') AS doctor_name,
        SUM(b.grand_total) AS income,
        COUNT(b.id) AS bill_count
        FROM (
        SELECT DISTINCT
            br.id,
            br.grand_total,
            br.ref_doctors
        FROM bill_register br
        JOIN bill_register_line brl
            ON brl.bill_register_id = br.id
        JOIN examination_entry ee
            ON ee.id = brl.name
        JOIN diagnosis_department dd
            ON dd.id = ee.department
        WHERE br.state = 'confirmed'
          AND br.create_date BETWEEN %s AND %s
          AND dd.name ILIKE %s
         ) b
        LEFT JOIN doctors_profile dp
        ON dp.id = b.ref_doctors
        GROUP BY dp.id, dp.name
        ORDER BY income DESC
        """, (start_date, end_date, dental_pattern))


        rows = cur.fetchall()

        result['dental_doctor_income'] = [
            {
                'doctor_id': r[0],
                'doctor_name': r[1],
                'income': r[2] or 0,
                'count': r[3] or 0,
            }
            for r in rows
        ]

    #for physiotherapist Income

        physio_pattern = '%physioth%'

        cur.execute("""
        SELECT
        COALESCE(dp.id, 0) AS doctor_id,
        COALESCE(dp.name, 'Undefined') AS doctor_name,
        SUM(b.grand_total) AS income,
        COUNT(b.id) AS bill_count
        FROM (
        SELECT DISTINCT
            br.id,
            br.grand_total,
            br.ref_doctors
        FROM bill_register br
        JOIN bill_register_line brl
            ON brl.bill_register_id = br.id
        JOIN examination_entry ee
            ON ee.id = brl.name
        JOIN diagnosis_department dd
            ON dd.id = ee.department
        WHERE br.state = 'confirmed'
          AND br.create_date BETWEEN %s AND %s
          AND dd.name ILIKE %s
            ) b
         LEFT JOIN doctors_profile dp
        ON dp.id = b.ref_doctors
        GROUP BY dp.id, dp.name
        ORDER BY income DESC
        """, (start_date, end_date, physio_pattern))

        rows = cur.fetchall()

        result['physiotherapist_income'] = [
            {
                'doctor_id': r[0],
                'doctor_name': r[1],
                'income': r[2] or 0,
                'count': r[3] or 0,
            }
            for r in rows
        ]


        return result

    except Exception as e:
        print("Error fetching dashboard:", e)
        return {}
    finally:
        cur.close()
        release_conn(conn)




# for general

# pool for general


# # end pool for general

def get_general_dashboard_data_db(params):

    pg_pool = pool.SimpleConnectionPool(
    1, 20,  # min 1, max 20 connections
    dbname="GM",
    user="dashboard",
    password="dashboard",
    host="192.168.2.89",
    port=5432
)

    def get_conn():
        return pg_pool.getconn()

    def release_conn(conn):
        pg_pool.putconn(conn)
        conng = get_conn()
        cur = conn.cursor()
    conn = get_conn()
    cur = conn.cursor()
    result = {}

    try:
        # -----------------------------
        # Prepare date ranges
        # -----------------------------
        if params and len(params) == 2:
            start_date = params[0].split("T")[0] + " 00:00:00"
            end_date = params[1].split("T")[0] + " 23:59:59"
        else:
            today = datetime.today().strftime("%Y-%m-%d")
            start_date = today + " 00:00:00"
            end_date = today + " 23:59:59"


        cur.execute("""
        SELECT
        brl.department,
        COUNT(*) AS line_count,
        SUM(brl.total_amount) AS total_amount,
        SUM(mr.amount) AS paid_amount
        FROM bill_register_line brl
        JOIN bill_register br ON br.id = brl.bill_register_id
        LEFT JOIN legh_money_receipt mr
        ON mr.bill_id = br.id AND mr.state = 'confirm'
        WHERE br.create_date BETWEEN %s AND %s
        GROUP BY brl.department
        """, (start_date, end_date))

        rows = cur.fetchall()

        # Initialize response
        result = {
        'MRI_income': {'count': 0, 'amount': 0, 'paid': 0},
        'ct_scan_income': {'count': 0, 'amount': 0, 'paid': 0},
        'x_ray_income': {'count': 0, 'amount': 0, 'paid': 0},
        'usg_echo_income': {'count': 0, 'amount': 0, 'paid': 0},
        'ecg_income': {'count': 0, 'amount': 0, 'paid': 0},
        'pathology_income': {'count': 0, 'amount': 0, 'paid': 0},
        }

# Process SQL rows
        for dept, count, amount, paid in rows:
            d = (dept or "").lower()

        # Classification
            if "mri" in d:
                key = "MRI_income"
            elif "ct" in d and "scan" in d:
                key = "ct_scan_income"
            elif "radiol" in d or "x-ray" in d or "xray" in d:
                key = "x_ray_income"
            elif "usg" in d or "echo" in d or "echocardiogram" in d:
                key = "usg_echo_income"
            elif d.strip() == "ecg":
                key = "ecg_income"
            else:
                key = "pathology_income"

        # Add values (sum, not replace)
            result[key]['count'] += count or 0
            result[key]['amount'] += amount or 0
            result[key]['paid'] += paid or 0



        # indoor patient
            cur.execute("""
            SELECT
            (SELECT COUNT(*)
            FROM hospital_admission
            WHERE state = 'activated'
            AND (emergency IS NOT TRUE)) AS admission_count,

            (SELECT COALESCE(SUM(amount), 0)
            FROM legh_money_receipt
            WHERE state = 'confirm'
            AND general_admission_id IS NOT NULL
            AND general_admission_id IN (
                SELECT id FROM hospital_admission
                WHERE state = 'activated'
                  AND (emergency IS NOT TRUE)
            )
            AND create_date BETWEEN %s AND %s
            ) AS total_paid
            """, (start_date, end_date))

            indoor_count, total_paid = cur.fetchone()

            result['indoor_patient'] = {
                'count': indoor_count or 0,
                'paid': total_paid or 0
            }




                # -----------------------------
        # 5. Money Receipt (All Cash Collection)
        # -----------------------------
        cur.execute("""
            SELECT COUNT(*), SUM(amount)
            FROM legh_money_receipt
            WHERE create_date BETWEEN %s AND %s
            AND state='confirm'
        """, (start_date, end_date))

        cash_count, cash_total = cur.fetchone()

        result['legh_money_receipt'] = {
            'count': cash_count or 0,
            'amount': cash_total or 0
        }

        # -----------------------------
        # 4. POS Income
        # -----------------------------
        cur.execute("""
            SELECT
                COUNT(*) AS count,
                SUM(pol.price_subtotal) AS subtotal
            FROM pos_order po
            LEFT JOIN pos_order_line pol ON pol.order_id = po.id
            WHERE po.date_order BETWEEN %s AND %s
        """, (start_date, end_date))

        pos_count, pos_subtotal = cur.fetchone()

        result['general_pos_income'] = {
            'count': pos_count or 0,
            'subtotal': pos_subtotal or 0
        }

        return result
        

    except Exception as e:
        print("Error fetching dashboard:", e)
        return {}
    finally:
        cur.close()
        release_conn(conn)
# end of general

# fetching BLF data


def get_blf_dashboard_data_db(params):

    pg_pool = pool.SimpleConnectionPool(
    1, 20,  # min 1, max 20 connections
    dbname="blf_db",
    user="dashboard",
    password="dashboard",
    host="192.168.2.49",
    port=5432
)

    def get_conn():
        return pg_pool.getconn()

    def release_conn(conn):
        pg_pool.putconn(conn)
        conng = get_conn()
        cur = conn.cursor()
    conn = get_conn()
    cur = conn.cursor()
    result = {}

    try:
        # -----------------------------
        # Prepare date ranges
        # -----------------------------
        if params and len(params) == 2:
            start_date = params[0].split("T")[0] + " 00:00:00"
            end_date = params[1].split("T")[0] + " 23:59:59"
        else:
            today = datetime.today().strftime("%Y-%m-%d")
            start_date = today + " 00:00:00"
            end_date = today + " 23:59:59"

        # -----------------------------
        # 4. POS Income
        # -----------------------------
        cur.execute("""
        SELECT
            COUNT(mr.id) AS count,
            SUM(mr.amount) AS total
        FROM money_receipt mr
        WHERE mr.create_date BETWEEN %s AND %s
        AND mr.state = 'done'
    """, (start_date, end_date))

        mr_count, mr_total = cur.fetchone()

        result['blf_money_receipt'] = {
        'count': mr_count or 0,
        'amount': mr_total or 0
    }

        return result
        

    except Exception as e:
        print("Error fetching dashboard:", e)
        return {}
    finally:
        cur.close()
        release_conn(conn)

# end fetching blf data  


def get_odoo_dashboard_data(params):
    url = "http://192.168.2.15:8069"
    dbname = "LEIH"
    username = "api"
    password = "api@mk"

    try:
        print("Connecting to Odoo...")

        # Step 1 — get uid
        common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
        uid = common.authenticate(dbname, username, password, {})
        print("UID:", uid)

        if not uid:
            print("Authentication failed. Wrong username or password.")
            return None

        print("Authentication successful.")

        # Step 2 — call the method
        models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

        if params and len(params) == 2:
            start_date = params[0].split("T")[0]   # '2025-11-17'
            end_date = params[1].split("T")[0]

            print("preparing data for execute")

            result = models.execute_kw(
                dbname, uid, password,
                "dashboard.dashboard",
                "custom_dashboard",
                [],
                {
                "start_date": start_date,
                "end_date": end_date
                }
            )
            print("takes parameter")
        else:
            result = models.execute_kw(
                dbname,
                uid,
                password,
                "dashboard.dashboard",
                "custom_dashboard",
                []
            )

        print("Odoo returned:", result)

        return result

    except Exception as e:
        print("Error:", str(e))
        return None



@app.route('/api/data', methods=['GET'])
def api_data():
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    # If both params exist → pass them, otherwise → []
    if from_date and to_date:
        params = [from_date, to_date]
    else:
        params = []

    final_data = {}
    # odoo_data = get_odoo_dashboard_data(params)
    # odoo_data = get_odoo_dashboard_data_via_http(params)
    eye_data = get_dashboard_data_db(params)
    general_data = get_general_dashboard_data_db(params)
    blf_data=get_blf_dashboard_data_db(params)
    final_data.update(eye_data)
    final_data.update(general_data)
    final_data.update(blf_data)
    
    # import pdb;pdb.set_trace()
    # odoo_data = get_odoo_dashboard_data()

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

    return jsonify({"stats":final_data})

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
