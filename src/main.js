// Require packages
const passportLocalMongoose = require('passport-local-mongoose'),
bodyparser                  = require('body-parser'),
Chart                       = require('chart.js'),
express                     = require('express'),
app                         = express(),
server                      = require('http').Server(app),
io                          = require('socket.io')(server),
mongoose                    = require('mongoose'),
passport                    = require('passport'),
LocalStrategy               = require('passport-local').Strategy,
moment                      = require('moment'),
schedule                    = require('node-schedule'),
flash                       = require('connect-flash');

// Require local files
const middleware  = require('./middleware/index.js'),
utility           = require('./services/utility.js'),
config            = require('../config/global.config.json'),
userData          = require('./schemas/userSchema.js'),
workoutData       = require('./schemas/workoutSchema.js'),
newsData          = require('./schemas/newsSchema.js'),
userFactory       = require('./services/userFactory.js'),
workoutFactory    = require('./services/workoutFactory.js'),
mealFactory       = require('./services/mealFactory.js'),
newsFactory       = require('./services/newsFactory.js'),
mailService       = require('./services/mailService.js'),
env               = require('../env.json');

// Database stuff
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost/mm_fitness_app', {useMongoClient: true});
const db = mongoose.connection;

// Schemas
// User-schema
const userSchema = mongoose.Schema(userData);
userSchema.plugin(passportLocalMongoose);
const User = mongoose.model('User', userSchema);

// Workout-schema
const workoutSchema = mongoose.Schema(workoutData);
const Workout = mongoose.model('Workout', workoutSchema);

// News-schema
const newsSchema = mongoose.Schema(newsData);
const News = mongoose.model('News', newsSchema);

