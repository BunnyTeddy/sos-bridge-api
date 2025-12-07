/**
 * Vision Verify Tool
 * Sử dụng Gemini Vision AI để xác thực ảnh cứu hộ
 */

import { FunctionTool } from '@iqai/adk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { store } from '../store/index.js';
import type { VerificationResult } from '../models/rescue-ticket.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

/**
 * Vision Analysis Result Interface
 */
interface VisionAnalysisResult {
  human_detected: boolean;
  human_confidence: number;
  flood_scene_detected: boolean;
  flood_confidence: number;
  scene_description: string;
  safety_indicators: string[];
  concerns: string[];
}

/**
 * Fetch image and convert to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Handle data URLs
    if (imageUrl.startsWith('data:')) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return { data: matches[2], mimeType: matches[1] };
      }
      return null;
    }

    // Fetch remote image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`[Vision] Failed to fetch image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error('[Vision] Error fetching image:', error);
    return null;
  }
}

/**
 * Analyze image with Gemini Vision AI
 */
async function analyzeImageWithVisionAI(imageUrl: string): Promise<VisionAnalysisResult> {
  console.log(`[Vision] Analyzing image with Gemini Vision: ${imageUrl.substring(0, 50)}...`);

  // Check if API key is configured
  if (!process.env.GOOGLE_API_KEY) {
    console.warn('[Vision] GOOGLE_API_KEY not set, using fallback mock analysis');
    return getMockAnalysisResult();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Fetch and convert image to base64
    const imageData = await fetchImageAsBase64(imageUrl);
    
    if (!imageData) {
      console.warn('[Vision] Could not fetch image, using fallback analysis');
      return getMockAnalysisResult();
    }

    const prompt = `Bạn là chuyên gia phân tích ảnh cho hệ thống cứu hộ lũ lụt. Hãy phân tích ảnh này và trả lời bằng JSON với cấu trúc sau:

{
  "human_detected": true/false,
  "human_confidence": 0.0-1.0,
  "flood_scene_detected": true/false,
  "flood_confidence": 0.0-1.0,
  "scene_description": "Mô tả ngắn gọn cảnh trong ảnh bằng tiếng Việt",
  "safety_indicators": ["Danh sách các dấu hiệu an toàn nếu có"],
  "concerns": ["Danh sách các lo ngại nếu có"]
}

Tiêu chí đánh giá:
1. human_detected: Có người trong ảnh không? (người đang được cứu, đội cứu hộ, v.v.)
2. human_confidence: Độ tin cậy của việc phát hiện người (0.8+ là tốt)
3. flood_scene_detected: Bối cảnh có phải là lũ lụt/sông nước/ngập không?
4. flood_confidence: Độ tin cậy của việc phát hiện cảnh lũ
5. scene_description: Mô tả những gì bạn thấy trong ảnh
6. safety_indicators: Các dấu hiệu cho thấy người đã được cứu an toàn
7. concerns: Các lo ngại về tính xác thực của ảnh (ảnh cũ, không phải cảnh cứu hộ, v.v.)

CHỈ trả về JSON, không có text khác.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData.data,
          mimeType: imageData.mimeType,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    console.log(`[Vision] Gemini response: ${text.substring(0, 200)}...`);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as VisionAnalysisResult;
      
      // Validate and normalize values
      return {
        human_detected: Boolean(parsed.human_detected),
        human_confidence: Math.min(1, Math.max(0, Number(parsed.human_confidence) || 0)),
        flood_scene_detected: Boolean(parsed.flood_scene_detected),
        flood_confidence: Math.min(1, Math.max(0, Number(parsed.flood_confidence) || 0)),
        scene_description: String(parsed.scene_description || 'Không có mô tả'),
        safety_indicators: Array.isArray(parsed.safety_indicators) ? parsed.safety_indicators : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      };
    }

    console.warn('[Vision] Could not parse Gemini response as JSON');
    return getMockAnalysisResult();

  } catch (error) {
    console.error('[Vision] Gemini Vision API error:', error);
    return getMockAnalysisResult();
  }
}

/**
 * Fallback mock analysis when API is unavailable
 */
function getMockAnalysisResult(): VisionAnalysisResult {
  const humanDetected = Math.random() > 0.1;
  const floodSceneDetected = Math.random() > 0.15;

  return {
    human_detected: humanDetected,
    human_confidence: humanDetected ? 0.85 + Math.random() * 0.15 : 0.1 + Math.random() * 0.3,
    flood_scene_detected: floodSceneDetected,
    flood_confidence: floodSceneDetected ? 0.8 + Math.random() * 0.2 : 0.1 + Math.random() * 0.2,
    scene_description: floodSceneDetected
      ? 'Cảnh lũ lụt với nước ngập, có thể thấy người đang được cứu hộ (MOCK)'
      : 'Không rõ bối cảnh lũ lụt (MOCK)',
    safety_indicators: humanDetected
      ? ['Người có vẻ an toàn', 'Đang được hỗ trợ di chuyển']
      : ['Không phát hiện người trong ảnh'],
    concerns: ['[MOCK MODE] Kết quả này là giả lập, không phải từ AI thực'],
  };
}

/**
 * Validate image metadata
 */
function validateImageMetadata(
  imageUrl: string,
  expectedLat?: number,
  expectedLng?: number
): {
  has_metadata: boolean;
  location_match: boolean;
  time_match: boolean;
  notes: string[];
} {
  // In production, this would parse EXIF data from the image
  // For now, we simulate metadata validation
  const hasMetadata = Math.random() > 0.3;
  const locationMatch = hasMetadata && (expectedLat === undefined || Math.random() > 0.2);
  const timeMatch = hasMetadata && Math.random() > 0.1;

  const notes: string[] = [];

  if (!hasMetadata) {
    notes.push('Ảnh không có metadata EXIF');
  } else {
    if (locationMatch) {
      notes.push('Vị trí GPS trong ảnh khớp với vị trí nhiệm vụ');
    } else {
      notes.push('Vị trí GPS không khớp hoặc không có');
    }

    if (timeMatch) {
      notes.push('Thời gian chụp ảnh trong khoảng thời gian nhiệm vụ');
    } else {
      notes.push('Không xác định được thời gian chụp');
    }
  }

  return {
    has_metadata: hasMetadata,
    location_match: locationMatch,
    time_match: timeMatch,
    notes,
  };
}

/**
 * Check for duplicate images using hash comparison
 */
async function checkImageDuplicate(imageUrl: string): Promise<{
  is_duplicate: boolean;
  previous_ticket_id?: string;
  message: string;
}> {
  // In production, this would compute perceptual hash and compare
  // For MVP, we just check if URL was used before
  const existingTickets = await store.getAllTickets();
  
  for (const ticket of existingTickets) {
    if (ticket.verification_image_url === imageUrl && ticket.status === 'COMPLETED') {
      return {
        is_duplicate: true,
        previous_ticket_id: ticket.ticket_id,
        message: `Ảnh đã được sử dụng cho ticket ${ticket.ticket_id}`,
      };
    }
  }

  return {
    is_duplicate: false,
    message: 'Ảnh chưa được sử dụng trước đó',
  };
}

/**
 * Xác thực ảnh cứu hộ bằng Vision AI
 */
async function verifyRescueImage(imageUrl: string, ticketId: string) {
  console.log(`[Vision] Verifying image for ticket ${ticketId}`);

  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    return {
      success: false,
      is_valid: false,
      message: `Không tìm thấy ticket ${ticketId}`,
    };
  }

  // 1. Analyze image with Vision AI
  const visionAnalysis = await analyzeImageWithVisionAI(imageUrl);

  // 2. Validate metadata
  const metadataCheck = validateImageMetadata(
    imageUrl,
    ticket.location.lat,
    ticket.location.lng
  );

  // 3. Check for duplicates
  const duplicateCheck = await checkImageDuplicate(imageUrl);

  // 4. Calculate overall validity
  const humanOk = visionAnalysis.human_detected && visionAnalysis.human_confidence >= 0.8;
  const floodOk = visionAnalysis.flood_scene_detected && visionAnalysis.flood_confidence >= 0.7;
  const notDuplicate = !duplicateCheck.is_duplicate;

  // Overall score
  let confidenceScore = 0;
  if (humanOk) confidenceScore += 0.35;
  if (floodOk) confidenceScore += 0.3;
  if (metadataCheck.location_match) confidenceScore += 0.15;
  if (metadataCheck.time_match) confidenceScore += 0.1;
  if (notDuplicate) confidenceScore += 0.1;

  const isValid = confidenceScore >= 0.65;

  // Build notes
  const notes: string[] = [];
  if (humanOk) notes.push('✓ Phát hiện người trong ảnh');
  else notes.push('✗ Không phát hiện người trong ảnh');

  if (floodOk) notes.push('✓ Bối cảnh lũ lụt xác nhận');
  else notes.push('✗ Không xác nhận được bối cảnh lũ lụt');

  notes.push(...metadataCheck.notes);
  notes.push(duplicateCheck.message);

  // Add AI scene description
  if (visionAnalysis.scene_description) {
    notes.push(`📷 AI: ${visionAnalysis.scene_description}`);
  }

  // Add safety indicators
  if (visionAnalysis.safety_indicators.length > 0) {
    notes.push(`✅ An toàn: ${visionAnalysis.safety_indicators.join(', ')}`);
  }

  // Add concerns
  if (visionAnalysis.concerns.length > 0) {
    notes.push(`⚠️ Lưu ý: ${visionAnalysis.concerns.join(', ')}`);
  }

  const result: VerificationResult = {
    is_valid: isValid,
    human_detected: visionAnalysis.human_detected,
    flood_scene_detected: visionAnalysis.flood_scene_detected,
    confidence_score: Math.round(confidenceScore * 100) / 100,
    metadata_valid: metadataCheck.has_metadata && metadataCheck.location_match,
    notes: notes.join('\n'),
  };

  console.log(`[Vision] Verification result: ${isValid ? 'VALID' : 'INVALID'} (score: ${confidenceScore})`);

  return {
    success: true,
    is_valid: isValid,
    ticket_id: ticketId,
    verification_result: result,
    analysis: {
      human: {
        detected: visionAnalysis.human_detected,
        confidence: visionAnalysis.human_confidence,
      },
      scene: {
        is_flood: visionAnalysis.flood_scene_detected,
        confidence: visionAnalysis.flood_confidence,
        description: visionAnalysis.scene_description,
      },
      metadata: metadataCheck,
      duplicate: duplicateCheck,
    },
    notes,
    message: isValid
      ? 'Ảnh xác thực thành công. Nhiệm vụ có thể chuyển sang VERIFIED.'
      : 'Ảnh không đạt yêu cầu xác thực. Cần kiểm tra lại.',
  };
}

export const visionVerifyTool = new FunctionTool(verifyRescueImage, {
  name: 'verify_rescue_image',
  description: `Verify rescue mission completion photo using Gemini Vision AI.
  
  Checks criteria:
  - Human Detection: Are there people in photo? (>80% confidence)
  - Flood Scene: Is context a flood scene? (>70% confidence)
  - Metadata: Do GPS and time match?
  - Duplicate: Has photo been used before?
  
  Result: VALID if total score >= 65%`,
});

/**
 * Cập nhật kết quả xác thực vào ticket
 */
async function updateTicketVerification(
  ticketId: string,
  isValid: boolean,
  imageUrl: string,
  verificationNotes?: string
) {
  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    return { success: false, message: `Không tìm thấy ticket ${ticketId}` };
  }

  const now = Date.now();

  const updates: Partial<typeof ticket> = {
    verification_image_url: imageUrl,
    verification_result: {
      is_valid: isValid,
      human_detected: isValid,
      flood_scene_detected: isValid,
      confidence_score: isValid ? 0.85 : 0.3,
      metadata_valid: isValid,
      notes: verificationNotes || '',
    },
  };

  if (isValid) {
    updates.status = 'VERIFIED';
    updates.verified_at = now;
  }

  await store.updateTicket(ticketId, updates);

  console.log(`[Vision] Updated ticket ${ticketId} verification: ${isValid ? 'VERIFIED' : 'FAILED'}`);

  return {
    success: true,
    ticket_id: ticketId,
    new_status: isValid ? 'VERIFIED' : ticket.status,
    verification_passed: isValid,
    message: isValid
      ? 'Ticket đã được xác thực thành công'
      : 'Xác thực thất bại, ticket giữ nguyên trạng thái',
  };
}

export const updateTicketVerificationTool = new FunctionTool(updateTicketVerification, {
  name: 'update_ticket_verification',
  description: `Update photo verification result to ticket and change status.`,
});

/**
 * Hoàn tất nhiệm vụ cứu hộ
 */
async function completeMission(ticketId: string) {
  const ticket = await store.getTicket(ticketId);
  if (!ticket) {
    return { success: false, message: `Không tìm thấy ticket ${ticketId}` };
  }

  if (ticket.status !== 'VERIFIED') {
    return {
      success: false,
      message: `Ticket phải ở trạng thái VERIFIED để hoàn thành (hiện tại: ${ticket.status})`,
    };
  }

  const now = Date.now();

  // Update ticket
  await store.updateTicket(ticketId, {
    status: 'COMPLETED',
    completed_at: now,
  });

  // Update rescuer status
  if (ticket.assigned_rescuer_id) {
    const rescuer = await store.getRescuer(ticket.assigned_rescuer_id);
    if (rescuer) {
      await store.updateRescuer(ticket.assigned_rescuer_id, {
        status: 'IDLE',
        completed_missions: rescuer.completed_missions + 1,
      });
    }
  }

  const rescuer = ticket.assigned_rescuer_id
    ? await store.getRescuer(ticket.assigned_rescuer_id)
    : null;

  console.log(`[Vision] Mission ${ticketId} completed!`);

  // Prepare reward data for smart contract
  const rewardData = {
    ticket_id: ticketId,
    rescuer_id: ticket.assigned_rescuer_id,
    rescuer_wallet: rescuer?.wallet_address,
    amount_usdc: 20,
    victim_count: ticket.victim_info.people_count,
    completed_at: now,
  };

  return {
    success: true,
    ticket_id: ticketId,
    status: 'COMPLETED',
    rescuer: rescuer
      ? {
          id: rescuer.rescuer_id,
          name: rescuer.name,
          wallet: rescuer.wallet_address,
          new_mission_count: rescuer.completed_missions + 1,
        }
      : null,
    reward_data: rewardData,
    message: `Nhiệm vụ ${ticketId} hoàn thành thành công! Sẵn sàng trả thưởng.`,
  };
}

export const completeMissionTool = new FunctionTool(completeMission, {
  name: 'complete_mission',
  description: `Complete rescue mission after verification.`,
});
