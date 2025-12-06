PROJECT NAME: SOS-BRIDGE AGENT
Tagline: Tổng đài AI điều phối cứu nạn phi tập trung & Tài trợ nhiên liệu tự động (DeFAI).
1. TỔNG QUAN (EXECUTIVE SUMMARY)
SOS-Bridge là một Đại lý AI on-chain (On-chain AI Agent) hoạt động 24/7, đóng vai trò là cầu nối thông minh giữa người dân vùng lũ và các đội cứu hộ tự phát.
Không chỉ dừng lại ở việc chuyển tiếp thông tin, SOS-Bridge sử dụng AI để lọc nhiễu, xác minh độ khẩn cấp, và sử dụng Blockchain (DeFAI) để tự động tài trợ chi phí nhiên liệu (xăng/dầu) cho các đội cứu hộ ngay khi họ hoàn thành nhiệm vụ, giải quyết bài toán "hụt hơi" tài chính trong cứu trợ thiên tai.
2. VẤN ĐỀ (THE PROBLEM)
Tại miền Trung Việt Nam, khi lũ lụt xảy ra:
Nhiễu loạn thông tin: Hàng ngàn tin nhắn kêu cứu trên MXH, trùng lặp, tin cũ, không rõ địa chỉ. Đội cứu hộ không biết đi đâu trước.
Thiếu hụt kinh phí vận hành: Các đội cứu hộ dân sự (cano, thuyền) thường tự bỏ tiền túi. Sau vài ngày, họ cạn kiệt tiền nhiên liệu và buộc phải dừng hoạt động dù vẫn muốn cứu người.
Thiếu minh bạch: Các khoản quyên góp truyền thống mất nhiều thời gian để giải ngân và khó chứng minh hiệu quả tức thì.
3. GIẢI PHÁP & CÔNG NGHỆ (SOLUTION & TECH STACK)
3.1. Các thành phần chính
Giao diện (Interface): Telegram Mini App (Tối ưu cho vùng sóng yếu, pin yếu).
AI Brain (Bộ não): Sử dụng LLM (qua OpenAI/OpenMind) để xử lý ngôn ngữ tự nhiên (NLP) tiếng Việt và Vision AI để xác thực hình ảnh.
Agent Framework: IQAI ADK-TS (Agent Development Kit) để quản lý logic và ví tiền.
Blockchain Layer: Mạng lưới Ethereum/Base (Dùng Stablecoin USDC/USDT cho các khoản Micro-Grants).
4. LUỒNG HOẠT ĐỘNG CỦA AI (AI AGENT WORKFLOW)
Hệ thống hoạt động theo quy trình khép kín 5 bước: Listen -> Perceive -> Dispatch -> Verify -> Reward.
BƯỚC 1: LẮNG NGHE & TIẾP NHẬN (LISTEN)
Nguồn tin A (Chủ động): Người dân điền form SOS trên Telegram Mini App.
Nguồn tin B (Cộng đồng): Người dùng Forward tin nhắn cầu cứu từ các nhóm Zalo/Facebook vào Bot.
Dữ liệu thô: "Cứu gấp, nhà dì Năm ở xóm Bàu, nước lên mái rồi, có trẻ con. Sđt 09xxx..."
BƯỚC 2: NHẬN THỨC & XỬ LÝ (PERCEIVE & PROCESS)
Agent (sử dụng LLM) thực hiện các tác vụ ngầm:
Parsing (Bóc tách): Trích xuất:
Location: "Xóm Bàu" -> Geocoding ra toạ độ GPS ước lượng.
Contact: "09xxx".
Severity: Phát hiện từ khóa "nước lên mái", "trẻ con" -> Đánh dấu mức 5 (Cao nhất).
Deduplication (Lọc trùng): So sánh SĐT/Vị trí với Database hiện tại. Nếu trùng -> Cập nhật trạng thái, không tạo nhiệm vụ mới.
Ticket Creation: Tạo một "Rescue Ticket" (Vé cứu hộ) trên hệ thống.
BƯỚC 3: ĐIỀU PHỐI (DISPATCH)
Agent quét danh sách Đội cứu hộ (Rescuers) đang online trong bán kính 5km quanh điểm SOS.
Gửi thông báo (Push Notification) đến App của đội cứu hộ:
🚨 NHIỆM VỤ KHẨN CẤP
Cách bạn: 1.2km
Tình trạng: 3 người mắc kẹt, nước sâu.
Hỗ trợ nhiên liệu: 20 USDC.
[NHẬN NHIỆM VỤ]
BƯỚC 4: XÁC THỰC HIỆN TRƯỜNG (VERIFY - Proof of Rescue)
Đội cứu hộ đến nơi, thực hiện giải cứu.
Họ gửi vào Bot một bức ảnh chụp hiện trường/người dân đã an toàn.
AI Vision (OpenMind/GPT-4o): Phân tích bức ảnh.
Check 1: Có con người trong ảnh không? -> Yes.
Check 2: Bối cảnh có phải lũ lụt không? -> Yes.
Check 3 (Metadata): GPS của ảnh có trùng khớp vị trí Ticket không? -> Yes.
Kết quả: Agent đánh dấu Ticket là COMPLETED.
BƯỚC 5: TRẢ THƯỞNG TỰ ĐỘNG (REWARD / DEFAI)
Ngay khi Ticket chuyển sang COMPLETED.
IQAI ADK-TS kích hoạt Smart Contract.
Tự động chuyển 20 USDC (hoặc token tương đương) từ Quỹ chung (Treasury) vào Ví của Đội cứu hộ.
Gửi Transaction Hash (Bằng chứng giao dịch) lại cho nhóm chat để minh bạch hóa.
5. THIẾT KẾ MÀN HÌNH (UX FLOW)
A. Dành cho NẠN NHÂN (Victim View)
Nút SOS Lớn: Một chạm để chia sẻ vị trí GPS.
SOS Form: Nhập nhanh tình trạng (Text/Voice).
Tracking: Xem trạng thái "Đã có đội cứu hộ nhận tin" / "Đội cứu hộ đang đến (còn 10 phút)".
B. Dành cho ĐỘI CỨU HỘ (Rescuer View) - "Uber for Rescue"
Radar Feed: Danh sách các điểm kêu cứu sắp xếp theo khoảng cách gần nhất.
Mission Control: Bản đồ dẫn đường đi, số điện thoại nạn nhân.
Claim Reward: Nút chụp ảnh xác thực để nhận tiền hỗ trợ xăng dầu.
C. Dành cho BAN TỔ CHỨC/NHÀ TÀI TRỢ (Dashboard)
Live Map: Bản đồ nhiệt hiển thị vùng ngập và vị trí các đội cứu hộ theo thời gian thực.
Treasury Monitor: Số dư quỹ, tổng số tiền đã giải ngân, danh sách giao dịch blockchain (Real-time).
6. MÔ HÌNH VẬN HÀNH (GOVERNANCE)
Giai đoạn 1 (Hackathon/MVP): Vận hành bởi ReliefDAO (Team phát triển) với ví Multi-sig.
Giai đoạn 2 (Mở rộng): Hợp tác với các NGO/Hội Chữ Thập Đỏ để xác minh danh tính (KYC) các đội cứu hộ uy tín (White-listing).
Cơ chế chống gian lận (Anti-fraud):
Giới hạn mỗi đội cứu hộ chỉ được nhận tối đa X nhiệm vụ/ngày.
AI phát hiện ảnh trùng lặp (nếu dùng 1 ảnh gửi 2 lần sẽ bị ban).
Cộng đồng Report nếu đội cứu hộ nhận tiền nhưng không đến.
7. ĐIỂM SÁNG TẠO (INNOVATION POINTS)
Real-world DeFAI: Ứng dụng Crypto vào đời sống thực tế, cứu người chứ không đầu cơ.
AI-driven Logistics: Thay thế sức người trong việc trực tổng đài, giảm độ trễ thông tin xuống bằng 0.
Proof-of-Rescue: Khái niệm mới về việc sử dụng dữ liệu xác thực để kích hoạt dòng tiền từ thiện.
