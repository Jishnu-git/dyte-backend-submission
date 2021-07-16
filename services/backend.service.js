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

            this.app.post("/testing", this.testTrigger);
        },

        async registerURL(req, res) {
            const targetUrl = req.body.targetUrl;
            try {
                const errorCheck = new URL(targetUrl);
            } catch (err) {
                res.status(500).send(err.message);
                return;
            }
            
            this.broker.call("webhooks.register", {targetUrl: targetUrl}).then((ID) => {
                res.send(ID);
            }).catch((err) => {
                res.status(500).send(err.message);
            })
        },

        async listAll(req, res) {
            this.broker.call("webhooks.list").then((webhooks) => {
                res.json(webhooks);
            }).catch((err) => {
                res.status(500).send(err.message);
            });
        },

        async updateURL(req, res) {
            const id = req.body.ID;
            const newTargetUrl = req.body.newTargetUrl;
            try {
                const errorCheck = new URL(newTargetUrl);
            } catch (err) {
                res.status(500).send(err.message);
                return;
            }
            
            this.broker.call("webhooks.update", {id: id, newTargetUrl: newTargetUrl}).then(() => {
                res.send();
            }).catch((err) => {
                res.status(500).send(err.message);
            })
        },

        async deleteURL(req, res) {
            const id = req.params.id;
            this.broker.call("webhooks.delete", {id: id}).then(() => {
                res.send();
            }).catch((err) => {
                res.status(500).send(err.message);
            });
        
        },

        async triggerWebhooks(req, res) {
            const ipAddress = req.ip;
            this.broker.call("webhooks.trigger", {ipAddress: ipAddress}).then(() => {
                res.send();
            }).catch((err) => {
                res.status(500).send(err.message);
            });
        },

        async testTrigger(req, res) {
            console.log(req.body);
            res.json(req.body);
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