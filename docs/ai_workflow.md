QUY TRÌNH XỬ LÝ AI (AI AGENT WORKFLOW) - SOS BRIDGE

Đây là tài liệu chi tiết hóa luồng xử lý dữ liệu và logic ra quyết định của SOS-Bridge Agent. Hệ thống vận hành theo chu trình khép kín 5 bước: Listen -> Perceive -> Dispatch -> Verify -> Reward.

BƯỚC 1: LẮNG NGHE (LISTEN)

Mục tiêu: Thu thập tín hiệu cầu cứu từ đa nguồn và chuẩn hóa định dạng đầu vào.

1.1. Các kênh tiếp nhận

Direct Channel (Telegram Mini App):

Người dùng điền Form có sẵn.

Dữ liệu có cấu trúc (Structured Data): GPS chính xác, SĐT đã xác thực.

Forward Channel (Social Listening):

Người dùng chuyển tiếp (Forward) tin nhắn từ Zalo/Facebook vào Bot.

Dữ liệu phi cấu trúc (Unstructured Data): Văn bản tự do, lẫn lộn thông tin, tiếng địa phương.

1.2. Định dạng đầu vào (Raw Input)

// Ví dụ tin nhắn Forward từ người dùng
{
  "source": "telegram_forward",
  "user_id": 123456789,
  "text_content": "Cấp cứu bà con ơi! Nhà ông Bảy ở xóm Bàu, xã Hải Thượng nước lên gần mái rồi. Có 2 ông bà già với đứa cháu nhỏ. Ai có thuyền vô cứu với. Sđt con ông: 0912.345.678",
  "timestamp": 1733214000
}


BƯỚC 2: NHẬN THỨC & XỬ LÝ (PERCEIVE & PROCESS)

Mục tiêu: Biến văn bản thô thành Rescue Ticket (Vé cứu hộ) hợp lệ và loại bỏ tin rác/trùng lặp.

2.1. Phân tích ngôn ngữ (NLP Parsing)

Sử dụng LLM (GPT-4o-mini hoặc OpenMind Model) với System Prompt chuyên biệt cho tiếng Việt vùng miền.

Logic trích xuất:

Location: "xóm Bàu, xã Hải Thượng" -> Gọi API Geocoding để lấy toạ độ (Lat/Long).

Contact: "0912.345.678" -> Chuẩn hóa thành 84912345678.

People: "2 ông bà già", "đứa cháu nhỏ" -> Count: 3.

Urgency: "nước lên gần mái" -> Mức 5 (Rất nguy cấp).

2.2. Thuật toán chống trùng lặp (Deduplication Algorithm)

Trước khi tạo Ticket mới, Agent quét Database hiện tại:

Check SĐT: Nếu SĐT 0912.345.678 đã tồn tại trong ticket trạng thái PENDING hoặc PROCESSING -> Bỏ qua.

Check Vị trí: Nếu có một ticket khác trong bán kính 50m với nội dung tương tự -> Gộp (Merge) thông tin (Ví dụ: Thêm ảnh mới vào ticket cũ).

2.3. Output (Rescue Ticket Object)

{
  "ticket_id": "SOS_VN_001",
  "status": "OPEN",
  "priority": 5, // 1 (Thấp) -> 5 (Cao)
  "location": {
    "lat": 16.7654,
    "lng": 107.1234,
    "address_text": "Xóm Bàu, Xã Hải Thượng, Quảng Trị"
  },
  "victim_info": {
    "phone": "0912345678",
    "people_count": 3,
    "note": "Người già, Trẻ em, Nước ngập mái"
  }
}


BƯỚC 3: ĐIỀU PHỐI (DISPATCH)

Mục tiêu: Tìm đúng người, giao đúng việc (Matching).

3.1. Thuật toán tìm kiếm (Scouting Logic)

Input: Toạ độ của Ticket SOS_VN_001.

Query: Tìm tất cả Rescuer (Đội cứu hộ) đang có trạng thái ONLINE và IDLE (Đang rảnh) trong bán kính 5km.

Ranking (Xếp hạng ưu tiên):

Khoảng cách gần nhất.

Loại phương tiện (Cano ưu tiên cho vùng ngập sâu hơn thuyền nhỏ).

3.2. Thông báo (Notification)

Gửi tin nhắn Telegram đến Đội cứu hộ được chọn:

🚨 CÓ NHIỆM VỤ MỚI!

Khoảng cách: 1.5km

Nạn nhân: 3 người (Ưu tiên cao)

Thù lao hỗ trợ: 20 USDC

[NÚT NHẬN NHIỆM VỤ]

BƯỚC 4: XÁC THỰC (VERIFY - PROOF OF RESCUE)

Mục tiêu: Đảm bảo nhiệm vụ đã hoàn thành thực tế trước khi chi tiền.

4.1. Quy trình báo cáo

Đội cứu hộ gửi ảnh chụp hiện trường vào Bot để báo cáo hoàn thành.

4.2. Computer Vision Check (AI Vision)

Agent chạy mô hình phân tích ảnh:

Human Detection: Có người trong ảnh không? (Ngưỡng tin cậy > 80%).

Scene Classification: Bối cảnh có phải lũ lụt/sông nước không? (Tránh gửi ảnh chụp trong nhà/ảnh cũ).

Metadata Verification: Kiểm tra EXIF data của ảnh (nếu có) xem thời gian và toạ độ có khớp với lúc nhận nhiệm vụ không.

BƯỚC 5: TRẢ THƯỞNG & GHI NHẬN (REWARD & LOGGING)

Mục tiêu: Thực hiện cam kết tài chính tự động (DeFAI).

5.1. Kích hoạt Smart Contract

Nếu Bước 4 trả về kết quả VERIFIED:

Agent gọi hàm releaseFund() trên Smart Contract.

Chuyển 20 USDC từ ví Treasury -> Ví đội cứu hộ.

5.2. Ghi Log và Đóng Ticket

Cập nhật trạng thái Ticket: COMPLETED.

Gửi thông báo cho người báo tin: "Gia đình ông Bảy đã được đội cứu hộ X tiếp cận an toàn."

Lưu Transaction Hash lên Database để minh bạch hoá.