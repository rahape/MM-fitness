/* var express = require('express');
var router = express.Router();
var passport = require('passport');

const middleware  = require('../middleware/index.js');

// ===============================================================
// ROUTES

// Root route
router.get('/', (req, res) => {
    res.render('login');
});

router.get('/home', middleware.isLoggedIn, (req, res) => {
    let user = req.user;
    res.render('home', {user: user});
});

// Profile
router.get('/profile', middleware.isLoggedIn, (req, res) => {
    let user = req.user;
    res.render('profile', {user: user})
});

// Training program
router.get('/program', middleware.isLoggedIn, (req, res) => {
    res.render('program');
});

// Meal plan
router.get('/meal-plan', middleware.isLoggedIn, (req, res) => {
    res.render('meal-plan');
});

// Inbox
router.get('/inbox', middleware.isLoggedIn, (req, res) => {
    res.render('inbox');
});

// News
router.get('/news', middleware.isLoggedIn, (req, res) => {
    res.render('news');
});

// Update weight route
router.post('/update/:_id/weight', async (req, res) => {
    try {
        const userId = req.params._id;
        const newWeight = req.body.weight;
        await userFactory.updateWeight(newWeight, userId, User);
        
        res.redirect('/home/' + userId);
    } catch(err) {
        throw(err);
    }
});

// ===============================================================
// AUTH ROUTES

// Show signup form
router.get('/register', (req, res) => {
    res.render('register');
});

// Handling user signup
router.post('/register', (req, res) => {
    req.body.username;
    req.body.password;
    User.register(new User({username: req.body.username}), req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render('register');
        }
        passport.authenticate('local')(req, res, function(){
            res.redirect('/home')
        });
    });
});

// ===============================================================
// LOGIN ROUTES

// Render login form
router.get('/login', (req, res) => {
    res.render('login');
});

// Login logic w. middleware
router.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login'
}), (req, res) => {

});

// Logout route
router.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

module.exports = router; */