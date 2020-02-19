let v8 = require('v8');


exports.handler = async (event, context, callback) => {
    try {
        //Elementos del handler:
        //- event:
        //- context:
        //- callback: llamada devuelta

        let itemNumber, maxWeight;

        var stressRequest = {
            "problem": "knapsack",
            "parameters": [
                {
                    "id": "itemNumber",
                    "value": event['queryStringParameters']['itemNumber']
                },
                {
                    "id": "maxWeight",
                    "value": event['queryStringParameters']['maxWeight']
                }
            ],
            "config": {
                "maxMemory": -1,
                "maxTime": -1
            }
        };


        var initialMemUsed = process.memoryUsage().heapUsed / 1024 / 1024;

        var totalBeginHR = process.hrtime();
        var totalBegin = totalBeginHR[0] * 1000000 + totalBeginHR[1] / 1000;

        var heapStats = v8.getHeapStatistics();

        // Round stats to MB
        var roundedHeapStats = Object.getOwnPropertyNames(heapStats).reduce(function (map, stat) {
            map[stat] = Math.round((heapStats[stat] / 1024 / 1024) * 1000) / 1000;
            return map;
        }, {});

        var stressResponse = {
            "problem": stressRequest.problem,
            "parameters": stressRequest.parameters,
            "config": {
                "maxMemory": -1,
                "maxTime": -1
            },
            "info": {
                "initialMemory": Math.round((initialMemUsed) * 1000) / 1000,
                "heapStats": roundedHeapStats
            },
            "result": {
                "stages": [{
                    "id": "problemGeneration",
                    "duration": -1,
                    "memory": -1
                },
                {
                    "id": "problemSolving",
                    "duration": -1,
                    "memory": -1
                }
                ],
                "total": {
                    "duration": -1,
                    "memory": -1
                }
            }
        };


        var parametersMap = stressRequest.parameters.reduce(function (map, obj) {
            map[obj.id] = obj.value;
            return map;
        }, {});

        var stagesMap = stressResponse.result.stages.reduce(function (map, obj) {
            map[obj.id] = {
                "duration": obj.duration,
                "memory": obj.memory
            };
            return map;
        }, {});

        itemNumber = parametersMap["itemNumber"];
        maxWeight = parametersMap["maxWeight"];


        ///////////////// GENERATION ///////////////////

        var beginHR = process.hrtime()
        var begin = beginHR[0] * 1000000 + beginHR[1] / 1000;

        //console.time(problem+"-"+phase+"-C"); 
        var ksProblem = ksProblemGeneration(itemNumber, maxWeight); /*******/
        //console.timeEnd(problem+"-"+phase+"-C"); 

        var endHR = process.hrtime()
        var end = endHR[0] * 1000000 + endHR[1] / 1000;
        var duration = (end - begin) / 1000;
        var roundedDuration = Math.round(duration * 1000) / 1000;


        stagesMap["problemGeneration"].duration = roundedDuration;

        /////////////////////////////////////////////////

        const genMemUsed = process.memoryUsage().heapUsed / 1024 / 1024;

        stagesMap["problemGeneration"].memory = Math.round((genMemUsed - initialMemUsed) * 1000) / 1000;

        ///////////////////// SOLVING /////////////////
        var phase = "solving";
        var beginHR = process.hrtime()
        var begin = beginHR[0] * 1000000 + beginHR[1] / 1000;

        var ksSolution = ksProblemSolving(ksProblem.size, ksProblem.items); /*******/

        var endHR = process.hrtime()
        var end = endHR[0] * 1000000 + endHR[1] / 1000;
        var duration = (end - begin) / 1000;
        var roundedDuration = Math.round(duration * 1000) / 1000;

        stagesMap["problemSolving"].duration = roundedDuration;

        var finalMemUsed = process.memoryUsage().heapUsed / 1024 / 1024;

        stagesMap["problemSolving"].memory = Math.round((finalMemUsed - genMemUsed) * 1000) / 1000;

        /////////////////////////////////////////////////

        var totalEndHR = process.hrtime()
        var totalEnd = totalEndHR[0] * 1000000 + totalEndHR[1] / 1000;
        var totalDuration = (totalEnd - totalBegin) / 1000;
        var roundedDuration = Math.round(totalDuration * 1000) / 1000;

        stressResponse.result.total.duration = roundedDuration;
        stressResponse.result.total.memory = Math.round((finalMemUsed - initialMemUsed) * 1000) / 1000;

        stressResponse.result.stages = Object.getOwnPropertyNames(stagesMap).map(stageId => {
            return {
                "id": stageId,
                "duration": stagesMap[stageId].duration,
                "memory": stagesMap[stageId].memory
            };
        });

        ksSolution = null;
        ksProblem = null;

        //Send callback
        console.log(stressResponse);
        callback(null, {
            statusCode: 201,
            body: JSON.stringify({
                stressResponse: stressResponse
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
        });

    } catch (err) {
        console.log(`EXECUTION FAILS, WITH ERROR: ${err}`);
        if (context) {
            errorResponse(err, context.awsRequestId, callback);
        } else {
            errorResponse(err, "null", callback);
        }
    }
}

function errorResponse(error, awsRequestId, callback) {
    callback(null, {
        statusCode: 500,
        body: JSON.stringify({
            errorMessage: error.message,
            errorCode: error.code || '-1',
            reference: awsRequestId,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
        },
    });
}


function ksProblemGeneration(itemNumber, maxWeight) {

    const NI = itemNumber || 100; // Number of Items
    const WMAX = maxWeight || 100; // Maximum weight

    var items = [];
    var totalItemsWeight = 0;

    for (var i = 0; i < NI; i++) {
        var item = {}
        var itemWeight = Math.floor((Math.random() * WMAX) + 1);
        var itemName = "item" + i;
        item[itemName] = itemWeight;
        totalItemsWeight += itemWeight;
        items.push(item);
    }
    return {
        items: items,
        size: totalItemsWeight / 2
    };

}


function ksProblemSolving(capacity, items) {

    var result = [],
        leftCap = capacity,
        itemsFiltered;

    if (typeof capacity !== 'number')
        return false;

    if (!items || !(items instanceof Array))
        return false;

    // Resolve
    var item,
        itemKey,
        itemVal,
        itemObj;

    itemsFiltered = items.filter(function (value) {
        itemVal = (typeof value === 'object') ? value[Object.keys(value)[0]] : null;
        if (!isNaN(itemVal) && itemVal > 0 && itemVal <= capacity) {
            return true;
        } else {
            return false;
        }
    });
    itemsFiltered.sort(function (a, b) {
        return a[Object.keys(a)[0]] < b[Object.keys(b)[0]];
    });

    for (item in itemsFiltered) {
        if (itemsFiltered.hasOwnProperty(item)) {
            itemKey = Object.keys(itemsFiltered[item])[0];
            itemVal = itemsFiltered[item][itemKey];

            if ((leftCap - itemVal) >= 0) {
                leftCap = leftCap - itemVal;

                itemObj = Object.create(null);
                itemObj[itemKey] = itemVal;
                result.push(itemObj);

                delete itemsFiltered[item];

                if (leftCap <= 0) break;
            }
        }
    }

    return result;
};