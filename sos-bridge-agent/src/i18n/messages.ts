/**
 * Telegram Bot Internationalization
 * Supports English (en) and Vietnamese (vi)
 */

export type Language = 'en' | 'vi';

export const messages = {
  // ============ WELCOME & HELP ============
  welcome: {
    en: (userName: string) => `
🚨 Welcome ${userName} to SOS-Bridge!

This is an AI-powered rescue coordination system.

How to use:
1. Send a message describing your emergency situation
2. Provide your address/location and phone number
3. The system will automatically find the nearest rescue team

Example message:
"Help! Mr. Ba's house in Bau hamlet, Hai Thuong commune is flooded. 3 people are trapped. Phone: 0909123456"

Commands:
/help - See detailed instructions
/status - Check system status
/mytickets - View your requests
/lang - Change language

Send an SOS message if you need help! 🆘
    `.trim(),
    vi: (userName: string) => `
🚨 Chào mừng ${userName} đến với SOS-Bridge!

Đây là hệ thống điều phối cứu nạn sử dụng AI.

Cách sử dụng:
1. Gửi tin nhắn mô tả tình huống cần cứu trợ
2. Cung cấp địa chỉ/vị trí và số điện thoại
3. Hệ thống sẽ tự động tìm đội cứu hộ gần nhất

Ví dụ tin nhắn:
"Cứu với! Nhà ông Ba ở xóm Bàu, xã Hải Thượng bị ngập. Có 3 người mắc kẹt. SĐT: 0909123456"

Lệnh hỗ trợ:
/help - Xem hướng dẫn chi tiết
/status - Kiểm tra trạng thái hệ thống
/mytickets - Xem các yêu cầu của bạn
/lang - Đổi ngôn ngữ

Hãy gửi tin nhắn cầu cứu ngay nếu bạn cần hỗ trợ! 🆘
    `.trim(),
  },

  help: {
    en: `
📖 SOS-Bridge User Guide

1. Sending a rescue request:
- Brief description of the situation
- Exact address (hamlet, village, commune, district)
- Contact phone number
- Number of people needing rescue

2. If you are a rescue team:
- Register via /register
- Turn on ready status /online
- Receive automatic mission notifications
- Send confirmation photo when completed

3. Track progress:
- Receive real-time notifications
- View ticket status
- Receive USDC rewards upon completion

Support: admin@sosbridge.vn
    `.trim(),
    vi: `
📖 Hướng dẫn sử dụng SOS-Bridge

1. Gửi yêu cầu cứu trợ:
- Mô tả tình huống ngắn gọn
- Địa chỉ chính xác (xóm, thôn, xã, huyện)
- Số điện thoại liên hệ
- Số người cần cứu

2. Nếu bạn là đội cứu hộ:
- Đăng ký qua /register
- Bật trạng thái sẵn sàng /online
- Nhận thông báo nhiệm vụ tự động
- Gửi ảnh xác nhận hoàn thành

3. Theo dõi tiến độ:
- Nhận thông báo real-time
- Xem trạng thái ticket
- Nhận thưởng USDC khi hoàn thành

Liên hệ hỗ trợ: admin@sosbridge.vn
    `.trim(),
  },

  // ============ STATUS ============
  status: {
    en: (stats: any) => `
📊 SOS-Bridge System Status

Tickets:
- Total: ${stats.tickets.total}
- Open: ${stats.tickets.open}
- In Progress: ${stats.tickets.in_progress}
- Completed: ${stats.tickets.completed}

Rescue Teams:
- Total Registered: ${stats.rescuers.total}
- Online: ${stats.rescuers.online}
- On Mission: ${stats.rescuers.on_mission}

Transactions:
- Total: ${stats.transactions.total}
- Disbursed: ${stats.transactions.total_disbursed_usdc} USDC

✅ System is operating normally
    `.trim(),
    vi: (stats: any) => `
📊 Trạng thái hệ thống SOS-Bridge

Tickets:
- Tổng: ${stats.tickets.total}
- Đang mở: ${stats.tickets.open}
- Đang xử lý: ${stats.tickets.in_progress}
- Hoàn thành: ${stats.tickets.completed}

Đội cứu hộ:
- Tổng đăng ký: ${stats.rescuers.total}
- Đang online: ${stats.rescuers.online}
- Đang làm nhiệm vụ: ${stats.rescuers.on_mission}

Giao dịch:
- Tổng: ${stats.transactions.total}
- Đã giải ngân: ${stats.transactions.total_disbursed_usdc} USDC

✅ Hệ thống đang hoạt động bình thường
    `.trim(),
  },

  // ============ TICKETS ============
  noTickets: {
    en: '📭 You have no rescue requests yet.\n\n💡 Send a message describing your situation to create a new request.',
    vi: '📭 Bạn chưa có yêu cầu cứu trợ nào.\n\n💡 Gửi tin nhắn mô tả tình huống để tạo yêu cầu mới.',
  },
  
  ticketListHeader: {
    en: '📋 Your requests:\n\n',
    vi: '📋 Các yêu cầu của bạn:\n\n',
  },

  ticketItem: {
    en: (ticket: any) => `   Status: ${ticket.status}\n   Location: ${ticket.location.address_text || 'N/A'}\n   Created: ${new Date(ticket.created_at).toLocaleString('en-US')}\n\n`,
    vi: (ticket: any) => `   Trạng thái: ${ticket.status}\n   Địa điểm: ${ticket.location.address_text || 'N/A'}\n   Tạo lúc: ${new Date(ticket.created_at).toLocaleString('vi-VN')}\n\n`,
  },

  // ============ ERRORS ============
  userNotFound: {
    en: '❌ Cannot identify user.',
    vi: '❌ Không thể xác định người dùng.',
  },

  genericError: {
    en: '❌ An error occurred. Please try again.',
    vi: '❌ Có lỗi xảy ra. Vui lòng thử lại.',
  },

  workflowTimeout: {
    en: '⏱️ Processing took too long. Please try again later.',
    vi: '⏱️ Xử lý quá lâu. Vui lòng thử lại sau.',
  },

  processingError: {
    en: '❌ An error occurred while processing your message. Please try again later.',
    vi: '❌ Có lỗi xảy ra khi xử lý tin nhắn. Vui lòng thử lại sau.',
  },

  photoError: {
    en: '❌ Cannot process photo. Please try again.',
    vi: '❌ Không thể xử lý ảnh. Vui lòng thử lại.',
  },

  photoTimeout: {
    en: '⏱️ Photo processing took too long. Please try again later.',
    vi: '⏱️ Xử lý ảnh quá lâu. Vui lòng thử lại sau.',
  },

  photoVerifyError: {
    en: '❌ An error occurred while verifying photo. Please try again later.',
    vi: '❌ Có lỗi xảy ra khi xác thực ảnh. Vui lòng thử lại sau.',
  },

  // ============ PROCESSING ============
  processingMessage: {
    en: '⏳ Processing your rescue message...',
    vi: '⏳ Đang xử lý tin nhắn cầu cứu của bạn...',
  },

  processingPhoto: {
    en: '🔍 Analyzing rescue verification photo...',
    vi: '🔍 Đang phân tích ảnh xác nhận cứu hộ...',
  },

  alreadyProcessing: {
    en: '⏳ Your previous message is still being processed. Please wait...',
    vi: '⏳ Tin nhắn trước của bạn đang được xử lý. Vui lòng đợi...',
  },

  // ============ NON-SOS MESSAGE ============
  nonSosResponse: {
    en: `Hello! I am the SOS-Bridge rescue bot.

If you need urgent rescue, please send a message describing:
- Your address/location
- Phone number
- Number of people needing rescue

Example: "Help! My house in Hai Thuong commune is flooded. 2 people are trapped. Phone: 0909123456"

Type /help for detailed instructions.
Rescue teams: /register to register for missions.`,
    vi: `Xin chào! Tôi là bot cứu trợ SOS-Bridge.

Nếu bạn cần cứu trợ khẩn cấp, hãy gửi tin nhắn mô tả tình huống với:
- Địa chỉ/vị trí
- Số điện thoại
- Số người cần cứu

Ví dụ: "Cứu với! Nhà tôi ở xã Hải Thượng bị ngập. Có 2 người mắc kẹt. SĐT: 0909123456"

Gõ /help để xem hướng dẫn chi tiết.
Đội cứu hộ: /register để đăng ký nhận nhiệm vụ.`,
  },

  // ============ CALLBACKS ============
  confirmSos: {
    en: '✅ Confirmed! The system is finding the nearest rescue team...\n\nYou will receive a notification when a rescue team accepts the mission.',
    vi: '✅ Đã xác nhận! Hệ thống đang tìm đội cứu hộ gần nhất...\n\nBạn sẽ nhận được thông báo khi có đội cứu hộ nhận nhiệm vụ.',
  },

  editSos: {
    en: '📝 Please send your message again with the corrected information.',
    vi: '📝 Vui lòng gửi lại tin nhắn với thông tin đã chỉnh sửa.',
  },

  declinedMission: {
    en: '❌ Mission declined. The system will find another rescue team.',
    vi: '❌ Đã từ chối nhiệm vụ. Hệ thống sẽ tìm đội cứu hộ khác.',
  },

  nothingToCancel: {
    en: '❓ Nothing to cancel.',
    vi: '❓ Không có gì để hủy.',
  },

  // ============ BUTTONS ============
  confirmButton: {
    en: '✅ Confirm information',
    vi: '✅ Xác nhận thông tin đúng',
  },

  editButton: {
    en: '❌ Edit information',
    vi: '❌ Sửa thông tin',
  },

  acceptMissionButton: {
    en: '✅ ACCEPT MISSION',
    vi: '✅ NHẬN NHIỆM VỤ',
  },

  declineMissionButton: {
    en: '❌ Decline',
    vi: '❌ Từ chối',
  },

  // ============ RESCUER ============
  walletUsage: {
    en: '💳 Usage: /wallet <wallet_address>\n\nExample: /wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f5C000\n\nAddress must be an Ethereum wallet (Base Sepolia).',
    vi: '💳 Cách sử dụng: /wallet <địa_chỉ_ví>\n\nVí dụ: /wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f5C000\n\nĐịa chỉ phải là ví Ethereum (Base Sepolia).',
  },

  locationUpdated: {
    en: (lat: number, lng: number) => `📍 Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    vi: (lat: number, lng: number) => `📍 Đã cập nhật vị trí: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
  },

  notRegistered: {
    en: '❌ You have not registered as a rescue team.\n\nPlease register with /register first.',
    vi: '❌ Bạn chưa đăng ký làm đội cứu hộ.\n\nVui lòng đăng ký với /register trước.',
  },

  noWallet: {
    en: '⚠️ You have not set up a reward wallet.\n\nPlease set up a wallet before accepting missions: /wallet <address>',
    vi: '⚠️ Bạn chưa thiết lập ví nhận thưởng.\n\nVui lòng thiết lập ví trước khi nhận nhiệm vụ: /wallet <địa_chỉ>',
  },

  ticketNotFound: {
    en: '❌ Ticket code not found.',
    vi: '❌ Không tìm thấy mã ticket.',
  },

  missionAccepted: {
    en: (ticketId: string, address: string, phone: string, peopleCount: number) => `✅ Mission ${ticketId} accepted!

📍 Location: ${address}
📞 Victim phone: ${phone}
👥 People count: ${peopleCount}

Please proceed to the location and send a confirmation photo when completed.

📸 Send photo with caption: "Ticket: ${ticketId}"`,
    vi: (ticketId: string, address: string, phone: string, peopleCount: number) => `✅ Đã nhận nhiệm vụ ${ticketId}!

📍 Địa điểm: ${address}
📞 SĐT nạn nhân: ${phone}
👥 Số người: ${peopleCount}

Hãy di chuyển đến địa điểm và gửi ảnh xác nhận khi hoàn thành.

📸 Gửi ảnh kèm caption: "Ticket: ${ticketId}"`,
  },

  // ============ DISPATCH NOTIFICATIONS ============
  newMission: {
    en: (priority: string, address: string, distance: number, peopleCount: number, reward: number, ticketId: string) => `
🚨 ${priority} NEW RESCUE MISSION!

📍 Location: ${address}
📏 Distance: ${distance.toFixed(1)} km from you
👥 People to rescue: ${peopleCount}
💰 Reward: ${reward} USDC

📋 Ticket ID: ${ticketId}

⏰ First to accept gets the mission!
    `.trim(),
    vi: (priority: string, address: string, distance: number, peopleCount: number, reward: number, ticketId: string) => `
🚨 ${priority} NHIỆM VỤ CỨU HỘ MỚI!

📍 Địa điểm: ${address}
📏 Khoảng cách: ${distance.toFixed(1)} km từ bạn
👥 Số người cần cứu: ${peopleCount}
💰 Thù lao: ${reward} USDC

📋 Mã ticket: ${ticketId}

⏰ Ai nhận trước sẽ được giao nhiệm vụ!
    `.trim(),
  },

  // ============ VICTIM NOTIFICATIONS ============
  victimAssigned: {
    en: (rescuerName: string, eta: number, ticketId: string) => `
✅ Good news!

A rescue team has been found for your request.

👤 Rescue team: ${rescuerName}
⏱️ Estimated time: ${eta} minutes
📋 Ticket ID: ${ticketId}

Please stay in contact and wait at a safe location!
    `.trim(),
    vi: (rescuerName: string, eta: number, ticketId: string) => `
✅ Tin tốt!

Đã tìm được đội cứu hộ cho yêu cầu của bạn.

👤 Đội cứu hộ: ${rescuerName}
⏱️ Thời gian dự kiến: ${eta} phút
📋 Mã ticket: ${ticketId}

Hãy giữ liên lạc và chờ đợi ở vị trí an toàn!
    `.trim(),
  },

  victimCompleted: {
    en: (ticketId: string) => `
🎉 Mission completed!

The rescue team has confirmed they have reached and assisted you successfully.

📋 Ticket ID: ${ticketId}

Thank you for using SOS-Bridge. Stay safe!
    `.trim(),
    vi: (ticketId: string) => `
🎉 Nhiệm vụ hoàn thành!

Đội cứu hộ đã xác nhận đã tiếp cận và hỗ trợ bạn thành công.

📋 Mã ticket: ${ticketId}

Cảm ơn bạn đã sử dụng SOS-Bridge. Chúc bạn bình an!
    `.trim(),
  },

  // ============ REWARD NOTIFICATION ============
  rewardSent: {
    en: (ticketId: string, amount: number, txHash: string, explorerUrl: string) => `
💰 Reward received!

Thank you for completing the rescue mission!

📋 Ticket: ${ticketId}
💵 Amount: ${amount} USDC
🔗 TX Hash: ${txHash.substring(0, 20)}...

View transaction: ${explorerUrl}
    `.trim(),
    vi: (ticketId: string, amount: number, txHash: string, explorerUrl: string) => `
💰 Đã nhận thưởng!

Cảm ơn bạn đã hoàn thành nhiệm vụ cứu hộ!

📋 Ticket: ${ticketId}
💵 Số tiền: ${amount} USDC
🔗 TX Hash: ${txHash.substring(0, 20)}...

Xem giao dịch: ${explorerUrl}
    `.trim(),
  },

  // ============ PHOTO VERIFICATION ============
  photoMissingTicket: {
    en: '⚠️ Please send the photo with a caption containing the ticket code.\nExample: "Ticket: SOS_VN_001"',
    vi: '⚠️ Vui lòng gửi ảnh kèm caption có mã ticket.\nVí dụ: "Ticket: SOS_VN_001"',
  },

  // ============ WORKFLOW RESULTS ============
  workflowResult: {
    en: '📋 Processing result:\n\n',
    vi: '📋 Kết quả xử lý:\n\n',
  },

  verificationResult: {
    en: '🔍 Verification result:\n\n',
    vi: '🔍 Kết quả xác thực:\n\n',
  },

  // ============ LANGUAGE ============
  langCommand: {
    en: '🌐 Select your preferred language:\n\n/lang en - English\n/lang vi - Tiếng Việt\n\nCurrent: English',
    vi: '🌐 Chọn ngôn ngữ của bạn:\n\n/lang en - English\n/lang vi - Tiếng Việt\n\nHiện tại: Tiếng Việt',
  },

  langChanged: {
    en: '✅ Language changed to English.',
    vi: '✅ Đã đổi ngôn ngữ sang Tiếng Việt.',
  },

  langInvalid: {
    en: '❌ Invalid language. Please use:\n/lang en - English\n/lang vi - Tiếng Việt',
    vi: '❌ Ngôn ngữ không hợp lệ. Vui lòng dùng:\n/lang en - English\n/lang vi - Tiếng Việt',
  },
};

/**
 * Get a message in the specified language
 */
export function getMessage<K extends keyof typeof messages>(
  key: K,
  lang: Language = 'vi'
): typeof messages[K][Language] {
  return messages[key][lang];
}

/**
 * Get message with fallback to Vietnamese
 */
export function t<K extends keyof typeof messages>(
  key: K,
  lang: Language = 'vi'
): typeof messages[K][Language] {
  const msg = messages[key]?.[lang];
  if (msg === undefined) {
    // Fallback to Vietnamese
    return messages[key]?.['vi'] ?? messages[key]?.['en'];
  }
  return msg;
}

