// 서버 코드가 바뀌었는지 알아보는 지문. 켜져 있는 서버가 옛 코드면 launch.js 가 다시 켠다.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function codeVersion() {
  const h = crypto.createHash('sha1');
  for (const f of ['server.js', 'chat.js', 'version.js']) h.update(fs.readFileSync(path.join(__dirname, f)));
  return h.digest('hex').slice(0, 12);
}

module.exports = { codeVersion };
