module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  return res.status(200).json({ 
    message: 'Vercel Functions are working!',
    timestamp: new Date().toISOString(),
    platform: 'Vercel'
  });
};
