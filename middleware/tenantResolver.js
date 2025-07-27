module.exports = (req, res, next) => {
  const host = req.headers.host; // ✅ More reliable in prod than req.hostname
  const parts = host.split('.'); // e.g., client1.tidyzenic.com

  let subdomain = null;

  if (parts.length >= 3) {
    // Remove port if any (e.g., client1.tidyzenic.com:443)
    parts[0] = parts[0].split(':')[0];
    subdomain = parts[0];
  }

  if (subdomain && subdomain !== 'www' && subdomain !== 'tidyzenic') {
    req.tenant = subdomain;
  } else {
    req.tenant = null;
  }

  // Optional: log for debug
  console.log(`🔎 Host: ${host} | Subdomain: ${req.tenant}`);

  next();
};
