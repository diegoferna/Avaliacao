function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded) {
    const first = String(forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return request.ip || request.socket?.remoteAddress || null;
}

module.exports = { getClientIp };
