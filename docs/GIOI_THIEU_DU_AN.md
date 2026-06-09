# Giới thiệu dự án AI Research Summary System

AI Research Summary System là hệ thống hỗ trợ tạo bài nghiên cứu theo quy trình có kiểm soát. Thay vì để AI viết toàn bộ bài trong một lần, hệ thống chia quá trình thành các bước: thiết lập đề tài, chọn blueprint chương, duyệt tiêu đề/tóm tắt/hướng dẫn viết, chọn nguồn học thuật, sinh từng chương và xuất kết quả cuối.

## Mục tiêu

- Giúp người dùng tạo bài nghiên cứu có cấu trúc rõ ràng.
- Cho phép người dùng kiểm soát từng quyết định trước khi AI sinh nội dung.
- Lưu lịch sử bài viết, nguồn tham khảo và nội dung từng chương.
- Theo dõi token, lượt gọi model và chi phí ước tính trong trang admin.

## Chức năng chính

- Đăng nhập Google OAuth.
- Tạo blueprint bài nghiên cứu bằng Gemini.
- Gợi ý tiêu đề, tóm tắt, hướng dẫn viết và nguồn học thuật theo từng chương.
- Sinh nội dung từng chương và ghép thành bài hoàn chỉnh.
- Xem lịch sử bài nghiên cứu.
- Xuất PDF.
- Trang admin theo dõi usage theo ngày, người dùng và từng bài viết.

## Người dùng mục tiêu

- Sinh viên, học viên và người làm nghiên cứu cần tạo bản nháp học thuật.
- Người quản trị muốn theo dõi chi phí và mức sử dụng AI trong hệ thống.
