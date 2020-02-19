var main = require('../index');

var event = {

    queryStringParameters: {
        itemNumber : 1000,
        maxWeight: 100
    }

};
main.handler(event,null,console.log);