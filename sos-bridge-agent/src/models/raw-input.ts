/**
 * RawInput - Dữ liệu đầu vào thô
 * Đại diện cho tin nhắn cầu cứu chưa được xử lý
 */

export type InputSource = 'telegram_form' | 'telegram_forward' | 'direct';

/**
 * Tin nhắn đầu vào thô từ người dùng
 */
export interface RawInput {
  source: InputSource;
  user_id?: number | string;
  text_content: string;
  timestamp: number;
  // Metadata từ Telegram (nếu có)
  telegram_message_id?: number;
  telegram_chat_id?: number;
  forwarded_from?: string;
  // Dữ liệu có cấu trúc từ form (nếu có)
  form_data?: {
    gps_lat?: number;
    gps_lng?: number;
    phone?: string;
    people_count?: number;
    description?: string;
  };
  // Ảnh đính kèm (nếu có)
  image_urls?: string[];
}

/**
 * Dữ liệu đã được parse từ RawInput
 */
export interface ParsedData {
  // Vị trí
  location_text: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Liên hệ
  phone: string;
  phone_normalized: string; // Format: 84xxxxxxxxx
  
  // Thông tin nạn nhân
  people_count: number;
  has_elderly: boolean;
  has_children: boolean;
  has_disabled: boolean;
  
  // Mức độ khẩn cấp
  urgency_level: 1 | 2 | 3 | 4 | 5;
  urgency_keywords: string[];
  
  // Ghi chú bổ sung
  notes: string;
  
  // Confidence score của việc parse
  confidence: number;
}

/**
 * Kết quả từ quá trình parse
 */
export interface ParseResult {
  success: boolean;
  data?: ParsedData;
  error?: string;
  raw_input: RawInput;
}

/**
 * Normalize số điện thoại Việt Nam
 * Input: 0912.345.678 hoặc 0912-345-678 hoặc 0912345678
 * Output: 84912345678
 */
export function normalizeVietnamesePhone(phone: string): string {
  // Loại bỏ tất cả ký tự không phải số
  let cleaned = phone.replace(/\D/g, '');
  
  // Xử lý các trường hợp
  if (cleaned.startsWith('84')) {
    // Đã có mã quốc gia
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    // Thay 0 đầu bằng 84
    return '84' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    // Thiếu số 0 đầu
    return '84' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate số điện thoại Việt Nam
 */
export function isValidVietnamesePhone(phone: string): boolean {
  const normalized = normalizeVietnamesePhone(phone);
  // Số điện thoại VN có 11-12 số sau khi normalize
  return normalized.length >= 11 && normalized.length <= 12 && normalized.startsWith('84');
}









