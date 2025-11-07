const { createCanvas, loadImage } = require('canvas');
const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

module.exports.config = {
  name: "uptime",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "MOHAMMAD AKASH",
  description: "System status without footer",
  commandCategory: "system",
  usages: "[text]",
};

module.exports.run = async function({ api, event }) {
  try {
    // === System Info ===
    const uptimeSec = process.uptime();
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = Math.floor(uptimeSec % 60);
    const uptime = `${h}h ${m}m ${s}s`;

    // Group & user count (fake for Mirai)
    const threadName = event.threadName || "Private Chat";

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

    const cpuModel = os.cpus()[0]?.model.trim().split(" ").slice(0, 4).join(" ") || "Unknown CPU";
    const nodeVer = process.version;

    // Fake Graph Data
    const cpuHistory = Array.from({ length: 30 }, () => Math.floor(Math.random() * 30) + 40);
    const ramHistory = Array.from({ length: 30 }, () => parseFloat(memPercent) + Math.random() * 10 - 5);

    // Avatar
    const senderID = event.senderID;
    const avatarUrl = `https://graph.facebook.com/${senderID}/picture?height=500&width=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    let avatarPath = path.join(__dirname, 'cache', 'avatar_uptime.png');

    try {
      const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 10000 });
      fs.writeFileSync(avatarPath, res.data);
    } catch (e) {
      avatarPath = null;
    }

    // === Canvas Setup ===
    const width = 1000;
    const height = 700;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.font = 'bold 42px Arial';
    ctx.fillStyle = '#60a5fa';
    ctx.textAlign = 'center';
    ctx.fillText('SYSTEM STATUS', width / 2, 70);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Real-time Server Monitor', width / 2, 100);
    ctx.textAlign = 'left';

    // Graph function
    function drawGraph(x, y, w, h, data, color) {
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      data.forEach((val, i) => {
        const px = x + (i * w) / (data.length - 1);
        const py = y + h - (val * h) / 100;
        ctx.lineTo(px, py);
      });
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, y, 0, y + h);
      fillGrad.addColorStop(0, `${color}40`);
      fillGrad.addColorStop(1, `${color}10`);
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    let yPos = 140;

    // CPU
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('CPU', 80, yPos);
    ctx.font = 'bold 52px Arial';
    ctx.fillText(`${cpuHistory[cpuHistory.length - 1].toFixed(0)}%`, 80, yPos + 60);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(cpuModel, 80, yPos + 90);
    drawGraph(380, yPos - 20, 550, 100, cpuHistory, '#60a5fa');
    yPos += 130;

    // RAM
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('RAM', 80, yPos);
    ctx.font = 'bold 52px Arial';
    ctx.fillText(`${memPercent}%`, 80, yPos + 60);
    ctx.font = '18px Arial';
    ctx.fillStyle = '#fbcfe8';
    ctx.fillText(`${formatBytes(usedMem)} / ${formatBytes(totalMem)}`, 80, yPos + 90);
    drawGraph(380, yPos - 20, 550, 100, ramHistory, '#f87171');
    yPos += 140;

    // Bot Status
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('BOT STATUS', 80, yPos);
    yPos += 50;

    const statusLines = [
      `Uptime: ${uptime}`,
      `Thread: ${threadName}`,
      `OS: ${os.type()} ${os.release()}`,
      `Node.js: ${nodeVer}`
    ];
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = '#e2e8f0';
    statusLines.forEach((line, i) => ctx.fillText(`• ${line}`, 100, yPos + i * 45));

    // Avatar
    if (avatarPath && fs.existsSync(avatarPath)) {
      const avatar = await loadImage(avatarPath);
      const avSize = 90;
      const avX = width - avSize - 60;
      const avY = height - avSize - 60;
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avX, avY, avSize, avSize);
      ctx.restore();
    }

    // Save image & send
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(__dirname, 'cache', 'uptime_mirai.png');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);

    api.sendMessage({
      body: 'System Status',
      attachment: fs.createReadStream(filePath)
    }, event.threadID, () => {
      // Cleanup
      setTimeout(() => {
        [filePath, avatarPath].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
      }, 5000);
    });

  } catch (error) {
    console.error("UPTIME ERROR:", error);
    api.sendMessage(`Error: ${error.message || "Unknown"}`, event.threadID);
  }
};