// Setup
app.use(express.static('public'));
app.use(bodyparser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(flash());
app.use(require('express-session')({
    secret: "MM-Fitness er den vildeste app nogensinde!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Serialize & deserialize the user in the session
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Flash middleware running for every route
app.use((req, res, next) => {
    res.locals.success_messages = req.flash('success_messages');
    res.locals.error_messages = req.flash('error_messages');
    next();
});

// For testing purposes for exam
User.register(new User(
    userFactory.newUser({
        isAdmin: true,
        username: "admin",
        firstName: "tester",
        address: "Roskildevej 223",
        zipcode: "2620"
    })
 ), "1234", (err, user) => {   
 });

 User.register(new User(
    userFactory.newUser({
        username: "testbruger",
        firstName: "tester",
        address: "Roskildevej 223",
        zipcode: "2620"
    })
 ), "1234", (err, user) => {   
     // Create test data
     userFactory.testData(User, 10);
 });

// Run this to get execise data in DB
Workout.remove({}, () => {
    const exercises = ["squats", "bench press", "deadlift", "biceps curls", "shoulder press", "sit ups", "punch press", "flyes", "incline cable flyes", "incline lateral raises", "triceps extensions", "lat pull", "seated row", "leg extension", "leg curls", "calf raises", "cable crunches"];
        exercises.forEach((exercise) => {
        workoutFactory.createNewWorkout(Workout, {
            name:exercise,
            description:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse pretium viverra urna, at bibendum est tristique auctor. Quisque dapibus purus sed justo lacinia eleifend. Phasellus id condimentum risus. Vestibulum fringilla tincidunt ex a consequat. Praesent quis consectetur neque. Aenean blandit ante eu rhoncus maximus. Nulla ut mi ipsum. Nulla cursus condimentum elit pulvinar commodo. Phasellus gravida dolor et odio dignissim, at luctus velit iaculis.",
            videoUrl:"https://www.facebook.com/MikaelMunkFitness/videos/1371468532975406/"
        });
    });
});

// Run to get news test data in DB
News.remove({}, () => {
    newsFactory.createTestNews(News);
    newsFactory.createTestNews(News);
})

// ===============================================================
// WEB SOCKETS FOR CHAT
// ===============================================================
io.on('connection', (socket) => {

    // Handle user message from client to server
    socket.on("from user to server", (data) => {
        // Encrypt the message for database
        let encryptedMessage = {
            date: moment().format("DD/MM - hh:mm"),
            message: utility.encryptMessage(env, data.message),
            fromUser: true
        }

        User.findById(data.userId, (err, user) => {
            if(err){
                console.log("Error looking up user: ", err);
                throw err;
            } else {
                user.messages.push(encryptedMessage);
                
                user.save((err, updatedUser) => {
                    if(err){
                        console.log("Error in saving user: ", err);
                        throw err;
                    }
                });
            }
        });
        encryptedMessage.userId = data.userId;
        
        // Foward normal message to client
        let message = {
            date: moment().format("DD/MM - hh:mm"),
            message: data.message,
            fromUser: true
        }
        // Send user message from server to client
        socket.broadcast.emit('from server to admin', message);
    });

/*************************************************************************** */

    // Handle admin message from client to server
    socket.on("from admin to server", (data) => {
        // Encrypt the message for database
        let encryptedMessage = {
            date: moment().format("DD/MM - hh:mm"),
            message: utility.encryptMessage(env, data.message),
            fromUser: false
        }
        
        User.findById(data.userId, (err, user) => {
            if(err){
                console.log("Error looking up user: ", err);
                throw err;
            } else {
                user.messages.push(encryptedMessage);
                user.save((err, updatedUser) => {
                    if(err){
                        console.log("Error saving user: ", err);
                        throw err;
                    }
                });
            }
        });
        encryptedMessage.userId = data.userId;

        // Foward normal message to client
        let message = {
            date: moment().format("DD/MM - hh:mm"),
            message: data.message,
            fromUser: true
        }
        // Send admin message from server to client
        socket.broadcast.emit("from server to user", message);
    });

});

// ===============================================================
// SCHEDULE 
// ===============================================================

var j = schedule.scheduleJob('0 0 * * *', () => {
    User.find({}, (err, users) => {
        if(err){
            console.log("Error looking up users: ", err);
            throw err;
        }
        users.forEach((user) => {
            user.foodStats.mealPlan.caloriesToday = user.foodStats.mealPlan.totalCalories;
            user.foodStats.mealPlan.meals.forEach((meal) => {
                meal.isChecked = false;
            });
            user.save((err, updatedUsers) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
            });
        });
    });
});

// ===============================================================
// ROUTES 
// ===============================================================

// Root route
app.get('/', (req, res) => {
    res.render('login'); 
});

// Home
app.get('/home', middleware.isLoggedIn, (req, res) => {
    const user = req.user;
    if(req.user.isAdmin){
        res.redirect('/admin/dashboard');
    } else {
        const nextMeal = mealFactory.findNextMeal(user.foodStats.mealPlan.meals);
        const weather = userFactory.getWeather(User, user, env.googleMapsSecret, config, (weather) => {

            res.render('home', {
                user: user, 
                nextMeal: nextMeal, 
                currentWeather: weather.currently,
                weatherToday: weather.daily.data[0],
                weatherTomorrow: weather.daily.data[1]
            });
        });
    }
});

// Profile
app.get('/profile', middleware.isLoggedIn, (req, res) => {
    const user = req.user;
    res.render('profile', {user: user});
});

// ===============================================================
// USER - WORKOUT ROUTES
// ===============================================================

// Training program
app.get('/program', middleware.isLoggedIn, (req, res) => {
    const user = req.user;
    const today = utility.currentDayDK();
    workoutFactory.getWorkouts(Workout, (workouts) => {
        res.render('program', {user: user, today: today, workouts: workouts});
    });
});

app.post('/update/trainingpas/timesTrained/:increase', middleware.isLoggedIn, (req, res) => {
    const trainingPas = req.body.trainingPas;
    const increase = req.body.increase;

    userFactory.updateTimesTrained(User, req.user, trainingPas, increase, (updatedTimesTrained) => {
        res.json({"updatedTimesTrained": updatedTimesTrained})        
    });
});

// ===============================================================
// USER - MEAL ROUTES
// ===============================================================

// Meal plan
app.get('/meal-plan', middleware.isLoggedIn, (req, res) => {
    const user = req.user;
    const today = utility.currentDayDK();
    res.render('meal-plan', {user: user});
});

// Update Calories
app.post('/meal-plan/update/:userId/mealId/:mealId', middleware.isLoggedIn, async ( req , res ) => {
    userFactory.updateCalories(User, req.user, req.params.mealId, (newCaloriesToday) => {
        res.json({"newCalories": newCaloriesToday});
    });
});

// Inbox
app.get('/inbox', middleware.isLoggedIn, (req , res) => {
    const user = req.user;
    for(let i = 0; i < user.messages.length; i++){
        user.messages[i].message = utility.decryptMessage(env, user.messages[i].message);
    }
    res.render('inbox', {user: user});
});

// News
app.get('/news', middleware.isLoggedIn, (req, res) => {
    const user = req.user;
    News.find({}, (err, news) => {
        if(err){
            console.log("Error looking up news: ", err);
            throw err;
        }
        res.render('news', {user: user, news: news});
    });
});

// Update weight route
app.post('/update/weight', middleware.isLoggedIn, (req, res) => {
    const newWeight = req.body.weight;
    userFactory.updateWeight(newWeight, req.user, User);
    res.redirect('/home');
});

// ===============================================================
// Admin route
// ===============================================================

// Dashboard
app.get('/admin/dashboard/:sortBy?',  middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin) {
        userFactory.getUsers(User, (users) => {

            // Default sort to first name when loading page
            users.sort((a, b) => {
                if(a.firstName < b.firstName) return -1;
                if(a.firstName > b.firstName) return 1;
                return 0;
            });
    
            const sortBy = req.params.sortBy;
            let sorted = "Fornavn";
    
            if(sortBy === "firstName") {
                sorted = "Fornavn";
                users.sort((a, b) => {
                    if(a.firstName < b.firstName) return -1;
                    if(a.firstName > b.firstName) return 1;
                    return 0;
                });
            } else if(sortBy === "lastName") {
                sorted = "Efternavn";                
                users.sort((a, b) => {
                    if(a.lastName < b.lastName) return -1;
                    if(a.lastName > b.lastName) return 1;
                    return 0;
                }); 
            } else if(sortBy === "lastEdit") {
                sorted = "Sidst redigeret"                
                users.sort((a, b) => {
                    const bEdit = moment(b.lastEdit, "DD/MM - HH:mm").format("x");
                    const aEdit = moment(a.lastEdit, "DD/MM - HH:mm").format("x");
    
                    if(b.lastEdit !== "" || a.lastEdit !== "") {
                       return 1;
                    }
                    
                    return Number(bEdit) - Number(aEdit);
                });
            } else if(sortBy === "dateCreated") {
                sorted = "Nyeste";                
                users.sort((a, b) => {
                    return Number(b.dateCreated) - Number(a.dateCreated);
                });
            }
            
            // Filters enabled users
            const disabledUsers = users.filter((user) => {
                return user.isDisabled === true;
            });
    
            // Filters disabled users
            users = users.filter((user) => {
                return user.isDisabled === false;
            });
    
            // Pushing disabled users to enabled user-array
            // in order to get disabled users in bottom
            disabledUsers.forEach((user) => {
                users.push(user);
            });
    
            res.render('./admin/dashboard', {users: users, sorted: sorted });
        });
    } else {
        res.redirect('/home');
    }
});

// Individual user page
app.get('/admin/user/:userId', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin) {
        userFactory.getUser(User, req.params.userId, (user) => {
            workoutFactory.getWorkouts(Workout, (workouts) => {
                res.render('./admin/user-page/user', {
                    user: user, 
                    workouts: workouts, 
                    muscleGroups: workoutFactory.muscleGroups,
                    meals: mealFactory.meals
                });
            });
        });
    } else {
        res.redirect('home');
    }
});

