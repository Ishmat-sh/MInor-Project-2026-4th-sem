import fastapi
import fastapi.middleware.cors
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import sqlite3
from datetime import datetime, timedelta
import uvicorn

app = fastapi.FastAPI()

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "jiit_hub.db"

# ========================================
# DATABASE SETUP
# ========================================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'student'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            member_count INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            timing TEXT DEFAULT '10:00 AM',
            venue TEXT DEFAULT 'TBA',
            status TEXT DEFAULT 'upcoming',
            community_id INTEGER,
            FOREIGN KEY (community_id) REFERENCES communities(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            event_id INTEGER,
            qr_code TEXT,
            registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS join_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            community_id INTEGER,
            full_name TEXT,
            enrollment_no TEXT,
            branch TEXT,
            semester INTEGER,
            reason TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (community_id) REFERENCES communities(id)
        )
    ''')

    # Recruitment table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recruitment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_email TEXT NOT NULL,
            student_name TEXT NOT NULL,
            community_id INTEGER NOT NULL,
            status TEXT DEFAULT 'selected',
            announced_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (community_id) REFERENCES communities(id)
        )
    ''')

    # Notifications table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            role TEXT DEFAULT 'student',
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # Add venue/timing to existing events table if upgrading
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN venue TEXT DEFAULT 'TBA'")
    except:
        pass
    try:
        cursor.execute("ALTER TABLE events ADD COLUMN timing TEXT DEFAULT '10:00 AM'")
    except:
        pass

    # Seed users
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        users = [
            ("Admin User", "admin@jiit.ac.in", "admin123", "admin"),
            ("Rahul Sharma", "rahul.sharma@jiit.ac.in", "student123", "student"),
            ("Priya Singh", "priya.singh@jiit.ac.in", "student123", "student"),
        ]
        cursor.executemany(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", users
        )

    # Seed communities
    cursor.execute("SELECT COUNT(*) FROM communities")
    if cursor.fetchone()[0] == 0:
        communities = [
            ("Abhivyakti", "The cultural society of JIIT bringing together students passionate about dance, drama, and cultural events.", "Cultural", 156),
            ("Fortissimo", "The official music society celebrating all forms of musical expression from classical to contemporary.", "Music", 89),
            ("UCR", "University Code Repository - The technical society for coding enthusiasts and developers.", "Technical", 234),
            ("CICR", "Centre for Innovation and Research - Fostering research and innovation among students.", "Research", 67),
            ("Aakriti", "The arts and design society nurturing creativity through visual arts, photography, and design.", "Arts", 112),
        ]
        cursor.executemany(
            "INSERT INTO communities (name, description, category, member_count) VALUES (?, ?, ?, ?)", communities
        )

    # Seed events
    cursor.execute("SELECT COUNT(*) FROM events")
    if cursor.fetchone()[0] == 0:
        events = [
            ("Rhythm Night 2025", "2025-04-15", "7:00 PM", "Auditorium Block A", "upcoming", 2),
            ("Code-a-thon Spring", "2025-04-20", "9:00 AM", "Lab Complex 3", "upcoming", 3),
            ("Cultural Fest Auditions", "2025-04-10", "2:00 PM", "Open Air Theatre", "ongoing", 1),
            ("Research Symposium", "2025-03-28", "10:00 AM", "Seminar Hall B", "past", 4),
            ("Art Exhibition", "2025-04-25", "11:00 AM", "Gallery Wing", "upcoming", 5),
            ("Hackathon 2025", "2025-05-01", "8:00 AM", "Innovation Lab", "upcoming", 3),
        ]
        cursor.executemany(
            "INSERT INTO events (title, date, timing, venue, status, community_id) VALUES (?, ?, ?, ?, ?, ?)", events
        )

    conn.commit()
    conn.close()

init_db()

# ========================================
# PYDANTIC MODELS
# ========================================

class LoginRequest(BaseModel):
    email: str
    password: str

class EventRequest(BaseModel):
    title: str
    date: str
    timing: str = "10:00 AM"
    venue: str = "TBA"
    community_id: int
    status: str = "upcoming"

class DeleteEventRequest(BaseModel):
    id: int

class JoinRequest(BaseModel):
    community_id: int
    full_name: str
    enrollment_no: str
    branch: str
    semester: int
    reason: str

class RecruitmentRequest(BaseModel):
    student_email: str
    student_name: str
    community_id: int
    status: str = "selected"
    expires_days: int = 7

class NotificationRequest(BaseModel):
    user_id: Optional[int] = None
    role: str = "student"
    title: str
    message: str
    type: str = "info"
    expires_days: int = 7

class MarkReadRequest(BaseModel):
    notification_id: int

class MarkAllReadRequest(BaseModel):
    user_id: int

# ========================================
# SERVE FRONTEND FILES
# ========================================

@app.get("/")
async def serve_frontend():
    return FileResponse("../frontend/index.html")

@app.get("/main.js")
async def serve_js():
    return FileResponse("../frontend/main.js")

@app.get("/styles.css")
async def serve_css():
    return FileResponse("../frontend/styles.css")

# ========================================
# AUTH
# ========================================

@app.get("/health")
async def health():
    return {"status": "ok", "message": "JIIT Community Hub is running"}

