import asyncio
import os
import sys

# Add the backend directory to the sys path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User, UserType
from app.core.security import hash_password

def seed_admin():
    db = SessionLocal()
    try:
        email = "admin@bvmengineering.ac.in"
        password = "Password@123"
        
        # Check if it already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            if existing_user.user_type != UserType.ADMIN:
                existing_user.user_type = UserType.ADMIN
                db.commit()
                print(f"Updated existing user {email} to ADMIN role.")
            else:
                print(f"ADMIN user {email} already exists.")
            return

        # Create new ADMIN user
        admin_user = User(
            email=email,
            hashed_password=hash_password(password),
            user_type=UserType.ADMIN,
            is_email_verified=True,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        print(f"Successfully created ADMIN user!")
        print(f"Email: {email}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"Error creating ADMIN: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
