const isAuthenticated = (req, res, next) => {
    if (req.session?.username) return next();
    res.redirect('/?error=auth&message=' + encodeURIComponent('Acceso no autorizado'));
  };
  
  module.exports = {
    isAuthenticated
  };