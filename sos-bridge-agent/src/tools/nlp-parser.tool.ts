/**
 * NLP Parser Tool
 * Sử dụng LLM để trích xuất thông tin từ văn bản cầu cứu tiếng Việt
 */

import { FunctionTool } from '@iqai/adk';
import { normalizeVietnamesePhone, type ParsedData } from '../models/raw-input.js';

/**
 * Hàm phân tích tin nhắn cầu cứu
 */
async function parseSosMessage(message: string): Promise<ParsedData & { telegram_user_id?: string }> {
  console.log(`[NLP Parser] Analyzing message: "${message.substring(0, 50)}..."`);
  
  // Extract telegram user ID if present
  const telegramUserMatch = message.match(/\[TELEGRAM_USER:(\d+)\]/);
  const telegramUserId = telegramUserMatch ? telegramUserMatch[1] : undefined;
  
  // Remove telegram user tag from message for parsing
  const cleanMessage = message.replace(/\[TELEGRAM_USER:\d+\]\s*/g, '');
  
  // Use clean message for actual parsing
  const parseMessage = cleanMessage || message;
  
  // Tìm số điện thoại bằng regex
  const phoneRegex = /(?:0|\+84|84)?[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/g;
  const phoneMatches = parseMessage.match(phoneRegex) || [];
  const phone = phoneMatches[0] || '';
  const phoneNormalized = phone ? normalizeVietnamesePhone(phone) : '';
  
  // Tìm số người
  const peopleRegex = /(\d+)\s*(?:người|ng|nguoi)/gi;
  const peopleMatch = parseMessage.match(peopleRegex);
  let peopleCount = 1;
  if (peopleMatch) {
    const num = peopleMatch[0].match(/\d+/);
    if (num) peopleCount = parseInt(num[0]);
  }
  
  // Detect người già, trẻ em
  const hasElderly = /(?:già|ông|bà|cụ|già|cao tuổi|lão)/i.test(parseMessage);
  const hasChildren = /(?:trẻ|em|bé|con|nhỏ|sơ sinh|baby)/i.test(parseMessage);
  const hasDisabled = /(?:khuyết tật|tàn tật|bại liệt|mù|điếc)/i.test(parseMessage);
  
  // Đánh giá mức độ khẩn cấp
  const urgencyKeywords: string[] = [];
  let urgencyLevel: 1 | 2 | 3 | 4 | 5 = 3;
  
  if (/(?:mái|nóc|sắp chìm|ngập hết|chết|nguy hiểm|cứu gấp|khẩn cấp)/i.test(parseMessage)) {
    urgencyLevel = 5;
    urgencyKeywords.push('Nước lên mái/nóc', 'Nguy hiểm tính mạng');
  } else if (/(?:ngang người|ngang ngực|ngang cổ|cần cứu|gấp)/i.test(parseMessage)) {
    urgencyLevel = 4;
    urgencyKeywords.push('Nước ngang người', 'Cần cứu gấp');
  } else if (/(?:ngập sân|ngập đường|cô lập|mắc kẹt)/i.test(parseMessage)) {
    urgencyLevel = 3;
    urgencyKeywords.push('Ngập đường/sân', 'Bị cô lập');
  } else if (/(?:lương thực|thực phẩm|nước uống|thuốc)/i.test(parseMessage)) {
    urgencyLevel = 2;
    urgencyKeywords.push('Cần lương thực/thuốc');
  }
  
  // Bonus urgency cho người già và trẻ em
  if (hasElderly || hasChildren) {
    urgencyLevel = Math.min(5, urgencyLevel + 1) as 1 | 2 | 3 | 4 | 5;
    if (hasElderly) urgencyKeywords.push('Có người già');
    if (hasChildren) urgencyKeywords.push('Có trẻ em');
  }
  
  // Extract location (lấy phần địa chỉ)
  const locationPatterns = [
    /(?:ở|tại|địa chỉ)\s*[:.]?\s*([^,.]+(?:,[^,.]+)*)/i,
    /(?:xóm|thôn|ấp|xã|phường|huyện|quận|tỉnh|thành phố)\s*\S+/gi,
  ];
  
  let locationText = '';
  for (const pattern of locationPatterns) {
    const match = parseMessage.match(pattern);
    if (match) {
      locationText = match[0];
      break;
    }
  }
  
  // Fallback: lấy phần đầu tin nhắn nếu không tìm thấy địa chỉ rõ ràng
  if (!locationText) {
    const words = parseMessage.split(/[,.\n]/);
    locationText = words.slice(0, 3).join(', ').trim();
  }
  
  const result: ParsedData & { telegram_user_id?: string } = {
    location_text: locationText,
    phone,
    phone_normalized: phoneNormalized,
    people_count: peopleCount,
    has_elderly: hasElderly,
    has_children: hasChildren,
    has_disabled: hasDisabled,
    urgency_level: urgencyLevel,
    urgency_keywords: urgencyKeywords,
    notes: `Phân tích từ tin nhắn: "${parseMessage.substring(0, 100)}..."`,
    confidence: phoneNormalized ? 0.9 : 0.7,
    telegram_user_id: telegramUserId,
  };
  
  console.log(`[NLP Parser] Result:`, {
    location: result.location_text,
    phone: result.phone_normalized,
    urgency: result.urgency_level,
    people: result.people_count,
    telegram_user: result.telegram_user_id,
  });
  
  return result;
}

/**
 * NLP Parser Tool - Trích xuất thông tin từ văn bản cầu cứu
 */
export const nlpParserTool = new FunctionTool(parseSosMessage, {
  name: 'parse_sos_message',
  description: `Phân tích tin nhắn cầu cứu tiếng Việt và trích xuất thông tin quan trọng.
  
  Công cụ này giúp:
  - Trích xuất địa chỉ/vị trí (xóm, thôn, xã, huyện, tỉnh)
  - Tìm số điện thoại liên hệ
  - Đếm số người cần cứu
  - Phát hiện người già, trẻ em, người khuyết tật
  - Đánh giá mức độ khẩn cấp dựa trên từ khóa
  
  Mức độ khẩn cấp:
  - 5: Rất nguy cấp (nước lên mái, sắp chìm)
  - 4: Nguy cấp cao (nước lên ngang người)
  - 3: Trung bình (nước ngập sân, cô lập)
  - 2: Thấp (cần lương thực, thuốc)
  - 1: Thông tin chung`,
});
