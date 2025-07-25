// middleware/tenantResolver.js

module.exports = (req, res, next) => {
  const host = req.hostname; // e.g., "client1.tidyzenic.com"
  const parts = host.split('.');

  // Example: "client1.tidyzenic.com" => ['client1', 'tidyzenic', 'com']
  const subdomain = parts.length > 2 ? parts[0] : null;

  // Set tenant only if it's not the root domain or 'www'
  if (subdomain && subdomain !== 'www' && subdomain !== 'tidyzenic') {
    req.tenant = subdomain;
  } else {
    req.tenant = null;
  }

  next();
};
