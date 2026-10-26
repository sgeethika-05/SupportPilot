"""
Seed demo data for SupportPilot.
Creates demo users, tickets. All records are clearly labeled as DEMO DATA.

Usage: python scripts/seed_demo.py
"""
import sys, os, uuid
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.db.session import SessionLocal
from app.models.user import User
from app.models.ticket import Ticket
from app.core.security import get_password_hash

DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    {"email": "admin@supportpilot.demo", "name": "Admin Demo", "role": "admin"},
    {"email": "agent@supportpilot.demo", "name": "Agent Demo", "role": "agent"},
]

DEMO_TICKETS = [
    {
        "title": "[DEMO] Cannot login to my account",
        "description": "[DEMO DATA] Customer reports being unable to login since yesterday. Gets error 'Invalid credentials' even after password reset.",
        "status": "open",
        "urgency": "high",
        "category": "account",
    },
    {
        "title": "[DEMO] Billing charge appears twice",
        "description": "[DEMO DATA] Customer was charged twice for their monthly subscription. Requesting immediate refund for the duplicate charge.",
        "status": "in_progress",
        "urgency": "critical",
        "category": "billing",
    },
    {
        "title": "[DEMO] API integration returns 403",
        "description": "[DEMO DATA] Developer integration failing with 403 Forbidden. API key appears correct in dashboard.",
        "status": "open",
        "urgency": "high",
        "category": "technical",
    },
    {
        "title": "[DEMO] Feature request: dark mode",
        "description": "[DEMO DATA] Multiple customers requesting a dark mode option for the dashboard. Would improve accessibility.",
        "status": "open",
        "urgency": "low",
        "category": "feature_request",
    },
    {
        "title": "[DEMO] App crashes on iOS 18",
        "description": "[DEMO DATA] Mobile app consistently crashes on launch for users running iOS 18. Reproducible on multiple devices.",
        "status": "resolved",
        "urgency": "critical",
        "category": "bug",
    },
]


def seed():
    db = SessionLocal()
    try:
        created_users = []
        for u_data in DEMO_USERS:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if existing:
                print(f"  User already exists: {u_data['email']}")
                created_users.append(existing)
                continue
            user = User(
                id=uuid.uuid4(),
                email=u_data["email"],
                name=u_data["name"],
                hashed_password=get_password_hash(DEMO_PASSWORD),
                role=u_data["role"],
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            created_users.append(user)
            print(f"  Created user: {user.email} ({user.role})")

        admin_user = created_users[0]
        for t_data in DEMO_TICKETS:
            existing = db.query(Ticket).filter(Ticket.title == t_data["title"]).first()
            if existing:
                print(f"  Ticket already exists: {t_data['title'][:40]}")
                continue
            ticket = Ticket(
                id=uuid.uuid4(),
                title=t_data["title"],
                description=t_data["description"],
                status=t_data["status"],
                urgency=t_data["urgency"],
                category=t_data["category"],
                created_by_id=admin_user.id,
            )
            db.add(ticket)
            db.commit()
            print(f"  Created ticket: {ticket.title[:50]}")

        print("\nDemo data seeded successfully!")
        print(f"Login: admin@supportpilot.demo / {DEMO_PASSWORD}")
        print(f"Login: agent@supportpilot.demo / {DEMO_PASSWORD}")
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
