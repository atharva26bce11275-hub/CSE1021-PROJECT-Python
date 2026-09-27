from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from api.database import engine, Base, SessionLocal, get_db
from api.routers import books, members, loans
from api import models, crud, schemas

BASE_DIR = Path(__file__).resolve().parent.parent
API_DIR = Path(__file__).resolve().parent

_db_initialized = False


def seed_initial_data(db: Session):
    sample_books = [
        schemas.BookCreate(
            title="Clean Code: A Handbook of Agile Software Craftsmanship",
            author="Robert C. Martin",
            isbn="978-0132350884",
            genre="Technology",
            total_quantity=5,
            description="Even bad code can function. But if code isn't clean, it can bring a development organization to its knees.",
            cover_url="https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=600&q=80"
        ),
        schemas.BookCreate(
            title="The Pragmatic Programmer: Your Journey to Mastery",
            author="David Thomas, Andrew Hunt",
            isbn="978-0135957059",
            genre="Technology",
            total_quantity=3,
            description="One of the most important books in software engineering, offering practical insights and best practices.",
            cover_url="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
        ),
        schemas.BookCreate(
            title="Designing Data-Intensive Applications",
            author="Martin Kleppmann",
            isbn="978-1449373320",
            genre="Engineering",
            total_quantity=4,
            description="An invaluable guide to the key concepts, algorithms, and trade-offs of modern data systems.",
            cover_url="https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80"
        ),
        schemas.BookCreate(
            title="To Kill a Mockingbird",
            author="Harper Lee",
            isbn="978-0061120084",
            genre="Fiction",
            total_quantity=4,
            description="The unforgettable novel of a childhood in a sleepy Southern town and the crisis of conscience that rocked it.",
            cover_url="https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80"
        ),
        schemas.BookCreate(
            title="Atomic Habits",
            author="James Clear",
            isbn="978-0735211292",
            genre="Self-Help",
            total_quantity=6,
            description="An easy & proven way to build good habits & break bad ones.",
            cover_url="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=600&q=80"
        )
    ]
    created_books = [crud.create_book(db, b) for b in sample_books]

    sample_members = [
        schemas.MemberCreate(
            full_name="Sarah Connor",
            email="sarah@example.com",
            phone="+1 (555) 019-2831",
            membership_code="LIB-2024-001"
        ),
        schemas.MemberCreate(
            full_name="Alex Mercer",
            email="alex@example.com",
            phone="+1 (555) 014-9922",
            membership_code="LIB-2024-002"
        ),
        schemas.MemberCreate(
            full_name="Elena Rostova",
            email="elena@example.com",
            phone="+1 (555) 018-3341",
            membership_code="LIB-2024-003"
        )
    ]
    created_members = [crud.create_member(db, m) for m in sample_members]

    if created_books and created_members:
        try:
            crud.create_loan(
                db,
                schemas.LoanCreate(
                    book_id=created_books[0].id,
                    member_id=created_members[0].id,
                    days=14
                )
            )
        except Exception:
            pass


def ensure_db_initialized():
    global _db_initialized
    if _db_initialized:
        return
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            if db.query(models.Book).count() == 0:
                seed_initial_data(db)
        finally:
            db.close()
        _db_initialized = True
    except Exception as e:
        print("Database initialization notice:", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db_initialized()
    yield


app = FastAPI(
    title="Bibliotheca",
    description="Library Management System",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(members.router)
app.include_router(loans.router)


def get_template_content() -> str:
    candidates = [
        API_DIR / "templates" / "index.html",
        BASE_DIR / "templates" / "index.html",
        Path("/var/task/api/templates/index.html"),
        Path("/var/task/templates/index.html"),
    ]
    for p in candidates:
        if p.exists():
            return p.read_text(encoding="utf-8")
    return ""


@app.get("/static/{file_path:path}")
def serve_static(file_path: str):
    candidates = [
        API_DIR / "static" / file_path,
        BASE_DIR / "static" / file_path,
        Path("/var/task/api/static") / file_path,
        Path("/var/task/static") / file_path,
    ]
    for p in candidates:
        if p.exists():
            media_type = None
            if file_path.endswith(".css"):
                media_type = "text/css"
            elif file_path.endswith(".js"):
                media_type = "application/javascript"
            elif file_path.endswith(".svg"):
                media_type = "image/svg+xml"
            elif file_path.endswith(".png"):
                media_type = "image/png"
            return FileResponse(str(p), media_type=media_type)
    return Response(status_code=404)


@app.get("/", response_class=HTMLResponse)
def read_root():
    ensure_db_initialized()
    content = get_template_content()
    if content:
        return HTMLResponse(content=content)
    return HTMLResponse(content="<h1>Bibliotheca is online</h1>", status_code=200)


handler = app
