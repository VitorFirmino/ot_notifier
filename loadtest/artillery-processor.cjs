const fs = require("node:fs");
const path = require("node:path");

const session = JSON.parse(fs.readFileSync(path.join(__dirname, ".session.json"), "utf-8"));

function attachCookie(requestParams, _context, _ee, next) {
  requestParams.headers = { ...requestParams.headers, Cookie: session.cookie };
  return next();
}

module.exports = { attachCookie };