// Chat page
app.get('/admin/user/:userId/chat', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin) {
        userFactory.getUser(User, req.params.userId, (user) => {
            for(let i = 0; i < user.messages.length; i++){
                user.messages[i].message = utility.decryptMessage(env, user.messages[i].message);
            }
            res.render('./admin/chat', {
                user: user
            });
        });
    } else {
        res.redirect('home');
    }
});

// News page
app.get('/admin/news', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin) {
        newsFactory.getAllNews(News, (news) => {
            res.render('./admin/news', {news: news});
        });
    } else {
        res.redirect('home');
    }
});

// Workout page
app.get('/admin/workouts', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin){
        workoutFactory.getWorkouts(Workout, (workouts) => {
            workouts.sort((a, b) => {
                if(a.name < b.name) return -1;
                if(a.name > b.name) return 1;
                return 0;
            });
            res.render('./admin/workouts', {workouts: workouts});
        }); 
    } else {
        res.redirect('home');
    }
});

// Update workout data 
app.post('/admin/workouts/update', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin){
        workoutFactory.getWorkout(Workout, req.body.name, (workout) => {
            workout.videoUrl = req.body.videoUrl;
            workout.description = req.body.description;
            workout.save((err) => {
                if (err){
                    req.flash("error_messages", "Øvelsen blev IKKE opdateret.");
                    throw err; 
                } else {
                    req.flash("success_messages", "Øvelsen er opdateret.");
                    res.redirect('/admin/workouts');
                }
            });
        });
    } else {
        res.redirect('home');
    }
});

