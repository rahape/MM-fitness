moment = require('moment');

module.exports = {
    getAllNews,
    createNewNews,
    deleteNews,
    createTestNews
}

// Get all news
function getAllNews(News, callback){
    News.find({}, (err, news) => {
        callback(news);
    });
}

function createNewNews(News, formData, callback) {
    const newNews = {
        title: formData.title,
        subdivision: formData.subdivision,
        content: formData.content,
        imageUrl: "",
        link: formData.link,
        linkText: formData.linkText,
        date: moment().format("DD/MM/YY")
    }
    News.create(newNews, (err) => {
        if(err){
            callback("not created")
        } else {
            callback("created");
        }
    });
}


function deleteNews(News, newsId, callback) {
    News.findByIdAndRemove(newsId, (err) => {
        if(err){
            callback("not deleted");
        } else {
            callback("deleted");
        }
    });
}

function createTestNews(News){
    News.create({
        title: "Overskrift på nyhed",
        subdivision: "Rubrik på nyhed",
        content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla hendrerit arcu sed fermentum tristique. Mauris fermentum vestibulum neque quis suscipit. Praesent non aliquam nibh. Integer consequat orci eget nunc consequat commodo. Mauris felis ipsum, interdum eget tristique sit amet, ornare sit amet tellus. Aenean non facilisis metus. Donec quis condimentum ante. Mauris nec dignissim ex, laoreet lobortis nunc. Pellentesque iaculis condimentum placerat. Aenean placerat lectus non lectus sollicitudin vestibulum.",
        imageUrl: "",
        link: "http://www.google.dk",
        linkText: "Google",
        date: "01-01-17"
    }),
    function(err, newNews){
        if(err){
            console.log(err);
        } else{
            console.log("News created: " + newNews);
            return newNews;
        }
    }
}

/* //news
        const titles = ["Nyt træningsprogram!", "Fedt event i weekenden", "Husk proteinpulver efter træning", "Husk gains", "Jeg har lige spist aftensmad!"];
        const subdivision = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
        const content = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla hendrerit arcu sed fermentum tristique. Mauris fermentum vestibulum neque quis suscipit. Praesent non aliquam nibh. Integer consequat orci eget nunc consequat commodo. Mauris felis ipsum, interdum eget tristique sit amet, ornare sit amet tellus. Aenean non facilisis metus. Donec quis condimentum ante. Mauris nec dignissim ex, laoreet lobortis nunc. Pellentesque iaculis condimentum placerat. Aenean placerat lectus non lectus sollicitudin vestibulum.";
        const imageUrl = "https://www.organicfacts.net/wp-content/uploads/2013/05/Vegetables4.jpg";
        const link = "http://www.google.dk";
        const linkText = "Google";
        
        const newsList = [];

        for(let i = 0; i < 5; i++){
            const news =
            {
                title: titles[utility.randomNumber(0, titles.length -1, 0)],
                subdivision: subdivision,
                content: content,
                imageUrl: imageUrl,
                link: link,
                linkText: linkText,
                date: utility.randomDate()
            }
            newsList.push(news);
        } */