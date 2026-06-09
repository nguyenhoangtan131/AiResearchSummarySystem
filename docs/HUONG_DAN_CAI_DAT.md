# Hướng dẫn cài đặt và chạy dự án

Tài liệu này mô tả cách cài dự án từ source code sau khi clone hoặc giải nén file nộp.

## 1. Yêu cầu môi trường

- Windows 10/11.
- Python 3.11 trở lên.
- Node.js 20 trở lên.
- Docker Desktop.
- Git.

## 2. Chuẩn bị source code

Không nộp hoặc copy các thư mục môi trường sau:

- `backend/env/`
- `frontend/node_modules/`
- `frontend/dist/`
- `.logs/`
- `__pycache__/`

Sau khi nhận source, mở terminal tại thư mục gốc dự án.

## 3. Tạo file cấu hình môi trường

Backend:

```powershell
Copy-Item backend\.env.example backend\.env
```

Mở `backend/.env` và điền các key thật:

- `GOOGLE_API_KEY`: Gemini API key.
- `SERPER_API_KEY`: Serper API key để tìm nguồn học thuật.
- `GOOGLE_CLIENT_ID`: OAuth client ID.
- `SECRET_KEY`: chuỗi bí mật bất kỳ cho phiên đăng nhập.

Frontend:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

Mặc định frontend gọi backend tại:

```text
http://localhost:8000/api
```

## 4. Chạy database và Redis bằng Docker

```powershell
docker compose up -d
```

Các service mặc định:

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6380`
- pgAdmin: `http://localhost:8081`

Tài khoản pgAdmin mặc định:

- Email: `admin@admin.com`
- Password: `rootpassword`

## 5. Cài backend

```powershell
cd backend
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend chạy tại:

```text
http://127.0.0.1:8000
```

## 6. Cài frontend

Mở terminal khác:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Frontend chạy tại:

```text
http://127.0.0.1:5173
```

## 7. Cách chạy nhanh bằng script

Sau khi đã cài dependencies backend/frontend một lần, có thể chạy:

```powershell
.\scripts\dev\start-workspace.ps1
```

Kiểm tra trạng thái:

```powershell
.\scripts\dev\status-workspace.ps1
```

Dừng backend/frontend dev server:

```powershell
.\scripts\dev\stop-workspace.ps1
```

## 8. Kiểm tra sau khi chạy

- Mở `http://127.0.0.1:5173`.
- Bấm đăng nhập Google.
- Tạo bài nghiên cứu thử.
- Kiểm tra trang lịch sử.
- Nếu có tài khoản admin, mở `/admin/dashboard` để xem usage.

## 9. Lỗi thường gặp

Nếu frontend không gọi được backend, kiểm tra `frontend/.env`:

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

Nếu backend không kết nối được database, kiểm tra `backend/.env`:

```text
DATABASE_URL=postgresql+psycopg2://postgres:tantantan%40123@localhost:5433/ai_research_db
```

Nếu Gemini báo quota hoặc billing, kiểm tra Google AI Studio và Google Cloud Billing của project chứa API key.
