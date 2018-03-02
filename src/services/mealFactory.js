moment = require('moment');

module.exports = {
    findNextMeal,
    updateMeal,
    deleteMeal,
    meals:  ["morgenmad", "hovedmåltid", "snack", "pre-workout", "post-workout", "natmad"]
}

function updateMeal(User, userId, mealId, whatToUpdate, updateData, callback) {
    
        const formData = JSON.parse('{"' + decodeURI(updateData.replace(/&/g, "\",\"").replace(/=/g,"\":\"")) + '"}');
        
        
        User.findById(userId, function (err, user) {
            if (err) {
                throw(err);
            }
            
            const mealIndex = user.foodStats.mealPlan.meals.findIndex(i => i.id === mealId);
    
            if(whatToUpdate === "name") {
                user.foodStats.mealPlan.meals[mealIndex].name = formData.name;
            } else if(whatToUpdate === "details") {
                user.foodStats.mealPlan.meals[mealIndex].details = formData.details;
            } else if(whatToUpdate === "description") {
                user.foodStats.mealPlan.meals[mealIndex].description = formData.description;
            } else if(whatToUpdate === 'calories'){
                user.foodStats.mealPlan.meals[mealIndex].calories = formData.calories;
                let newTotalCalories = 0;
                user.foodStats.mealPlan.meals.forEach((meal) => {
                   newTotalCalories += meal.calories; 
                });
                user.foodStats.mealPlan.totalCalories = newTotalCalories;
            } else if(whatToUpdate === 'carbs') {
                user.foodStats.mealPlan.meals[mealIndex].carbohydrates = formData.carbs;
                let newTotalCarbohydrates = 0;
                user.foodStats.mealPlan.meals.forEach((meal) => {
                    newTotalCarbohydrates += meal.carbohydrates; 
                });
                user.foodStats.mealPlan.totalCarbohydrates = newTotalCarbohydrates;
            } else if(whatToUpdate === 'fat'){
                user.foodStats.mealPlan.meals[mealIndex].fat = formData.fat;
                let newTotalFat = 0;
                user.foodStats.mealPlan.meals.forEach((meal) => {
                    newTotalFat += meal.fat; 
                });
                user.foodStats.mealPlan.totalFat = newTotalFat;
            } else if(whatToUpdate === 'protein'){
                user.foodStats.mealPlan.meals[mealIndex].protein = formData.protein;
                let newTotalProtein = 0;
                user.foodStats.mealPlan.meals.forEach((meal) => {
                    newTotalProtein += meal.protein; 
                });
                user.foodStats.mealPlan.totalProtein = newTotalProtein;
            }

            user.lastEdit = moment().format("DD/MM - HH:mm");
    
            user.save(function (err, updatedUser) {
                if (err){
                    throw(err); 
                } 
                callback();
            });
        });
}

function deleteMeal(User, userId, mealId, callback) {

    User.findById(userId, function (err, user) {
        if (err) {
            throw(err);
        } 
        let mealPlan = user.foodStats.mealPlan;
        // Getting meal-index
        const mealIndex = mealPlan.meals.findIndex(i => i.id === mealId);
        // Updating values
        const newTotalCalories = mealPlan.totalCalories - mealPlan.meals[mealIndex].calories;
        mealPlan.totalCalories = newTotalCalories;
        const newTotalCarbohydrates = mealPlan.totalCarbohydrates - mealPlan.meals[mealIndex].carbohydrates;
        mealPlan.totalCarbohydrates = newTotalCarbohydrates;
        const newTotalProtein = mealPlan.totalProtein - mealPlan.meals[mealIndex].protein;
        mealPlan.totalProtein = newTotalProtein;
        const newTotalFat = mealPlan.totalFat - mealPlan.meals[mealIndex].fat;
        mealPlan.totalFat = newTotalFat;
        mealPlan.meals.splice(mealIndex, 1);

        for(let i = mealIndex; i < mealPlan.meals.length; i ++) {
            mealPlan.meals[i].id = JSON.stringify(i + 1);
        }

        user.lastEdit = moment().format("DD/MM - HH:mm");            

        user.save(function (err, updatedUser) {
            if (err){
                throw(err); 
            } 
            callback();
        });
    });
}


function findNextMeal(mealList) {
    let nextMeal = {};
    for(let i = 0; i < mealList.length; i++){
        if(mealList[i].isChecked === false){
            nextMeal = mealList[i];
            break;
        } else {
            nextMeal = {};
        }
    }
    return nextMeal;
}

// Vi skal lave funktioner som skal opdatere, oprette og slette måltider. 
// Selvom de ikke virker skal de være der da vi nok har planlagt i modeller og planlægning af program