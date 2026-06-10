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

Các thông tin database mặc định đã có sẵn trong `.env.example`, người cài không cần tự tạo lại:

```text
DATABASE_URL=postgresql+psycopg2://ai_research_user:ai_research_password@localhost:55433/ai_research_db
REDIS_URL=redis://localhost:56380/0
```

Nghĩa là sau khi chạy Docker ở bước 4, backend sẽ kết nối vào database `ai_research_db` bằng tài khoản demo của dự án.

Frontend:

```powershell
Copy-Item frontend\.env.example frontend\.env
```

File `frontend/.env` cần có:

```text
VITE_API_BASE_URL=http://localhost:8010/api
VITE_GOOGLE_CLIENT_ID=demo_client_id
```

Mặc định frontend gọi backend tại:

```text
http://localhost:8010/api
```

Khi demo cài đặt không dùng API key thật, có thể để `VITE_GOOGLE_CLIENT_ID=demo_client_id`. Giao diện vẫn mở được, nhưng không bấm đăng nhập Google. Khi chạy chức năng thật, đổi giá trị này thành Google OAuth Client ID thật.

Nếu mở frontend bị màn hình trắng, kiểm tra `frontend/.env` trước. Thiếu `VITE_GOOGLE_CLIENT_ID` có thể làm React không render được vì app đang dùng Google OAuth Provider.

## 4. Chạy database, Redis và pgAdmin bằng Docker

```powershell
docker compose up -d
```

Các service mặc định:

- PostgreSQL: `localhost:55433`
- Redis: `localhost:56380`
- pgAdmin: `http://localhost:18081`

Tài khoản pgAdmin mặc định:

- Email: `admin@admin.com`
- Password: `rootpassword`

Thông tin kết nối database trong pgAdmin:

- Host name/address: `db`
- Port: `5432`
- Maintenance database: `ai_research_db`
- Username: `ai_research_user`
- Password: `ai_research_password`

Lưu ý: web cần PostgreSQL và Redis để backend chạy đúng. pgAdmin chỉ là giao diện xem database, không phải database. Khi demo cài đặt, bạn có thể chạy `docker compose up -d` để tạo đủ cả 3 service, nhưng không bắt buộc phải mở pgAdmin trên trình duyệt.

## 5. Cài backend

```powershell
cd backend
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

Lệnh `python -m alembic upgrade head` tạo các bảng cần thiết trong database. Nếu chỉ nhập đúng mật khẩu database nhưng chưa chạy migration này thì database có thể vẫn chưa có bảng.

Backend chạy tại:

```text
http://127.0.0.1:8010
```

## 6. Cài frontend

Mở terminal khác:

```powershell
cd ..
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5175
```

Frontend chạy tại:

```text
http://127.0.0.1:5175
```

## 7. Cách chạy nhanh bằng script

Các lệnh trong mục này chạy tại thư mục gốc dự án, cùng cấp với `backend`, `frontend` và `docker-compose.yml`.

Sau khi đã cài dependencies backend/frontend một lần, có thể chạy:

```powershell
.\scripts\dev\start-workspace.ps1
```

Nếu PowerShell báo file script không được ký số, chạy từ thư mục gốc dự án bằng lệnh:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev\start-workspace.ps1
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

- Mở `http://127.0.0.1:5175`.
- Bấm đăng nhập Google.
- Tạo bài nghiên cứu thử.
- Kiểm tra trang lịch sử.
- Nếu có tài khoản admin, mở `/admin/dashboard` để xem usage.
