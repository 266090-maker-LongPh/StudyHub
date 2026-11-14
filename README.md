# Study Hub — Ứng Dụng Ôn Tập DBS & SE1-2026

Ứng dụng web chạy **cục bộ (local-only)** giúp ôn tập hai môn **Database Systems (DBS)** và **Software Engineering 1 (SE1-2026)** bám sát tài liệu gốc, hỗ trợ xem song song **PDF slide + giải thích chi tiết từng slide**, flashcard lặp lại ngắt quãng SM-2, quiz trắc nghiệm và tìm kiếm toàn văn.

## Tính năng chính

- **Giao diện Bài học Chia đôi 50/50 (Split-Screen):**
  - **Khung trái:** Hiển thị trực tiếp toàn bộ file PDF gốc để cuộn liên tục, hỗ trợ chuyển nhanh trang/slide và đổi tài liệu khi chương có nhiều file.
  - **Khung phải:** Trình bày **Tóm tắt mục** (`digest`), **Giải thích chi tiết từng slide** bằng tiếng Việt (`explanation`) và **Nội dung gốc nguyên văn** (text, bảng biểu, code SQL/Java, mô tả sơ đồ). Bấm **`← Xem PDF trang N`** trên bất kỳ thẻ slide nào để đồng bộ khung PDF tới đúng trang đó.
  - Hỗ trợ 3 chế độ hiển thị: **Chia đôi: PDF + Giải thích**, **Chỉ Nội dung gốc**, và **Chỉ Giải thích & Tóm tắt**.
- **Flashcard (SM-2):** Lịch ôn tập tự động theo thuật toán lặp lại ngắt quãng với 4 mức đánh giá (`Quên`, `Khó`, `Nhớ`, `Dễ`), tách riêng tiến độ cho từng môn.
- **Quiz trắc nghiệm:** Luyện đề theo từng chương hoặc trộn nhiều chương, chấm điểm tức thì kèm giải thích và trích dẫn nguồn slide/trang.
- **Tìm kiếm toàn văn (`MiniSearch`):** Tra cứu nhanh theo từ khóa trong nội dung gốc, giải thích từng slide, tóm tắt, flashcard và câu hỏi quiz.
- **Theo dõi tiến độ & Lưu trữ cục bộ:** Thống kê chuỗi ngày học, biểu đồ lịch sử điểm quiz, đồng bộ tự động vào workspace (`storage/progress.json`) và hỗ trợ Export/Import JSON.

---

## Yêu cầu môi trường

- **Node.js** `>= 20` (khuyến nghị Node.js LTS) và **npm**.

## Hướng dẫn cài đặt & chạy

```bash
# 1. Clone repository
git clone <url-repository-của-bạn>
cd <tên-thư-mục-dự-án>

# 2. Cài đặt dependencies
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt và truy cập: **http://localhost:5173**

### Các lệnh khác

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy Vite dev server ở cổng `5173` (kèm middleware `/materials/` và `/api/local-storage`). |
| `npm run ingest` | Quét thư mục `materials/`, kiểm tra hợp lệ nguồn và biên dịch `content/` thành `public/data/*.json`. |
| `npm run build` | Kiểm tra kiểu TypeScript (`tsc --noEmit`) và đóng gói production vào `dist/`. |
| `npm run preview` | Chạy thử bản build production ở cổng `4173`. |

> **Lưu ý khi chạy không có thư mục `materials/`:** Toàn bộ nội dung văn bản, giải thích từng slide, flashcard và quiz đều đã được biên dịch sẵn trong `public/data/`. Nếu clone bản không kèm `materials/`, ứng dụng vẫn chạy và học bình thường ở chế độ **`Chỉ Giải thích & Tóm tắt`** hoặc **`Ẩn khung PDF`**; chỉ khung xem PDF gốc bên trái và lệnh `npm run ingest` cần có thư mục `materials/`.

---

## Cấu trúc thư mục

```text
├── config/
│   └── sources.json          # Cấu hình thư mục nguồn và danh sách file bỏ qua
├── content/
│   ├── dbs/                  # Nội dung biên soạn từng chương môn DBS (JSON)
│   ├── se1/                  # Nội dung biên soạn từng chương môn SE1-2026 (JSON)
│   └── issues.json           # Ghi chú các mục cần lưu ý / đối chiếu nguồn
├── materials/                # Tài liệu PDF/SQL/ảnh gốc (tùy chọn khi chia sẻ repo)
├── public/data/              # Dữ liệu JSON đã hợp nhất cho frontend (dbs.json, se1.json)
├── scripts/ingest/           # Script kiểm định nguồn và sinh dữ liệu public/data/
├── src/                      # Mã nguồn React + TypeScript + Tailwind CSS v4
└── vite.config.ts            # Cấu hình Vite + middleware đọc PDF & đồng bộ tiến độ cục bộ
```

---

## Công nghệ sử dụng

- **Frontend:** React 18, TypeScript, React Router v6, Tailwind CSS v4
- **Tìm kiếm & Tô màu mã:** MiniSearch, Highlight.js (`sql`, `java`)
- **Build tool:** Vite 5
