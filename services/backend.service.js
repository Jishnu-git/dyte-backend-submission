"use strict"

const express = require("express");

module.exports = {
    name: "backend",
    settings: {
        port: process.env.PORT | 3000,
    },
    methods: {
        initializeRoutes() {
            console.log("Initializing routes...");
            this.app.post("/admin/register", this.registerURL);
            this.app.get("/admin/list", this.listAll);
            this.app.put("/admin/update", this.updateURL);
            this.app.delete("/admin/delete/:id", this.deleteURL);
            this.app.get("/ip/", this.triggerWebhooks);
        },

        registerURL(req, res) {
            return new Promise((resolve) => {
                const targetUrl = req.body.targetUrl;
                try {
                    const errorCheck = new URL(targetUrl);
                } catch (err) {
                    res.status(500).send(err.message);
                    throw err;
                }
                
                this.broker.call("webhooks.register", {targetUrl: targetUrl}).then((ID) => {
                    res.send(ID);
                    resolve();
                }).catch((err) => {
                    res.status(500).send(err.message);
                    throw err;
                })
            })
        },

        listAll(req, res) {
            return new Promise((resolve) => {
                this.broker.call("webhooks.list").then((webhooks) => {
                    res.json(webhooks);
                    resolve();
                }).catch((err) => {
                    res.status(500).send(err.message);
                    throw err;
                });
            });
        },

        updateURL(req, res) {
            return new Promise((resolve) => {
                const id = req.body.ID;
                const newTargetUrl = req.body.newTargetUrl;
                try {
                    const errorCheck = new URL(newTargetUrl);
                } catch (err) {
                    res.status(500).send(err.message);
                    throw err;
                }
                
                this.broker.call("webhooks.update", {id: id, newTargetUrl: newTargetUrl}).then(() => {
                    res.send();
                    resolve();
                }).catch((err) => {
                    res.status(500).send(err.message);
                    throw err;
                })
            });
        },

        deleteURL(req, res) {
            return new Promise((resolve) => {
                const id = req.params.id;
                this.broker.call("webhooks.delete", {id: id}).then(() => {
                    res.send();
                    resolve();
                }).catch((err) => {
                    res.status(500).send(err.message);
                    throw err;
                });
            })
            
        },

        triggerWebhooks(req, res) {
            return new Promise((resolve) => {
                const ipAddress = req.ip;
                this.broker.call("webhooks.trigger", {ipAddress: ipAddress}).then(() => {
                    res.send();
                    resolve();
                }).catch((err) => {
                    res.status(500).send(err.message);
                    throw err;
                });
            })
            
        }
    },

    created() {
        const app = express();
        app.use(express.json());
        app.use(express.urlencoded({extended: true}))
        app.listen(process.env.PORT | 3000, () => {
            console.log("server is listening...");
        })
        this.app = app;
        this.initializeRoutes();
    }
}