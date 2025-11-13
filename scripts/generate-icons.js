const fs = require('fs');
const path = require('path');

// 创建一个简单的 PNG 图标（最小有效 PNG）
function createSimplePNG(size) {
  // 创建一个简单的单色 PNG
  // 这是一个最小的有效 PNG 文件，蓝色背景
  const createPNGBuffer = (width, height) => {
    const chunks = [];

    // PNG 签名
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); // 长度
    ihdr.write('IHDR', 4);
    ihdr.writeUInt32BE(width, 8); // 宽度
    ihdr.writeUInt32BE(height, 12); // 高度
    ihdr.writeUInt8(8, 16); // 位深度
    ihdr.writeUInt8(2, 17); // 颜色类型 (2 = RGB)
    ihdr.writeUInt8(0, 18); // 压缩方法
    ihdr.writeUInt8(0, 19); // 过滤方法
    ihdr.writeUInt8(0, 20); // 隔行扫描

    // 计算 CRC
    const crc = require('zlib').crc32(ihdr.slice(4, 21));
    ihdr.writeUInt32BE(crc, 21);

    // IDAT chunk - 创建蓝色图像数据
    const pixelData = Buffer.alloc(height * (1 + width * 3));
    for (let y = 0; y < height; y++) {
      pixelData[y * (1 + width * 3)] = 0; // 过滤类型
      for (let x = 0; x < width; x++) {
        const offset = y * (1 + width * 3) + 1 + x * 3;
        pixelData[offset] = 66;     // R - 深蓝色
        pixelData[offset + 1] = 135; // G
        pixelData[offset + 2] = 245; // B
      }
    }

    const compressed = require('zlib').deflateSync(pixelData);
    const idat = Buffer.alloc(12 + compressed.length);
    idat.writeUInt32BE(compressed.length, 0);
    idat.write('IDAT', 4);
    compressed.copy(idat, 8);
    const idatCrc = require('zlib').crc32(idat.slice(4, 8 + compressed.length));
    idat.writeUInt32BE(idatCrc, 8 + compressed.length);

    // IEND chunk
    const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);

    return Buffer.concat([signature, ihdr, idat, iend]);
  };

  return createPNGBuffer(size, size);
}

// 确保目录存在
const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 生成不同尺寸的图标
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const iconPath = path.join(assetsDir, `icon${size}.png`);
  const pngBuffer = createSimplePNG(size);
  fs.writeFileSync(iconPath, pngBuffer);
  console.log(`Generated icon: ${iconPath}`);
});

console.log('All icons generated successfully!');
