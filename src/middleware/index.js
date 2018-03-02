// All middleware goes into this object
const middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash('error_messages', 'Indtast brugernavn og kode for at få adgang.');
    res.redirect('/login');
}

module.exports = middlewareObj;