// Add new workout 
app.post('/admin/workouts/create', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin){ 
        workoutFactory.createNewWorkout(Workout, req.body);
        req.flash("success_messages", "Øvelsen er oprettet.");
        res.redirect('/admin/workouts');
    } else {
        res.redirect('home');
    }
});

// Delete workout
app.get('/admin/workouts/delete/:id', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin){ 
        workoutFactory.deleteWorkout(Workout, req.params.id);
        req.flash("success_messages", "Øvelsen er slettet.");
        res.redirect('/admin/workouts');
    } else {
        res.redirect('home');
    }
});

// Update the users targetweight
app.post('/admin/user/:userId/update/weight', middleware.isLoggedIn, (req, res) => {
    if(req.user.isAdmin) {
        const newGoal = req.body.newGoal;
        
        userFactory.getUser(User, req.params.userId, (user) => {
            user.weightStats.targetWeight = newGoal;
            user.lastEdit = moment().format("DD/MM - HH:mm");
            
            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
                res.redirect('/admin/user/' + req.params.userId);
            });
        });
    } else {
        res.redirect('home');
    }
});

// ===============================================================
// Admin - Training
// ===============================================================

// Create new trainingPas
app.post('/admin/user/:userId/create/trainingpas', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        workoutFactory.addTrainingPas(User, req.params.userId, (msg) => {
            res.send(msg);
        });
    } else {
        res.redirect('home');
    }
});

// Create a new musclegroup in the specific trainingPas
app.post('/admin/user/:userId/create/musclegroup', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const formData = JSON.parse('{"' + decodeURI(req.body.formData.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}');
        workoutFactory.addMuscleGroup(User, req.params.userId, req.body.trainingPas, formData.muscleGroup, (msg) => {
            res.json(msg);
        });
    } else {
        res.redirect('home');
    }
});

// Create new workout
app.post('/admin/user/:userId/create/workout', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;
        const trainingPas = req.body.trainingPas;
        const muscleGroup = req.body.muscleGroupId;
        let formData = req.body.formData;
        
        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            } 
            
            const trainingPasIndex = user.trainingStats.trainingPases.findIndex(i => i.pasNumber === trainingPas);
            const muscleGroupIndex = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups.findIndex(i => i.name === muscleGroup);
    
            user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts.push(formData);
            user.lastEdit = moment().format("DD/MM - HH:mm");
        
            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
                res.json({"msg": "New workout was added"});
            });
        });
    } else {
        res.redirect('home');
    }
});

// Update Workout
app.post('/admin/user/:userId/update/workout/:workoutId', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;
        const trainingPas = req.body.trainingPas;
        const muscleGroup = req.body.muscleGroup;
        const workoutName = req.body.workoutName;
        const workoutId = req.body.workoutId;
        formData = JSON.parse('{"' + decodeURI(req.body.formData.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}');
        
        // Data to be returned to ajax call 
        returnData = {
            "newWorkoutName": formData.name,
            "newWorkoutReps": formData.reps,
            "newWorkoutSaet": formData.saet
        };
        
        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            } 
    
            const trainingPasIndex = user.trainingStats.trainingPases.findIndex(i => i.pasNumber === trainingPas);
            const muscleGroupIndex = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups.findIndex(i => i.name === muscleGroup);
            const workoutIndex = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts.findIndex(i => i.name === workoutName);
            
            // Makes sure the old data is returned if nothing was entered
            if(formData.name) {
                user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts[workoutIndex].name = formData.name;        
            } else {
                returnData.newWorkoutName =  user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts[workoutIndex].name;
            }
            if(formData.reps) {
                user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts[workoutIndex].reps = formData.reps;
            } else {
                returnData.newWorkoutReps = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts[workoutIndex].reps;
            }
            if(formData.saet) {
                user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts[workoutIndex].saet = formData.saet;        
            } else {
                returnData.newWorkoutSaet = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts[workoutIndex].saet;
            }
            
            user.lastEdit = moment().format("DD/MM - HH:mm");
            
            // Update new workout data
            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
                res.json(returnData);
            });
        });
    } else {
        res.redirect('home');
    }
});

