module.exports = function(){
    switch(process.env.NODE_ENV.trim()){
        case 'development':
            return {
                rasa_base_url: "http://localhost:5005/model/parse"
            };

        case 'production':
            return {
                rasa_base_url: "not defined yet"
            };

        default:
            return {

            };
    }
};