@app.post("/login")
async def login(request: LoginRequest):
    if not request.email.endswith("@jiit.ac.in"):
        raise fastapi.HTTPException(status_code=400, detail="Only @jiit.ac.in email addresses are allowed")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, role FROM users WHERE email = ? AND password = ?",
        (request.email, request.password)
    )
    user = cursor.fetchone()
    conn.close()

    if user:
        return {
            "success": True,
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    else:
        raise fastapi.HTTPException(status_code=401, detail="Invalid email or password")

# ========================================
# COMMUNITIES
# ========================================

@app.get("/communities")
async def get_communities():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM communities ORDER BY name")
    communities = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return communities

# ========================================
# EVENTS
# ========================================

@app.get("/events")
async def get_events():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.id, e.title, e.date, e.timing, e.venue, e.status,
               e.community_id, c.name as community_name
        FROM events e
        LEFT JOIN communities c ON e.community_id = c.id
        ORDER BY e.date DESC
    """)
    events = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return events

@app.post("/add-event")
async def add_event(request: EventRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO events (title, date, timing, venue, status, community_id)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (request.title, request.date, request.timing, request.venue, request.status, request.community_id))
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return {"success": True, "message": "Event added successfully", "id": event_id}

@app.post("/delete-event")
async def delete_event(request: DeleteEventRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM events WHERE id = ?", (request.id,))
    if not cursor.fetchone():
        conn.close()
        raise fastapi.HTTPException(status_code=404, detail="Event not found")
    cursor.execute("DELETE FROM events WHERE id = ?", (request.id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Event deleted successfully"}

# ========================================
# JOIN REQUESTS
# ========================================

@app.post("/join-request")
async def create_join_request(request: JoinRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO join_requests
        (community_id, full_name, enrollment_no, branch, semester, reason, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
    """, (request.community_id, request.full_name, request.enrollment_no,
          request.branch, request.semester, request.reason))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Join request submitted successfully"}

# ========================================
# RECRUITMENT
# ========================================

@app.get("/recruitment")
async def get_recruitment(email: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    if email:
        cursor.execute("""
            SELECT r.*, c.name as community_name
            FROM recruitment r
            LEFT JOIN communities c ON r.community_id = c.id
            WHERE r.student_email = ? AND r.expires_at > ?
            ORDER BY r.announced_at DESC
        """, (email, now))
    else:
        cursor.execute("""
            SELECT r.*, c.name as community_name
            FROM recruitment r
            LEFT JOIN communities c ON r.community_id = c.id
            WHERE r.expires_at > ?
            ORDER BY r.announced_at DESC
        """, (now,))

    results = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return results

@app.post("/recruitment")
async def add_recruitment(request: RecruitmentRequest):
    conn = get_db()
    cursor = conn.cursor()
    expires_at = (datetime.now() + timedelta(days=request.expires_days)).isoformat()

    cursor.execute("""
        INSERT INTO recruitment (student_email, student_name, community_id, status, expires_at)
        VALUES (?, ?, ?, ?, ?)
    """, (request.student_email, request.student_name, request.community_id,
          request.status, expires_at))
    conn.commit()

    # Auto-create notification for the student
    cursor.execute("SELECT id FROM users WHERE email = ?", (request.student_email,))
    user = cursor.fetchone()
    cursor.execute("SELECT name FROM communities WHERE id = ?", (request.community_id,))
    community = cursor.fetchone()

    if user and community:
        community_name = community["name"]
        status_text = "selected" if request.status == "selected" else "not selected"
        notif_title = f"Recruitment Result — {community_name}"
        notif_message = (
            f"You have been {status_text} for {community_name}. "
            + ("Welcome to the team!" if request.status == "selected" else "Better luck next time!")
        )
        notif_type = "success" if request.status == "selected" else "error"

        cursor.execute("""
            INSERT INTO notifications (user_id, role, title, message, type, expires_at)
            VALUES (?, 'student', ?, ?, ?, ?)
        """, (user["id"], notif_title, notif_message, notif_type, expires_at))

        # Notify all admins too
        cursor.execute("SELECT id FROM users WHERE role = 'admin'")
        admins = cursor.fetchall()
        for admin in admins:
            cursor.execute("""
                INSERT INTO notifications (user_id, role, title, message, type, expires_at)
                VALUES (?, 'admin', ?, ?, 'info', ?)
            """, (
                admin["id"],
                f"Recruitment Update — {community_name}",
                f"{request.student_name} has been marked as {status_text} for {community_name}.",
                expires_at
            ))

    conn.commit()
    conn.close()
    return {"success": True, "message": "Recruitment result added and notifications sent"}

@app.delete("/recruitment/{recruitment_id}")
async def delete_recruitment(recruitment_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM recruitment WHERE id = ?", (recruitment_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Recruitment result deleted"}

# ========================================
# NOTIFICATIONS
# ========================================

@app.get("/notifications")
async def get_notifications(user_id: int):
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
        SELECT * FROM notifications
        WHERE user_id = ? AND expires_at > ?
        ORDER BY created_at DESC
    """, (user_id, now))
    notifications = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return notifications

@app.post("/notifications")
async def create_notification(request: NotificationRequest):
    conn = get_db()
    cursor = conn.cursor()
    expires_at = (datetime.now() + timedelta(days=request.expires_days)).isoformat()
    cursor.execute("""
        INSERT INTO notifications (user_id, role, title, message, type, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (request.user_id, request.role, request.title,
          request.message, request.type, expires_at))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Notification created"}

@app.post("/notifications/mark-read")
async def mark_notification_read(request: MarkReadRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (request.notification_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.post("/notifications/mark-all-read")
async def mark_all_read(request: MarkAllReadRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ?", (request.user_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# ========================================
# TODO: Future Enhancements
# ========================================
# TODO: QR code generation using python-qrcode
# TODO: OTP-based login via JIIT email
# TODO: Hash passwords using bcrypt
# TODO: Real-time notifications using WebSockets

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)