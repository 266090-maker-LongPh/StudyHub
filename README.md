# Study Hub — Web App Ôn Tập Cá Nhân (DBS & SE1-2026)

Ứng dụng web chạy **hoàn toàn cục bộ (local-only)** giúp ôn tập hai môn **DBS (Database Systems)** và **SE1-2026 (Software Engineering 1)** bám sát 100% tài liệu nguồn của người dùng, có trích dẫn nguồn (`file` + vị trí slide/trang/lab) trên từng bài học, flashcard và câu hỏi trắc nghiệm.

## 1. Cấu trúc thư mục chính

- `materials/DBS/`, `materials/SE1-2026/` — Bản sao tài liệu gốc của từng môn.
- `config/sources.json` — Cấu hình đường dẫn thư mục nguồn, danh sách file tham khảo bỏ qua và file bỏ qua thủ công.
- `content/dbs/`, `content/se1/`, `content/issues.json` — Dữ liệu bài học, flashcard, quiz và các mục "Vấn đề cần xác nhận".
- `scripts/ingest/index.mjs` — Script kiểm tra tài liệu nguồn, sinh `file-report.json` và hợp nhất/kiểm định dữ liệu vào `public/data/`.
- `public/data/` — Dữ liệu JSON tĩnh (`dbs.json`, `se1.json`, `issues.json`, `file-report.json`).
- `storage/progress.json` — File lưu đồng bộ tiến độ học tập ngay trong workspace hiện tại (khi chạy `npm run dev` hoặc `npm run preview`).
- `src/` — Mã nguồn giao diện React + TypeScript + Tailwind CSS và logic ôn tập SM-2.

## 2. Yêu cầu môi trường & Cách chạy

Nếu máy bạn đã cài Node.js LTS trên `PATH`, có thể dùng trực tiếp `npm`. Nếu đang dùng Node đi kèm WebStorm (chưa thêm vào `PATH` hệ thống), chạy PowerShell như sau:

```powershell
$n="C:\Users\phhai\AppData\Roaming\JetBrains\WebStorm2026.2\node\versions\24.22.1"
$env:Path="$n;$env:Path"

# Cài thư viện (nếu chưa có node_modules)
npm install

# Chạy máy chủ phát triển trên localhost
npm run dev
```

Mở trình duyệt tại **http://localhost:5173**.

Các lệnh hữu ích khác:
- `npm run ingest` — Quét lại `materials/`, kiểm định tính hợp lệ nguồn và xuất lại `public/data/*.json`.
- `npm run build` — Kiểm tra TypeScript (`tsc --noEmit`) và build bản production vào `dist/`.
- `npm run preview` — Chạy thử bản build tại `http://localhost:4173`.

## 3. Cập nhật nguồn tài liệu & Chạy lại Ingest

1. Chỉnh đường dẫn hoặc danh sách bỏ qua trong `config/sources.json` (`subjects.dbs.materialsDir`, `subjects.se1.materialsDir`, `referenceSkipped`, `manualSkipped`).
2. Thêm hoặc cập nhật nội dung trong `content/dbs/*.json`, `content/se1/*.json`, `content/issues.json`.
3. Chạy lại `npm run ingest`. Script sẽ tự động:
   - Kiểm tra toàn bộ file nguồn và xuất `public/data/file-report.json`.
   - Kiểm tra trùng ID, đảm bảo mọi flashcard/câu hỏi đều có `source.file` thuộc đúng môn đó và không tham chiếu file bị bỏ qua (như đề Studocu).

## 4. Cơ chế lưu tiến độ (SM-2 & Workspace Storage)

- **Thuật toán lặp lại ngắt quãng SM-2 (`src/lib/sm2.ts`)**: 4 mức tự đánh giá (`Quên` / `Khó` / `Nhớ` / `Dễ`) tự tính `interval`, `repetitions`, `easeFactor` và ngày đến hạn (`dueDate`).
- **Tách biệt hai môn**: Tiến độ của DBS và SE1-2026 lưu tách riêng theo key `studyhub_progress_dbs_v1` và `studyhub_progress_se1_v1` trong `localStorage` của trình duyệt.
- **Đồng bộ trực tiếp vào workspace (`storage/progress.json`)**: Plugin Vite trong `vite.config.ts` cung cấp endpoint cục bộ `/api/local-storage` giúp tự động lưu và khôi phục tiến độ vào file `storage/progress.json` ngay trong thư mục dự án (an toàn khi đổi trình duyệt hoặc xóa cache). Ngoài ra vẫn hỗ trợ **Export / Import JSON** thủ công tại trang Tiến độ.

## 5. Thư viện sử dụng (`package.json`)

- **Runtime dependencies**:
  - `react`, `react-dom` (`^18.3.1`): Xây dựng giao diện component.
  - `react-router-dom` (`^6.26.2`): Điều hướng nhiều trang (Trang chủ, Bài học, Flashcard, Quiz, Tìm kiếm, Tiến độ, Vấn đề & Nguồn).
  - `highlight.js` (`^11.10.0`): Chỉ nạp `highlight.js/lib/core` kèm 2 ngôn ngữ `sql` và `java` để tô màu cú pháp gọn nhẹ.
  - `minisearch` (`^7.1.0`): Chỉ mục tìm kiếm toàn văn nhẹ chạy trực tiếp trên trình duyệt.
- **Dev dependencies**:
  - `vite`, `@vitejs/plugin-react`: Máy chủ phát triển nhanh và bundler production.
  - `typescript`, `@types/react`, `@types/react-dom`: Kiểm tra kiểu tĩnh.
  - `tailwindcss`, `@tailwindcss/vite`: Tailwind CSS v4 (hỗ trợ Dark/Light mode).
- *(Lưu ý: Biểu đồ điểm Quiz được vẽ trực tiếp bằng SVG thuần trong `src/pages/ProgressPage.tsx`, không cài thư viện chart nặng.)*
