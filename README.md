# 📚 Bibliotheca - Modern Library Management System

A full-stack, modern Library Management System built with Python, FastAPI, SQLAlchemy, and a glassmorphism SPA web frontend. Designed specifically for Vercel Serverless deployment using cloud PostgreSQL databases (Supabase, Neon, Railway) while supporting zero-config local testing with automatic SQLite fallback.

---

## 📖 Overview of the Project

**Bibliotheca** solves traditional library management challenges by providing an intuitive, web-based digital platform. It automates cataloging, member registration, book checkouts, returns, and inventory tracking. The system enforces strict stock validation rules to prevent over-borrowing, dynamically tracks overdue items, and provides administrators with a real-time analytics dashboard.

---

## ✨ Features

- **📊 Real-Time Analytics Dashboard**: Displays metrics for total book titles, physical copies, available stock, active members, and overdue loans.
- **📚 Book Catalog Management**: Add, edit, delete, search, and filter books by genre or search terms with cover images and description previews.
- **👥 Member Management**: Register members with unique membership codes, manage contact details, and track active loans.
- **🔄 Circulation Workflows**: Check out books with customizable loan periods, stock validation, and single-click return processing.
- **⏳ Automatic Overdue Detection**: Automatically updates loan statuses to overdue when return deadlines pass.
- **☁️ Vercel Serverless & Cloud Database Ready**: Pre-configured with `vercel.json` for serverless deployment on Vercel backed by PostgreSQL.

---

## 🛠️ Technologies & Tools Used

- **Backend Framework**: Python 3.9+, [FastAPI](https://fastapi.tiangolo.com/)
- **Database & ORM**: [SQLAlchemy 2.0](https://www.sqlalchemy.org/), PostgreSQL (`psycopg2-binary`) / SQLite
- **Validation**: [Pydantic v2](https://docs.pydantic.dev/)
- **Frontend UI**: HTML5, Vanilla JavaScript (ES6+ SPA), Tailwind CSS (CDN), FontAwesome 6, Custom Glassmorphism CSS
- **Templating**: Jinja2
- **ASGI Server**: Uvicorn
- **Deployment Platform**: Vercel (`@vercel/python` serverless builder)

---

## ⚙️ Steps to Install & Run the Project

### Prerequisites
- Python 3.9 or higher installed on your machine.
- Git (optional, for cloning/deploying).

### Local Setup Instructions

1. **Navigate to the project directory**:
   ```bash
   cd c:/Projects/LibraryManagement
   ```

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Development Server**:
   ```bash
   python -m uvicorn api.index:app --reload
   ```

5. **Open in Browser**:
   - Access the Web Application at: `http://127.0.0.1:8000`
   - Access Interactive Swagger API Docs at: `http://127.0.0.1:8000/docs`

---

## 🧪 Instructions for Testing

### 1. Interactive Web Interface Testing
1. Launch the local development server using `python -m uvicorn api.index:app --reload`.
2. Open `http://127.0.0.1:8000` in your browser.
3. Test the following core workflows:
   - **Dashboard**: Verify initial stats cards display seeded books and members.
   - **Book Catalog**: Click "+ Add Book" to add a new book title. Test searching by title or filtering by genre.
   - **Member Management**: Click "+ New Member" to register a patron with a unique code.
   - **Borrow Workflow**: Click "Issue Loan", select a book and member, and confirm checkout. Verify available stock decrements by 1.
   - **Return Workflow**: Go to "Loans & Returns" tab and click "Return". Verify available stock increments back up.

### 2. Automated & API Testing
- Navigate to `http://127.0.0.1:8000/docs` to test endpoints interactively via Swagger UI.
- Test endpoint responses for `/api/books`, `/api/members`, `/api/loans`, and `/api/stats`.

---

## 🚀 Deployment to Vercel

1. Push your repository to GitHub.
2. Connect your repository in [Vercel](https://vercel.com).
3. Set the environment variable `DATABASE_URL` in Vercel settings to your cloud PostgreSQL connection string (e.g. from Supabase or Neon).
4. Click **Deploy**. Vercel will automatically build and serve the application using `api/index.py` and `vercel.json`.
