// routes/upload.js
// "Imágenes inteligentes": al subir una foto, el sistema automáticamente
// la recorta a formato cuadrado, ajusta nitidez/contraste, y la optimiza
// en WebP para que cargue rápido. Todo con la librería Sharp, sin
// necesidad de un servicio externo. Si más adelante quieres subir a
// Cloudinary en vez de guardar localmente, solo hay que reemplazar el
// bloque de "guardar archivo" por la llamada a la API de Cloudinary.

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

router.post('/', requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen.' });

  try {
    const filename = `prod-${Date.now()}.webp`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer)
      .resize(900, 900, { fit: 'cover', position: 'attention' }) // recorte inteligente centrado en el punto de interés
      .sharpen()                                                  // aumenta nitidez
      .modulate({ brightness: 1.03, saturation: 1.05 })           // ajuste sutil de brillo/color
      .webp({ quality: 82 })                                      // formato optimizado y liviano
      .toFile(outputPath);

    res.json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo procesar la imagen.' });
  }
});

module.exports = router;
