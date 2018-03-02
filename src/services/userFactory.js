const moment = require('moment'),
utility      = require('./utility.js'),
request      = require('request');

module.exports = {
    createNewUser,
    getUsers,
    getUser,
    testData,
    updateWeight,
    newUser,
    getWeather,
    updateTimesTrained,
    updateCalories
};

// Create new user
function createNewUser(user, User){
    User.create(user),
    function(err, newUser){
        if(err){
            console.log(err);
        } else{
            console.log("User created: " + newUser);
            return newUser;
        }
    }
}

// Get all users
function getUsers(User, callback) {
    User.find({}, (err, users) => {
        callback(users);
    });
}

// Get user
function getUser(User, userId, callback){
    User.findById(userId, (err, user) => {
        callback(user);
    });
}

// Find forecast for a user
function getWeather(User, user, googleSecret, config, callback) {
    const googleMapsBaseUrl = "https://maps.googleapis.com/maps/api/geocode/json?";
    const darkWeatherBaseUrl = "https://api.darksky.net/forecast/";

    let currentWeather = "";
    if(!user.longitude) {
        request(googleMapsBaseUrl + "address=" + user.address + "+" + user.zipcode + "+" + "Denmark" + "&key=" + googleSecret, function (error, response, body) {
            const result = JSON.parse(response.body);
            const latitude = result.results[0].geometry.location.lat;
            const longitude = result.results[0].geometry.location.lng;

            User.findById(user._id, function (err, user) {
                if (err) {
                    throw(err);
                }
                user.longitude = longitude;
                user.latitude = latitude;
        
                user.save(function (err, updatedUser) {
                    if (err){
                        throw(err); 
                    } 
                });
            });
            request(darkWeatherBaseUrl + config.service.darkSkyApi.apiSecret + "/" + latitude + "," + longitude + "/?units=si", function (error, response, body) {
                const result = JSON.parse(response.body);               
                callback(result);
            });
        });        
    } else {
        request(darkWeatherBaseUrl + config.service.darkSkyApi.apiSecret + "/" + user.latitude + "," + user.longitude + "/?units=si", function (error, response, body) {
            const result = JSON.parse(response.body);
            callback(result);
        });
    }
}

function updateCalories(User, user, mealId, callback) {
    const userId = user._id;
    
    User.findById(userId, function (err, user) {
        if (err) {
            throw(err);
        } 

        let meals = user.foodStats.mealPlan.meals;
        let mealCalories = 0;

        for(let i = 0; i < meals.length; i++){
            if(meals[i].id === mealId){
                mealCalories = meals[i].calories;
                meals[i].isChecked = true;
            }
        }

        const newCaloriesToday = user.foodStats.mealPlan.caloriesToday -= mealCalories;
        user.foodStats.mealPlan.caloriesToday = newCaloriesToday;

        // Update calories today
        user.save(function (err, updatedUser) {
            if (err){
                throw(err); 
            } 
            callback(newCaloriesToday);
        });
    });
}


// Update timesTrained
function updateTimesTrained(User, user, trainingPas, increase, callback) {
    User.findById(user._id, function (err, user) {
        if (err) {
            throw(err);
        } 

        const trainingPasIndex = user.trainingStats.trainingPases.findIndex(i => i.pasNumber === trainingPas);
        let updatedTimesTrained = 0;
        if(increase == "true") {
            user.trainingStats.trainingPases[trainingPasIndex].timesTrained ++;
            updatedTimesTrained = user.trainingStats.trainingPases[trainingPasIndex].timesTrained;            
        } else {
            user.trainingStats.trainingPases[trainingPasIndex].timesTrained --;
            updatedTimesTrained = user.trainingStats.trainingPases[trainingPasIndex].timesTrained;
        }
        
        // Update calories today
        user.save(function (err) {
            if (err){
                throw(err); 
            } 
            callback(updatedTimesTrained);
        });
    });
}

// Update weight
function updateWeight(weight, user, User){
    const userId = user._id;
    User.findById(userId, function (err, user) {
        if (err) {
            throw(err);
        } 
        
        // Create new weight
        user.weightStats.currentWeight = weight;
        const newWeight = {
            date: moment().format("DD/MM/YY"),
            weight: weight
        };
        user.weightStats.allWeights.push(newWeight);

        // Update weight progress
        user.weightStats.weightProgress = user.weightStats.allWeights[0].weight - weight;

        user.save(function (err, updatedUser) {
            if (err){
                throw(err); 
            } 
            return updatedUser;
        });
    });
}

