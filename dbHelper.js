const AWS = require("aws-sdk");
AWS.config.update({region: "us-east-1"});
const questionsTableName = "QuestionsData";
const usersTableName = "Users";
const docClient = new AWS.DynamoDB.DocumentClient();

class dbHelper {
    constructor() { }
    getQuestions(levelNumber, questionID) {
        return new Promise((resolve, reject) => {
            const params = {
                TableName: questionsTableName,
                KeyConditionExpression: "#Level = :levelNumber and #ID > :questionID",
                ExpressionAttributeNames: {
                    "#Level": "Level",
                    "#ID": "ID"
                },
                ExpressionAttributeValues: {
                    ":levelNumber": levelNumber,
                    ":questionID": questionID
                }
            };
            docClient.query(params, (err, data) => {
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                    return reject(JSON.stringify(err, null, 2));
                }
                console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                resolve(data.Items);
            });
        });
    }

    AuthenticateUser(userID) {
        return new Promise((resolve, reject) => {
            const params = {
                TableName: usersTableName,
                KeyConditionExpression: "#UserID = :userID",
                ExpressionAttributeNames: {
                    "#UserID": "UserID"
                },
                ExpressionAttributeValues: {
                    ":userID": userID
                }
            };
            docClient.query(params, (err, data) => {
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                    return reject(JSON.stringify(err, null, 2));
                }
                console.log("Get User succeeded:", JSON.stringify(data, null, 2));
                if (data.Items.length === 0) {
                    const insertParams = {
                        TableName: usersTableName,
                        Item: {
                            "UserID" : userID,
                            "Level" : 1,
                            "Points" : 0,
                            "QuestionCounter" : 0,
                        }
                    };
                    docClient.put(insertParams, (err, data) => {
                        if (err) {
                            console.log("Unable to insert =>", JSON.stringify(err))
                            return reject("Unable to insert");
                        }
                        console.log("Saved Data, ", JSON.stringify(data));
                        resolve({
                            status: 404,
                        });
                    });
                } else {
                    resolve({
                        data: data.Items,
                        status: 200,
                    });   
                }
            });
        });
    }

    updateUserScore(userID, level, points, questionCounter) {
        return new Promise((resolve, reject) => {
            const params = {
                TableName: usersTableName,
                Item: {
                    "UserID" : userID,
                    "Level" : level,
                    "Points" : points,
                    "QuestionCounter" : questionCounter,
                }
            };
            docClient.put(params, (err, data) => {
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                    return reject(JSON.stringify(err, null, 2));
                }
                console.log("Saved Data, ", JSON.stringify(data));
                resolve({
                    status: 404,
                });
            });
        });
    }
}

module.exports = new dbHelper();
