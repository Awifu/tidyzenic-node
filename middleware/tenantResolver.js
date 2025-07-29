module.exports = (req, res, next) => {
  const host = req.headers.host; // 🔐 e.g. awifu-labs-pro.tidyzenic.com
  let subdomain = null;

  if (host) {
    const parts = host.split('.');

    // Handle potential port number (e.g., :3000 or :443)
    parts[0] = parts[0].split(':')[0];

    if (parts.length >= 3) {
      subdomain = parts[0];
    }

    // Ignore main domain and www
    if (['www', 'tidyzenic'].includes(subdomain)) {
      subdomain = null;
    }
  }

  req.tenant = subdomain;

  // ✅ Log only in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔎 Tenant resolved: ${req.tenant || '(none)'}`);
  }

  next();
};