function newUser(userData) {
    const newUser = {
        isDisabled: false,
        lastEdit: "",
        dateCreated: moment().format("x"),
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        password: "",
        address: userData.address,
        zipcode: userData.zipcode,
        town: userData.town,
        phone: userData.phone,
        avatarURL: "",
        weightStats: {
            currentWeight: 0,
            startWeight: 0,
            weightProgress: 0,
            targetWeight: 0,
            allWeights: []
        },
        trainingStats: {
        },
        foodStats: {
            mealPlan: {
                caloriesToday: 0,
                totalCalories: 0,
                totalCarbohydrates: 0,
                totalFat: 0,
                totalProtein: 0,
                meals: [],
            }
        },
        messages: []
    };
    if(userData.isAdmin) {
        newUser.isAdmin = userData.isAdmin;
    }
    return newUser;
}

// Function to make random users
function testData(User, amount) {
    
    User.remove( { firstName : { $ne: "tester" } } ).exec();
    
    for(let i = 0; i < amount; i++){
        
        // Create weight data
        const weights = [];

        for(let i = 0; i < 10; i++) {
            let weight = {
                date: utility.randomDate(),
                weight: utility.randomNumber(50,100, 1)
            }
            weights.push(weight);
        }

        const weightStats = {
            currentWeight: utility.randomNumber(50, 100, 1),
            startWeight: utility.randomNumber(50, 100, 1),
            targetWeight: utility.randomNumber(50, 100, 1),
            weightProgress: 0,
            allWeights: weights
        }
        
        weightStats.weightProgress = weightStats.startWeight - weightStats.currentWeight;


        // Create exercise data
        const muscleGroups = ["ben", "ryg", "biceps", "core", "skulder", "bryst", "triceps"];

        let trainingPases =[];
        for(let i = 0; i < 3; i++) {
            let trainingPas = {
                muscleGroups: [
                    {
                        name: muscleGroups[utility.randomNumber(0, muscleGroups.length -1)],
                        assignedWorkouts: createTestWorkouts()
                    },
                    {
                        name: muscleGroups[utility.randomNumber(0, muscleGroups.length -1)],
                        assignedWorkouts: createTestWorkouts()
                    },
                    {
                        name: muscleGroups[utility.randomNumber(0, muscleGroups.length -1)],
                        assignedWorkouts: createTestWorkouts()
                    }
                ],
                pasNumber: i + 1,
                timesTrained: utility.randomNumber(0, 3)
            }
            trainingPases.push(trainingPas);  
        }

        const trainingStats = {
            trainingPases: trainingPases
        }

        // Create food data
        const eatTimes = ["Morgenmad", "Mellemmåltid", "Frokost", "post-workout", "Aftensmad"];
        const foods = ["Havregryn", "Rugbrød"];
        const details = ["Easis müsli 140g", "to styk"];

        let meals = [];

        for(let i = 0; i < 5; i++) {
            const meal = {
                id: i + 1,
                isChecked: false,
                meal: eatTimes[i],
                name: foods[utility.randomNumber(0, foods.length -1, 0)],
                details: details[utility.randomNumber(0, details.length -1, 0)],
                description: "Husk og mos bananen",
                calories: utility.randomNumber(100, 500, 0),
                carbohydrates: utility.randomNumber(0, 30),
                fat: utility.randomNumber(0, 30),
                protein: utility.randomNumber(0, 30)
            }
            meals.push(meal);
        }

        let totalCalories = 0;
        let totalCarbohydrates = 0;
        let totalFat = 0;
        let totalProtein = 0;

        meals.forEach((meal) => {
            totalCalories += Number(meal.calories);
            totalCarbohydrates += Number(meal.carbohydrates);
            totalFat += Number(meal.fat);
            totalProtein += Number(meal.protein);
        })

        const mealPlan = {
            caloriesToday: totalCalories,
            totalCalories: totalCalories,
            totalCarbohydrates: totalCarbohydrates,
            totalFat: totalFat,
            totalProtein: totalProtein,
            meals: meals
        };

        const foodStats = {
            mealPlan: mealPlan
        }


        // Create message data
        const messageData = [
            "Hej Mikael, har du sovet godt?",
            "Skal du træne i dag, Jens?",
            "Husk at spis godt med proteiner i dag ven",
            "Voldemort did nothing wrong!",
            "Leave Britney alone!",
            "Never trust a fart - Mahatma Gandhi 2017",
            "Godmorgen chef",
            "Hvor ser du godt ud i dag, har du trænet?",
            "Husk vitaminpiller, det er godt for leveren",
            ";-) ;-* kys tihi f9ser"
        ];

        const trueOrFalse = [true, false];

        const messages = [];

        for(let i = 0; i < 5; i++) {
            const message = {
                    date: utility.randomDate(),
                    message: messageData[utility.randomNumber(0, messageData.length -1, 0)],
                    fromUser: trueOrFalse[utility.randomNumber(0,1,0)]
            }
            messages.push(message);
        }
        

        // User meta data
        const firstNames = ["Jens", "Brian", "Søren", "Ole", "Denise", "Maibrit", "Marc", "Jonas"];
        const lastNames = ["Pedersen", "Hansen", "Jensen", "Mogensen", "Erhardtsen", "Sørensen", "Bolvig", "Larmann"];
        const usernames = ["foo@bar.dk", "test@test.dk"];
        const password = "12345";
        const avatarURL = "http://www.qygjxz.com/data/out/190/5691490-profile-pictures.png";
        
        // Create the actual user from above data

        let newUser = {
            isDisabled: false,
            username: usernames[utility.randomNumber(0, usernames.length -1, 0)],
            firstName: firstNames[utility.randomNumber(0, firstNames.length -1, 0)],
            lastName: lastNames[utility.randomNumber(0, lastNames.length -1, 0)],
            password: password,
            address: "Hovedgaden 12",
            zipcode: 2860,
            town: "Søborg",
            phone: "88888888",
            avatarURL: avatarURL,
            weightStats: weightStats,
            trainingStats: trainingStats,
            foodStats: foodStats,
            messages: [],
            lastEdit: "",
            dateCreated: moment().format("x")
        }
    

        createNewUser(newUser, User);
        
        if(i === 0) {
            
            // Test admin user
            User.findOneAndUpdate({ username: "admin" }, { $set: { 
                isAdmin: true,
                firstName: "tester",
                lastName: "McTestersen",
                trainingStats: newUser.trainingStats,
                weightStats: newUser.weightStats,
                foodStats: newUser.foodStats,
                messages: newUser.messages
            } }, { new: true }, function(err, doc) {
                // console.log(doc);
            });

            // Test normal user
            User.findOneAndUpdate({ username: "2" }, { $set: { 
                firstName: "tester",
                lastName: "McTestersen",
                trainingStats: newUser.trainingStats,
                weightStats: newUser.weightStats,
                foodStats: newUser.foodStats,
                messages: newUser.messages
            } }, { new: true }, function(err, doc) {
                // console.log(doc);
            });

            User.findOneAndUpdate({ username: "testbruger" }, { $set: { 
                firstName: "tester",
                lastName: "McTestersen",
                trainingStats: newUser.trainingStats,
                weightStats: newUser.weightStats,
                foodStats: newUser.foodStats,
                messages: newUser.messages
            } }, { new: true }, function(err, doc) {
                // console.log(doc);
            });
        }
    }
}

// Helper function because too many nested objects and arrays in trainingStats
function createTestWorkouts() {
    const exercises = ["squats", "bench press", "deadlift", "biceps curls", "shoulder press", "sit ups", "punch press", "flyes", "incline cable flyes", "incline lateral raises", "triceps extensions", "lat pull", "seated row", "leg extension", "leg curls", "calf raises", "cable crunches"];
    
    let assignedWorkouts = [];
    for(let i = 0; i < 5; i++){
        const workOut = 
            {
                name: exercises[utility.randomNumber(0, exercises.length -1, 0)],
                saet: utility.randomNumber(3, 5, 0),
                reps: utility.randomNumber(10, 20, 0),
                startWorkLoad: utility.randomNumber(10, 30, 0),
                currentWorkLoad: utility.randomNumber(25, 40, 0),
                WorkLoadProgress: utility.randomNumber(1, 5, 0),
                workLoad: utility.randomNumber(10, 30, 0)
            }
        assignedWorkouts.push(workOut);
    }
    return assignedWorkouts;
}