TITLE_RECOMMENDATION_PROMPT = """
Bạn đang sinh các phương án tiêu đề chương cho một quy trình viết bài học thuật.

Đầu vào:
- Loại bài: "{report_type}"
- Tiêu đề bài: "{normalized_article_title_en}"
- Số chương hiện tại: {chapter_number}
- Tên chương trong blueprint: "{working_title}"
- Vai trò chương: "{purpose}"
- Chương nên mở đầu bằng: "{start_focus}"
- Chương nên kết bằng: "{end_focus}"

Mục tiêu:
- Trả về từ 2 đến 5 phương án tiêu đề chương nếu có nhiều lựa chọn hợp lý.
- Nếu chỉ có một hướng đặt tiêu đề thật sự phù hợp, có thể trả về đúng 1 phương án.
- Tiêu đề phải bằng tiếng Việt, tự nhiên, rõ nghĩa, không chung chung.
- Mô tả phải giải thích ngắn gọn vì sao tiêu đề đó phù hợp với vai trò chương.

Chỉ trả về JSON:
{{
  "options": [
    {{
      "title": "Tiêu đề chương",
      "description": "Giải thích ngắn vì sao tiêu đề này hợp với vai trò chương."
    }}
  ]
}}
""".strip()


BRIEF_RECOMMENDATION_PROMPT = """
Bạn đang sinh các phương án tóm tắt chương cho một quy trình viết bài học thuật.

Đầu vào:
- Loại bài: "{report_type}"
- Tiêu đề bài: "{normalized_article_title_en}"
- Số chương hiện tại: {chapter_number}
- Tiêu đề chương đã chọn: "{chapter_title}"
- Mô tả tiêu đề: "{chapter_title_description}"
- Vai trò chương trong blueprint: "{purpose}"
- Chương nên mở đầu bằng: "{start_focus}"
- Chương nên kết bằng: "{end_focus}"

Mục tiêu:
- Trả về từ 2 đến 5 phương án tóm tắt chương nếu có nhiều lựa chọn hợp lý.
- Nếu chỉ có một hướng thật sự phù hợp, có thể trả về đúng 1 phương án.
- Nội dung phải bằng tiếng Việt, rõ ràng, có thể dùng ngay để định hướng viết chương.

Chỉ trả về JSON:
{{
  "options": [
    {{
      "title": "Nhãn tóm tắt ngắn",
      "description": "Phần tóm tắt thực tế cho chương này."
    }}
  ]
}}
""".strip()


GUIDE_RECOMMENDATION_PROMPT = """
Bạn đang sinh các phương án hướng dẫn viết cho một chương cụ thể trong quy trình viết bài học thuật.

Đầu vào:
- Loại bài: "{report_type}"
- Tiêu đề bài: "{normalized_article_title_en}"
- Số chương hiện tại: {chapter_number}
- Tiêu đề chương đã chọn: "{chapter_title}"
- Tóm tắt chương đã chọn: "{chapter_brief}"
- Vai trò chương trong blueprint: "{purpose}"
- Chương nên mở đầu bằng: "{start_focus}"
- Chương nên kết bằng: "{end_focus}"

Mục tiêu:
- Trả về từ 2 đến 5 hướng dẫn viết hữu ích nếu có nhiều chiến lược phù hợp.
- Nếu chỉ có một hướng dẫn thật sự hợp, có thể trả về đúng 1 phương án.
- Nội dung phải bằng tiếng Việt, thực tế, có thể áp dụng ngay khi viết.
- Các guide nên bổ trợ cho nhau, không lặp ý.

Chỉ trả về JSON:
{{
  "options": [
    {{
      "id": "guide-1",
      "title": "Nhãn hướng dẫn",
      "body": "Hướng dẫn viết cụ thể cho chương này."
    }}
  ]
}}
""".strip()


SOURCE_QUERY_PLANNING_PROMPT = """
Bạn đang lập truy vấn tìm nguồn học thuật cho Google Scholar qua Serper.

Đầu vào:
- Loại bài: "{report_type}"
- Tiêu đề bài tổng quát: "{article_title}"
- Tiêu đề bài chuẩn hóa tiếng Anh: "{normalized_article_title_en}"
- Số chương hiện tại: {chapter_number}
- Tên chương trong blueprint: "{working_title}"
- Vai trò chương: "{purpose}"
- Chương nên mở đầu bằng: "{start_focus}"
- Chương nên kết bằng: "{end_focus}"
- Tiêu đề chương đã chọn: "{chapter_title}"
- Tóm tắt chương đã chọn: "{chapter_brief}"
- Ghi chú guide đã chọn: "{guide_notes}"

Mục tiêu:
- Sinh từ 3 đến 5 truy vấn tìm kiếm hoàn toàn bằng tiếng Anh.
- Truy vấn phải phù hợp để gửi cho Google Scholar/Serper nhằm tìm bài báo học thuật thật.
- Ưu tiên từ khóa học thuật, rõ chủ đề, có khả năng ra bài báo/open-access/review/journal/conference paper phù hợp.
- Không dùng tiếng Việt.
- Không thêm giải thích ngoài JSON.

Chỉ trả về JSON:
{{
  "queries": [
    "english scholarly query 1",
    "english scholarly query 2"
  ]
}}
""".strip()
