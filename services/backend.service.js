"use strict"

const express = require("express");

module.exports = {
    name: "backend",
    settings: {
        port: process.env.PORT | 3000,
    },
    methods: {
        //This method will be called once the service is created, this will bind the functions to the routes
        initializeRoutes() {
            console.log("Initializing routes...");
            this.app.post("/admin/register", this.registerURL);
            this.app.get("/admin/list", this.listAll);
            this.app.put("/admin/update", this.updateURL);
            this.app.delete("/admin/delete/:id", this.deleteURL);
            this.app.get("/ip", this.triggerWebhooks);
            
            //This is an extra method implemented for testing the trigger sent through /ip/ route
            this.app.post("/testing", this.testTrigger);
        },

        //Function to register a new url webhook
        async registerURL(req, res) {
            const targetUrl = req.body.targetUrl;
            try { //Check if sent string is a valid URL, if a URL object is trying to be created with an improper url string, it will raise an exception
                const errorCheck = new URL(targetUrl);
            } catch (err) { //Therefore, on an exception from this, we know the sent URL is not valid, report the same
                res.status(400).send(err.message); //Send the error message with a status of 400 - bad request
                return;
            }

            //Call the microservice action and send the ID returned as the response
            this.broker.call("webhooks.register", {targetUrl: targetUrl}).then((ID) => {
                res.send(ID);
            }).catch((err) => { //If we encounter a promise rejection due to an error at this stage, it is a server side error
                res.status(500).send(err.message); //Therefore, reject with code 500 - internal server error - and the error message
            })
        },

        //Function to list all the registered web hooks
        async listAll(req, res) {
            //Call the microservice action to get all the database entries and send them as a json object
            this.broker.call("webhooks.list").then((webhooks) => {
                res.json(webhooks);
            }).catch((err) => { //If we encountered a promise rejection due to an error, it is a server side error as this is a simple fethc operation
                res.status(500).send(err.message); //Therefore, reject with code 500 and the error message
            });
        },

        //Function to update a webhook with given ID to a new URL
        async updateURL(req, res) {
            const id = req.body.ID;
            const newTargetUrl = req.body.newTargetUrl;
            //Checking for the validity of the URL in the same way as registerURL function
            try {
                const errorCheck = new URL(newTargetUrl);
            } catch (err) {
                res.status(400).send(err.message);
                return;
            }
            
            //Call the microservice action to update the URL of the webhook with given ID
            this.broker.call("webhooks.update", {id: id, newTargetUrl: newTargetUrl}).then(() => {
                res.send();
            }).catch((err) => { //If we encountered an error, it could be one of two reasons
                if (err.message == "ID") { //First being an invalid ID being passed, for this a messaging indicating the same is send with the code 400
                    res.status(400).send("Invalid ID.")
                } else { //Second reson being an error in the database backend, this is reported with the http code 500
                    res.status(500).send(err.message);
                }
            })
        },

        //Function to delete a webhook with the given ID
        async deleteURL(req, res) {
            const id = req.params.id; //Fetch the ID from the URL parameter
            //Call the microservice action to remove the webhook with the given ID 
            this.broker.call("webhooks.delete", {id: id}).then(() => {
                res.send();
            }).catch((err) => { //Similar to update, a promise rejection can be caused by either an invalid ID or a server error
                if (err.message == "ID") { //If invalid ID, state the reason and return code 400
                    res.status(400).send("Invalid ID.")
                } else { //Otherwise return the error message with code 500
                    res.status(500).send(err.message);
                }
            });
        
        },

        //Function to call the trigger action
        async triggerWebhooks(req, res) {
            const ipAddress = req.ip; //Get the client's ip address
            //Call the microservice trigger action
            this.broker.call("webhooks.trigger", {ipAddress: ipAddress}).then(() => {
                res.send();
            }).catch((err) => { //Since exceptions caused by invalid or timed out requests are not being elevated to the top level, an exception here must be an unknown server error
                res.status(500).send(err.message); //Therefore, send the error message with the status 500
            });
        },

        //Simple test function which prints the rest body, can be used for testing the trigger functionality by creating a webhook for http://host.docker.internal:3001/testing
        async testTrigger(req, res) {
            console.log(req.body);
            res.json(req.body);
        }
    },

    //This method is called when the service is instantiated, create the express app and start it on the port
    created() {
        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({extended: true}))
        app.listen(process.env.PORT | 3000, () => {
            console.log("Server is listening...");
        })
        this.app = app;
        this.initializeRoutes();
    }
}