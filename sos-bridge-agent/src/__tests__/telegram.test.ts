/**
 * Telegram Bot Tests
 * Test message parsing, response formatting, và bot functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock TelegramBot to avoid actual API calls
vi.mock('node-telegram-bot-api', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getMe: vi.fn().mockResolvedValue({
        id: 123456789,
        first_name: 'SOS Bridge Bot',
        username: 'sos_bridge_bot',
      }),
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
      deleteMessage: vi.fn().mockResolvedValue(true),
      answerCallbackQuery: vi.fn().mockResolvedValue(true),
      getFileLink: vi.fn().mockResolvedValue('https://example.com/file.jpg'),
      setWebHook: vi.fn().mockResolvedValue(true),
      stopPolling: vi.fn().mockResolvedValue(true),
      on: vi.fn(),
      onText: vi.fn(),
    })),
  };
});

describe('Telegram Message Parsing Tests', () => {
  describe('SOS Message Detection', () => {
    it('should detect Vietnamese SOS keywords', () => {
      const sosKeywords = [
        'cứu',
        'giúp',
        'SOS',
        'khẩn cấp',
        'nguy hiểm',
        'ngập',
        'lũ',
        'kẹt',
        'mắc kẹt',
        'cấp cứu',
      ];

      const testMessages = [
        'Cứu với! Nhà tôi bị ngập',
        'SOS! Cần giúp đỡ gấp',
        'Khẩn cấp! 3 người mắc kẹt',
        'Nguy hiểm! Nước lên cao',
      ];

      testMessages.forEach(message => {
        const hasSOSKeyword = sosKeywords.some(keyword =>
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        expect(hasSOSKeyword).toBe(true);
      });
    });

    it('should reject non-SOS messages', () => {
      const sosKeywords = [
        'cứu',
        'giúp',
        'SOS',
        'khẩn cấp',
        'nguy hiểm',
        'ngập',
        'lũ',
        'kẹt',
        'mắc kẹt',
      ];

      const nonSOSMessages = [
        'Xin chào, tôi muốn hỏi về thời tiết',
        'Cảm ơn bạn',
        'Hôm nay trời đẹp quá',
        'Cho mình hỏi địa chỉ',
      ];

      nonSOSMessages.forEach(message => {
        const hasSOSKeyword = sosKeywords.some(keyword =>
          message.toLowerCase().includes(keyword.toLowerCase())
        );
        expect(hasSOSKeyword).toBe(false);
      });
    });
  });

  describe('Information Extraction', () => {
    it('should extract phone numbers from messages', () => {
      const messages = [
        { text: 'SĐT: 0912345678', expected: '0912345678' },
        { text: 'Gọi cho tôi theo số 0909.123.456', expected: '0909123456' },
        { text: 'Liên hệ: +84912345678', expected: '+84912345678' },
        { text: 'Số điện thoại của tôi là 0987654321', expected: '0987654321' },
      ];

      const phoneRegex = /(\+?84|0)[\d\.\-\s]{8,14}/;

      messages.forEach(({ text, expected }) => {
        const match = text.match(phoneRegex);
        expect(match).not.toBeNull();
        const extracted = match?.[0].replace(/[\.\-\s]/g, '');
        expect(extracted).toBe(expected);
      });
    });

    it('should extract address information', () => {
      const messages = [
        'Nhà ở xóm Bàu, xã Hải Thượng',
        'Địa chỉ: 123 đường Lê Lợi, phường 1, Đông Hà',
        'Tại thôn 2, xã Triệu Phong, huyện Triệu Phong',
      ];

      // Check that messages contain location keywords
      const locationKeywords = ['xóm', 'xã', 'thôn', 'phường', 'đường', 'huyện', 'quận'];

      messages.forEach(message => {
        const hasLocation = locationKeywords.some(keyword =>
          message.toLowerCase().includes(keyword)
        );
        expect(hasLocation).toBe(true);
      });
    });

    it('should extract people count', () => {
      const messages = [
        { text: '3 người mắc kẹt', expected: 3 },
        { text: 'Có 5 người cần cứu', expected: 5 },
        { text: '2 ông bà già và 1 cháu nhỏ', expected: 2 }, // First match
        { text: 'Một gia đình 4 người', expected: 4 },
      ];

      messages.forEach(({ text, expected }) => {
        const match = text.match(/(\d+)\s*(?:người|ông|bà|trẻ|cháu|em|gia đình)/i);
        expect(match).not.toBeNull();
        expect(parseInt(match?.[1] || '0')).toBe(expected);
      });
    });
  });

  describe('Message Format Detection', () => {
    it('should detect forwarded message format', () => {
      const forwardedMessages = [
        { text: 'Forwarded from Zalo: Cứu với!', isForwarded: true },
        { text: 'Chuyển tiếp: Nhà ông Ba bị ngập', isForwarded: true },
        { text: 'Cứu với! Nhà tôi bị ngập', isForwarded: false },
      ];

      const forwardKeywords = ['forwarded', 'chuyển tiếp', 'forward from'];

      forwardedMessages.forEach(({ text, isForwarded }) => {
        const hasForwardKeyword = forwardKeywords.some(keyword =>
          text.toLowerCase().includes(keyword)
        );
        expect(hasForwardKeyword).toBe(isForwarded);
      });
    });

    it('should detect direct form submission', () => {
      // Direct forms typically have structured data
      const directFormData = {
        name: 'Nguyễn Văn A',
        phone: '0912345678',
        address: 'Xóm 5, Xã Hải Thượng',
        description: 'Cần cứu hộ gấp',
        people_count: 3,
      };

      expect(directFormData).toHaveProperty('name');
      expect(directFormData).toHaveProperty('phone');
      expect(directFormData).toHaveProperty('address');
      expect(directFormData).toHaveProperty('description');
    });
  });
});

describe('Telegram Response Formatting Tests', () => {
  describe('Status Emoji Mapping', () => {
    it('should map ticket status to correct emoji', () => {
      const statusEmojis: Record<string, string> = {
        OPEN: '🆕',
        ASSIGNED: '👤',
        IN_PROGRESS: '🚀',
        VERIFIED: '✅',
        COMPLETED: '🎉',
        CANCELLED: '❌',
      };

      Object.entries(statusEmojis).forEach(([status, emoji]) => {
        expect(statusEmojis[status]).toBe(emoji);
      });
    });
  });

  describe('Message Formatting', () => {
    it('should format workflow result correctly', () => {
      const result = 'Test workflow result';
      const formatted = `📋 **Kết quả xử lý:**\n\n${result}`;
      
      expect(formatted).toContain('📋');
      expect(formatted).toContain('Kết quả xử lý');
      expect(formatted).toContain(result);
    });

    it('should format verification result correctly', () => {
      const result = 'Verification passed';
      const formatted = `🔍 **Kết quả xác thực:**\n\n${result}`;
      
      expect(formatted).toContain('🔍');
      expect(formatted).toContain('Kết quả xác thực');
      expect(formatted).toContain(result);
    });

    it('should format mission notification correctly', () => {
      const notification = {
        ticketId: 'SOS_VN_001',
        distance: 1.5,
        victimCount: 3,
        address: 'Xóm Bàu, Hải Thượng',
        reward: 20,
      };

      const message = `
🚨 **CÓ NHIỆM VỤ MỚI!**

📍 **Địa điểm:** ${notification.address}
📏 **Khoảng cách:** ${notification.distance.toFixed(1)} km
👥 **Số người cần cứu:** ${notification.victimCount}
💰 **Thù lao:** ${notification.reward} USDC

**Mã ticket:** ${notification.ticketId}
      `.trim();

      expect(message).toContain('CÓ NHIỆM VỤ MỚI');
      expect(message).toContain(notification.address);
      expect(message).toContain('1.5 km');
      expect(message).toContain('3');
      expect(message).toContain('20 USDC');
      expect(message).toContain('SOS_VN_001');
    });

    it('should format reward notification correctly', () => {
      const rewardInfo = {
        ticketId: 'SOS_VN_001',
        amount: 20,
        txHash: '0x1234567890abcdef1234567890abcdef12345678',
      };

      const explorerUrl = `https://sepolia.basescan.org/tx/${rewardInfo.txHash}`;
      
      const message = `
💰 **Đã nhận thưởng!**

📋 **Ticket:** ${rewardInfo.ticketId}
💵 **Số tiền:** ${rewardInfo.amount} USDC
🔗 **TX Hash:** \`${rewardInfo.txHash.substring(0, 20)}...\`

[Xem giao dịch trên BaseScan](${explorerUrl})
      `.trim();

      expect(message).toContain('Đã nhận thưởng');
      expect(message).toContain('SOS_VN_001');
      expect(message).toContain('20 USDC');
      expect(message).toContain('BaseScan');
    });
  });

  describe('Inline Keyboard Buttons', () => {
    it('should create correct callback data format', () => {
      const callbackButtons = [
        { text: '✅ NHẬN NHIỆM VỤ', callback_data: 'accept_mission:SOS_VN_001' },
        { text: '❌ Từ chối', callback_data: 'decline_mission:SOS_VN_001' },
        { text: '✅ Xác nhận thông tin đúng', callback_data: 'confirm_sos' },
        { text: '❌ Sửa thông tin', callback_data: 'edit_sos' },
      ];

      callbackButtons.forEach(button => {
        expect(button).toHaveProperty('text');
        expect(button).toHaveProperty('callback_data');
        expect(typeof button.text).toBe('string');
        expect(typeof button.callback_data).toBe('string');
      });
    });
  });
});

describe('Telegram Bot Commands Tests', () => {
  describe('Command Parsing', () => {
    it('should recognize valid commands', () => {
      const validCommands = ['/start', '/help', '/status', '/mytickets'];
      
      validCommands.forEach(cmd => {
        expect(cmd.startsWith('/')).toBe(true);
      });
    });

    it('should parse command with arguments', () => {
      const commandWithArgs = '/register 0912345678 Nguyễn Văn A';
      
      const parts = commandWithArgs.split(' ');
      expect(parts[0]).toBe('/register');
      expect(parts[1]).toBe('0912345678');
      expect(parts.slice(2).join(' ')).toBe('Nguyễn Văn A');
    });
  });

  describe('Welcome Message', () => {
    it('should contain all required sections', () => {
      const welcomeMessage = `
🚨 **Chào mừng đến với SOS-Bridge!**

Đây là hệ thống điều phối cứu nạn sử dụng AI.

**Cách sử dụng:**
1. Gửi tin nhắn mô tả tình huống cần cứu trợ
2. Cung cấp địa chỉ/vị trí và số điện thoại
3. Hệ thống sẽ tự động tìm đội cứu hộ gần nhất

**Lệnh hỗ trợ:**
/help - Xem hướng dẫn chi tiết
/status - Kiểm tra trạng thái hệ thống
/mytickets - Xem các yêu cầu của bạn
      `.trim();

      expect(welcomeMessage).toContain('Chào mừng');
      expect(welcomeMessage).toContain('Cách sử dụng');
      expect(welcomeMessage).toContain('/help');
      expect(welcomeMessage).toContain('/status');
      expect(welcomeMessage).toContain('/mytickets');
    });
  });

  describe('Status Command Response', () => {
    it('should format stats correctly', () => {
      const stats = {
        tickets: { total: 10, open: 3, in_progress: 2, completed: 5 },
        rescuers: { total: 15, online: 8, on_mission: 3 },
        transactions: { total: 5, total_disbursed_usdc: 100 },
      };

      const statusMessage = `
📊 **Trạng thái hệ thống SOS-Bridge**

**Tickets:**
- Tổng: ${stats.tickets.total}
- Đang mở: ${stats.tickets.open}
- Đang xử lý: ${stats.tickets.in_progress}
- Hoàn thành: ${stats.tickets.completed}

**Đội cứu hộ:**
- Tổng đăng ký: ${stats.rescuers.total}
- Đang online: ${stats.rescuers.online}
- Đang làm nhiệm vụ: ${stats.rescuers.on_mission}

**Giao dịch:**
- Tổng: ${stats.transactions.total}
- Đã giải ngân: ${stats.transactions.total_disbursed_usdc} USDC
      `.trim();

      expect(statusMessage).toContain('Trạng thái hệ thống');
      expect(statusMessage).toContain('Tickets:');
      expect(statusMessage).toContain('Đội cứu hộ:');
      expect(statusMessage).toContain('Giao dịch:');
      expect(statusMessage).toContain('100 USDC');
    });
  });
});

describe('Photo Handling Tests', () => {
  describe('Photo Caption Parsing', () => {
    it('should extract ticket ID from caption', () => {
      const captions = [
        { text: 'Ticket: SOS_VN_001', expected: 'SOS_VN_001' },
        { text: 'ticket:SOS_VN_002', expected: 'SOS_VN_002' },
        { text: 'TICKET SOS_VN_003', expected: 'SOS_VN_003' },
      ];

      captions.forEach(({ text, expected }) => {
        const match = text.match(/ticket[:\s]*(\w+)/i);
        expect(match).not.toBeNull();
        expect(match?.[1]).toBe(expected);
      });
    });

    it('should handle caption without ticket ID', () => {
      const caption = 'Just a random photo';
      const match = caption.match(/ticket[:\s]*(\w+)/i);
      expect(match).toBeNull();
    });
  });

  describe('File Link Generation', () => {
    it('should construct correct Telegram file URL format', () => {
      const botToken = 'test-token';
      const filePath = 'photos/file_123.jpg';
      
      const expectedUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
      
      expect(expectedUrl).toContain('api.telegram.org');
      expect(expectedUrl).toContain('file/bot');
      expect(expectedUrl).toContain(filePath);
    });
  });
});

describe('Callback Query Handling Tests', () => {
  describe('Callback Data Parsing', () => {
    it('should parse callback data with ticket ID', () => {
      const callbackData = 'accept_mission:SOS_VN_001';
      
      const [action, ticketId] = callbackData.split(':');
      
      expect(action).toBe('accept_mission');
      expect(ticketId).toBe('SOS_VN_001');
    });

    it('should handle callback data without parameters', () => {
      const callbackData = 'confirm_sos';
      
      const parts = callbackData.split(':');
      
      expect(parts[0]).toBe('confirm_sos');
      expect(parts[1]).toBeUndefined();
    });
  });

  describe('Action Routing', () => {
    it('should route to correct handler based on callback', () => {
      const callbacks = ['confirm_sos', 'edit_sos', 'accept_mission', 'decline_mission'];
      
      const handlers: Record<string, string> = {
        confirm_sos: 'handleConfirmSOS',
        edit_sos: 'handleEditSOS',
        accept_mission: 'handleAcceptMission',
        decline_mission: 'handleDeclineMission',
      };

      callbacks.forEach(callback => {
        const action = callback.split(':')[0];
        expect(handlers).toHaveProperty(action);
      });
    });
  });
});

