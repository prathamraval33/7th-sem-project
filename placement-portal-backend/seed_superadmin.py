"""Seed script to create the default SuperAdmin user."""
import os
import sys

# Add backend directory to sys path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User, UserType


def seed_superadmin(
    email: str = "superadmin@platform.com",
    password: str = "Password@123",
):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.user_type != UserType.SUPERADMIN:
                existing.user_type = UserType.SUPERADMIN
                existing.college_id = None
                db.commit()
                print(f"Updated existing user {email} to SUPERADMIN role.")
            else:
                print(f"SUPERADMIN user {email} already exists.")
            return

        superadmin_user = User(
            email=email,
            hashed_password=hash_password(password),
            user_type=UserType.SUPERADMIN,
            college_id=None,
            is_email_verified=True,
            is_active=True,
        )

        db.add(superadmin_user)
        db.commit()
        db.refresh(superadmin_user)
        print("Successfully created SUPERADMIN user!")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print(f"User ID: {superadmin_user.id}")

    except Exception as e:
        print(f"Error creating SUPERADMIN: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_superadmin()
