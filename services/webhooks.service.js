"use strict"

//Mongoose for MongoDB database manipulation
const mongoose = require('mongoose');
//Import and instantiate the webhook model created
require("../models/webhook.model");
const WebhookModel = mongoose.model("webhook");

//For creating UUID tokens associated with the webhooks
const {v4 : generateUUID} = require("uuid");

//For sending POST request in the trigger action
const superagent = require("superagent");

module.exports = {
    name: "webhooks",
    actions: {
        //Action for registering a new webhook
        register: {
            params: { //Expects a single string parameter named targetUrl
                targetUrl: "string"
            },
            handler(ctx) {
                return new Promise((resolve) => {
                    const ID = generateUUID() //Create a UUID
                    const newWebhook = new WebhookModel({ //Create a model instance with the created ID and target URL
                        ID: ID,
                        targetUrl: ctx.params.targetUrl
                    });
    
                    newWebhook.save().then(() => { //Save the instance by writing to the database
                        resolve(ID); //and return the generated ID for this webhook
                    }).catch((err) => { //If any sql error occured, elevate it to the higher level
                        if (err) {
                            throw err;
                        }
                    }); 
                });
            }
        },

        //Action for updating an existing webhook of given ID with the new target URL
        update: {
            params: { //Expects two parameters id and newTargetUrl of type string
                id: "string",
                newTargetUrl: "string"
            },
            handler(ctx) {
                return new Promise((resolve, reject) => {
                    //Call the update function to update the target URL of the given ID
                    WebhookModel.updateOne(
                        { ID: ctx.params.id }, 
                        { targetUrl: ctx.params.newTargetUrl }
                    ).then((res) => { //MongoDB does not throw an error even if no record with the given ID exists
                        if (res.nModified != 0) { //Therefore, check if the number of records modified is non zero
                            resolve(); //Return success if it is
                        } else {
                            reject("ID"); //Otherwise, reject with the message as 'ID', this will allow this error to be handled separately from the place this action is called
                        }
                    }).catch((err) => { //If an error is thrown, it is a server error, simply raise it to the higher level
                        if (err) {
                            throw err;
                        }
                    });
                });
            }
        },

        //Action to retrieve all the created webhooks
        list(ctx) {
            return new Promise((resolve) => {
                //Calling the find function with no filter retrieves all the data in the database
                WebhookModel.find().then((webhooks) => {
                    resolve(webhooks);
                }).catch((err) => { //If an error is encountered, raise it to the higher level
                    if (err) {
                        throw err;
                    }
                });
            })
        },

        //Action to send a post request parallely in batches with content as the ip address
        trigger: {
            params: { //The ip address of the client is the single parameter of type string
                ipAddress: "string"
            },
            handler(ctx) {
                return new Promise((resolve) => {
                    //Firstly, fetch all the webhooks
                    WebhookModel.find().then((webhooks) => {
                        //Next we divide them into 10 batches
                        const batchSize = Math.ceil(webhooks.length / 10);
                        let start = 0;
                        while (start < webhooks.length) {
                            const webhooksPartition = webhooks.slice(start, start + batchSize);
                            this.sendPostReq(webhooksPartition, ctx.params.ipAddress); //Call the helper method to send post requests for these 10 batches of webhook targets
                            start += batchSize; //Increment the batch starting by the batch size
                        } //This loop will run until start exceeds the total number of webhooks registered
                        //Note that since sendPostReq is an asynchronous function, the server does not wait for each batch to be completed, and all the 10 batches will be sent out in parallel - this limits the number of parallel requests to 10
                        resolve();
                    }).catch((err) => { //If some error is encountered, it will not be from the post requests as those exceptions are not elevated
                        throw err; //Therefore, it must be an unknown server error, raise it to the higher level
                    })
                })
            }
        },

        //Action to delete a webhook with the given ID
        delete: {
            params: { //Expects a single string parameter containing the ID of the webhook
                id: "string"
            },
            handler(ctx) {
                return new Promise((resolve, reject) => {
                    //Call the delete function to delete the webhook with the given ID
                    WebhookModel.deleteOne(
                        { ID: ctx.params.id }
                    ).then((res) => { //Similar to the update function, MongoDB does not raise an error if no records with the given ID is found
                        if (res.deletedCount != 0) { //So, manually check to see if a matching record was found by analyzinng the delete count
                            resolve();
                        } else { //If the delete count is zero, then the supplied ID was invalid
                            reject("ID"); //Reject with the reason as ID, this will once again allow this error to be handled separately from the calling location
                        }
                    }).catch((err) => { //If any other error is thrown, it is not an expected one, raise it to the higher level
                        if (err) {
                            throw err;
                        }
                    });
                })
            }
        }
    },
    methods: {
        //Helper function for sending post request to a given list of webhooks with the supplied ip address as the body
        async sendPostReq(webhooks, ipAddress) {
            //Iterate over all the webhooks in the list, which can be atmost 20 webhooks
            for (const webhook of webhooks) {
                //Call the helper function to post the ip address along with the unix time to each webhook's target URL
                await this.tryPost(webhook.targetUrl, ipAddress, 0);
                //This helper function is asynchronous, so this function will keep iterating over the webhooks without waiting for the previous one to finish
                //This would change our maximum concurrent requests from being 10, so we await the result of the function and make it a synchronous call
            }
        },

        //Helper function for sending post request to a single URL with the given ip address and the unix time as body
        async tryPost(url, ipAddress, tries) { //This function will retry the request up to 5 times upon failing
            if (tries < 5) { //If the number of tries have already been 5, then don't do anything, otherwise continue
                const timeStamp = Math.round((new Date()).getTime() / 1000); //Get the unix time - getTime function returns in milliseconds, divide it by 1000 and round it to get unix time
                superagent
                    .post(url) //POST to the URL
                    .set("Content-Type", "application/json") //With JSON content in the body
                    .send({ //Content of the body is ip address and the unix time stamp
                        ipAddress: ipAddress,
                        timeStamp: timeStamp
                    })
                    .then((res) => {
                        if (res.status != 200) { //Check the status code of a successful response, if it is not 200 then call this function recursively after 100ms
                            console.log(`${url} has failed ${tries + 1} times`)
                            setTimeout(() => {
                                this.tryPost(url, ipAddress, tries + 1); //The number of tries being passed to the recrusive call is incremented by 1
                            }, 100);
                        }
                    }, (err) => {
                        if (err) { //If the request was not successful, then dp the same as before - recursively call the function after a 100ms delay
                            console.log(`${url} has failed ${tries + 1} times`)
                            setTimeout(() => {
                                this.tryPost(url, ipAddress, tries + 1);
                            }, 100);
                        }
                    });
            }
        }
    },
    //This method is called when the service is instantiated, connect to the database in this method 
    created() {
        var dbname = process.env.DBNAME;
        if (!dbname) dbname = "localhost";
        mongoose.connect(`mongodb://${dbname}:${process.env.PORT | 27017}/webhookdb`, { useNewUrlParser: true }, (err) => {
            if (err) {
                console.log(err);
            }
        });
        mongoose.connection.once("open", () => {
            console.log("Database connected");
        })
    }
}
