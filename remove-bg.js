// api/remove-bg.js
// Vercel Serverless Function — đóng vai trò trung gian gọi remove.bg.
// Khoá API (REMOVEBG_API_KEY) chỉ tồn tại ở đây, trên server — KHÔNG
// bao giờ gửi về cho trình duyệt, để tránh bị lộ khoá ra ngoài.
//
// Cách thiết lập:
// 1) Vercel Dashboard -> chọn project -> Settings -> Environment Variables
// 2) Thêm: Key = REMOVEBG_API_KEY, Value = (khoá API remove.bg của anh)
// 3) Chọn áp dụng cho Production (và Preview nếu cần) -> Save
// 4) Vào tab Deployments -> bấm "..." ở bản deploy mới nhất -> Redeploy
//    (biến môi trường chỉ có hiệu lực sau khi redeploy)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server chưa cấu hình REMOVEBG_API_KEY (xem Settings > Environment Variables trên Vercel).' });
    return;
  }

  try {
    // Đọc toàn bộ ảnh gốc (binary) gửi lên từ trình duyệt
    let buffer;
    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      buffer = Buffer.concat(chunks);
    }

    const form = new FormData();
    form.append('image_file', new Blob([buffer]), 'image.png');
    form.append('size', 'auto');

    const rbResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });

    if (!rbResponse.ok) {
      const errText = await rbResponse.text();
      console.error('remove.bg error:', rbResponse.status, errText);
      res.status(rbResponse.status).json({ error: 'remove.bg: ' + errText });
      return;
    }

    const outBuffer = Buffer.from(await rbResponse.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(outBuffer);
  } catch (err) {
    console.error('Lỗi proxy remove.bg:', err);
    res.status(500).json({ error: 'Lỗi server: ' + (err.message || String(err)) });
  }
};
