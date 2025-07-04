
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { profile, history, message } = req.body;
    
    if (!profile || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const OPENROUTER_API_KEY2 = process.env.OPENROUTER_API_KEY2;
    
    if (!OPENROUTER_API_KEY2) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }
    
    // Tính con số thần số học từ ngày sinh
    const calculateLifePathNumber = (birthDate) => {
      const numbers = birthDate.replace(/[^\d]/g, '');
      let sum = numbers.split('').reduce((acc, num) => acc + parseInt(num), 0);
      
      while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
        sum = sum.toString().split('').reduce((a, b) => a + parseInt(b), 0);
      }
      
      return sum;
    };
    
    const lifePathNumber = calculateLifePathNumber(profile.birthDate);
    
    // Tạo system prompt cho AI
    const systemPrompt = `Bạn là "Chuyên gia Khai vấn Minh triết" - một sự kết hợp độc đáo của:

1. **Chuyên gia Thần số học**: Sử dụng con số ${lifePathNumber} (số đường đời của ${profile.name}) như một lăng kính để hiểu sâu về tính cách và xu hướng. Nhưng KHÔNG lặp lại thông tin thần số học trong mọi câu trả lời - chỉ sử dụng khi thực sự liên quan.

2. **Nhà phân tích Tâm lý & Hành vi**: Kết nối hiểu biết số học với tâm lý học hiện đại, giúp người dùng hiểu rõ hơn về bản thân qua các tình huống thực tế.

3. **Nhà trị liệu đồng cảm**: Lắng nghe sâu sắc, thể hiện sự đồng cảm chân thành, và đặt câu hỏi gợi mở để giúp người dùng tự khám phá.

NGUYÊN TẮC QUAN TRỌNG:
- Ghi nhớ toàn bộ ngữ cảnh cuộc trò chuyện
- LUÔN kết thúc mỗi phản hồi bằng 1-2 câu hỏi gợi mở, sâu sắc để duy trì cuộc đối thoại
- Tránh lặp lại thông tin đã nói, xây dựng dựa trên những gì đã được chia sẻ
- Phong cách: Thân thiện, sâu sắc nhưng không hàn lâm
- Độ dài: 3-5 câu cho mỗi ý, không quá dài
- Tập trung vào HIỆN TẠI và ỨNG DỤNG THỰC TẾ

Thông tin người dùng:
- Tên: ${profile.name}
- Ngày sinh: ${profile.birthDate}
- Số đường đời: ${lifePathNumber}`;

    // Chuẩn bị messages cho API
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];
    
    // Thêm lịch sử chat (giới hạn 10 tin nhắn gần nhất để tiết kiệm token)
    if (history && history.length > 0) {
      const recentHistory = history.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.text
        });
      });
    }
    
    // Thêm tin nhắn hiện tại
    messages.push({
      role: 'user',
      content: message
    });
    
    // Gọi OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY2}`,
        'HTTP-Referer': `https://${req.headers.host}`,
        'Content-Type': 'application/json',
        'X-Title': 'AI Khai Van Assistant'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Có thể đổi model tùy ý
        messages: messages,
        temperature: 0.8,
        max_tokens: 600
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }
    
    const data = await response.json();
    const reply = data.choices[0].message.content;
    
    return res.status(200).json({ reply });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Không thể kết nối với AI. Vui lòng thử lại sau.'
    });
  }
}