// Delete single pas
app.post('/admin/user/:userId/delete/pas', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;

        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            } 
            
            const trainingPasIndex = user.trainingStats.trainingPases.findIndex(i => i.pasNumber === req.body.trainingPas);
            user.trainingStats.trainingPases.splice(trainingPasIndex, 1);
    
            // Makes sure that the passes above the deleted one gets updated their pasnumber
            for(let i = trainingPasIndex; i < user.trainingStats.trainingPases.length; i ++) {
                user.trainingStats.trainingPases[i].pasNumber = JSON.stringify(i +1);
            }
            user.lastEdit = moment().format("DD/MM - HH:mm");
            
            // Update new workout data
            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
                res.json({msg: "Pas was deleted"});
            });
        });
    } else {
        res.redirect('home');
    }
});

// Delete musclegroup in a pas
app.post('/admin/user/:userId/delete/musclegroup', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;
        const muscleGroup = req.body.muscleGroup;
        const trainingPas = req.body.trainingPas;
    
        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            } 
            
            const trainingPasIndex = user.trainingStats.trainingPases.findIndex(i => i.pasNumber === req.body.trainingPas);
            const muscleGroupIndex = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups.findIndex(i => i.name === muscleGroup);
    
            user.trainingStats.trainingPases[trainingPasIndex].muscleGroups.splice(muscleGroupIndex, 1);
            user.lastEdit = moment().format("DD/MM - HH:mm");
            
            // Update new workout data
            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
                res.json(
                    {
                        muscleGroup: muscleGroup,
                        trainingPas: trainingPas,
                        msg: muscleGroup + " was deleted successfully"
                    }
                );
            });
        });
    } else {
        res.redirect('home');
    }
});

// Delete a single workout
app.post('/admin/user/:userId/delete/workout', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;
        const trainingPas = req.body.trainingPas;
        const muscleGroup = req.body.muscleGroup;
        const workoutName = req.body.workoutName;
        
        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            } 
            
            const trainingPasIndex = user.trainingStats.trainingPases.findIndex(i => i.pasNumber === trainingPas);
            const muscleGroupIndex = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups.findIndex(i => i.name === muscleGroup);
            const workoutIndex = user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts.findIndex(i => i.name === workoutName);
    
            user.trainingStats.trainingPases[trainingPasIndex].muscleGroups[muscleGroupIndex].assignedWorkouts.splice(workoutIndex, 1);
            user.lastEdit = moment().format("DD/MM - HH:mm");
            
            // Update new workout data
            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                } 
                res.json({msg: "Deleted a single workout"});
            });
        });
    } else {
        res.redirect('home');
    }
});

// ===============================================================
// Admin - Meals
// ===============================================================

// Create meal
app.post('/admin/user/:userId/create/meal', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;
        const formData = JSON.parse('{"' + decodeURI(req.body.formData.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}');
        
        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            } 
            const newMealId = user.foodStats.mealPlan.meals.length + 1;
            const newMeal = {
                isChecked: false,
                id: newMealId,
                meal: formData.newMealName,
                name: "<indsæt navn>",
                details: "<indsæt detaljer>",
                description: "<indsæt beskrivelse>",
                calories: 0,
                carbohydrates: 0,
                fat: 0,
                protein: 0
            }
    
            user.foodStats.mealPlan.meals.push(newMeal);
            user.lastEdit = moment().format("DD/MM - HH:mm");

            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error looking up user: ", err);
                    throw err; 
                } 
                res.json({"msg": "Created new meal"});
            });
        });
    } else {
        res.redirect('home');
    }
});

// Update meal 
app.post('/admin/user/:userId/update/meal', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        mealFactory.updateMeal(User, req.params.userId, req.body.mealId, req.body.whatToUpdate, req.body.formData, () => {
            res.json({"msg": "Updated meal"});
        });        
    } else {
        res.redirect('home');
    }
});

// delete meal
app.post('/admin/user/:userId/delete/meal', middleware.isLoggedIn, async (req, res) => {
    if(req.user.isAdmin) {
        mealFactory.deleteMeal(User, req.params.userId, req.body.mealId, () => {
            res.json({msg: "Meal was deleted"});            
        });
    } else {
        res.redirect('home');
    }
});

// ===============================================================
// Admin - NEWS
// ===============================================================

// Create new news
app.post('/admin/news/create', (req, res) => {
    newsFactory.createNewNews(News, req.body, (status) => {
        if(status === "not created") {
            req.flash("error_messages", "Nyhed kunne ikke fjernes, prøv eventuelt igen.");
            res.redirect('/admin/news');
            return;
        } else {
            req.flash("success_messages", "Nyhed oprettet!");
            res.redirect('/admin/news');
        }
    });
});

// Delete specific news
app.post('/admin/news/delete/:newsId', (req, res) => {
    newsFactory.deleteNews(News, req.params.newsId, (status) => {
        if(status === "not deleted") {
            req.flash("error_messages", "Nyhed kunne ikke fjernes, prøv eventuelt igen.");
            res.redirect('/admin/news');
            return;
        } else {
            req.flash("success_messages", "Nyhed slettet!");
            res.redirect('/admin/news');
        }
    });
});

// ===============================================================
// ACTIVATE/DEACTIVATE A USER
// ===============================================================

app.post("/admin/user/:userId/update/isDisabled/:bool", (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;

        User.findById(userId, (err, user) => {
            if (err){
                console.log("Error looking up user: ", err);
                throw err;
            }
            user.isDisabled = req.params.bool;

            user.save((err, updatedUser) => {
                if (err){
                    console.log("Error saving user: ", err);
                    throw err; 
                }
                if(req.params.bool == 'false') {
                    req.flash("success_messages", "Brugeren er blevet aktiveret.");
                    res.redirect('/admin/user/' + userId);
                } else if(req.params.bool == 'true') {
                    req.flash("success_messages", "Brugeren er blevet deaktiveret.");
                    res.redirect('/admin/dashboard');
                }
            });
        });
    } else {
        res.redirect('home');
    }
});

// ===============================================================
// DELETE A USER
// ===============================================================

app.post('/admin/delete/:userId', (req, res) => {
    if(req.user.isAdmin) {
        const userId = req.params.userId;
        
        User.findByIdAndRemove(userId, (err, deletedUser) => {
            if(err){
                req.flash("error_messages", "Noget gik galt. Prøv eventuelt igen.");
                res.redirect('/admin/dashboard');
                return;
            } else {
                mailService.sendMail(deletedUser, env, "delete");
                req.flash("success_messages", "Brugeren er blevet slettet og bekræftelsesmail er afsendt til: " + deletedUser.username);
                res.redirect('/admin/dashboard');
            }
        });
    } else {
        res.redirect('home');
    }
});

// ===============================================================
// AUTHENTICATION ROUTES
// ===============================================================

// Register user
app.post('/admin/register', (req, res) => {
    User.register(new User(
        userFactory.newUser(req.body)
    ), 
        req.body.password, (err, user) => {
        if(err){
            req.flash("error_messages", "Brugeren eksisterer allerede!");
            res.redirect('/admin/dashboard');
            return;
        }
        mailService.sendMail(user, env, "welcome");
        req.flash("success_messages", "Ny bruger er oprettet og bekræftelses-mail er sendt til: " + user.username);
        res.redirect('/admin/dashboard');
    });
});

// ===============================================================
// LOGIN ROUTES
// ===============================================================

// Render login form
app.get('/login', (req, res) => {
    res.render('login');
});

// Login logic w. middleware
app.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login'
}), (req, res) => {

});

// Logout route
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success_messages', 'Du er blevet logget ud.');
    res.redirect('/');
});

// Server listening
server.listen(config.port, () => {
    console.log("Server listening on port " + config.port);
});