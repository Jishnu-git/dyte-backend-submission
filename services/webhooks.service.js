"use strict"

const mongoose = require('mongoose');
require("../models/webhook.model");
const WebhookModel = mongoose.model("webhook");

const {v4 : generateUUID} = require("uuid");

const superagent = require("superagent");

module.exports = {
    name: "webhooks",
    actions: {
        register: {
            params: {
                targetUrl: "string"
            },
            handler(ctx) {
                return new Promise((resolve) => {
                    const ID = generateUUID()
                    const newWebhook = new WebhookModel({
                        ID: ID,
                        targetUrl: ctx.params.targetUrl
                    });
    
                    newWebhook.save().then(() => {
                        resolve(ID);
                    }).catch((err) => {
                        if (err) {
                            throw err;
                        }
                    }); 
                });
            }
        },

        update: {
            params: {
                id: "string",
                newTargetUrl: "string"
            },
            handler(ctx) {
                return new Promise((resolve) => {
                    WebhookModel.updateOne(
                        { ID: ctx.params.id }, 
                        { targetUrl: ctx.params.newTargetUrl }
                    ).then(() => {
                        resolve();
                    }).catch((err) => {
                        if (err) {
                            throw err;
                        }
                    });
                });
            }
        },

        list(ctx) {
            return new Promise((resolve) => {
                WebhookModel.find().then((webhooks) => {
                    resolve(webhooks);
                }).catch((err) => {
                    if (err) {
                        throw err;
                    }
                });
            })
        },

        trigger: {
            params: {
                ipAddress: "string"
            },
            handler(ctx) {
                return new Promise((resolve) => {
                    WebhookModel.find().then((webhooks) => {
                        let start = 0;
                        while (start < webhooks.length) {
                            const webhooksPartition = webhooks.slice(start, start + 20);
                            this.sendPostReq(webhooksPartition, ctx.params.ipAddress);
                            start += 20;
                        }
                        resolve();
                    }).catch((err) => {
                        throw err;
                    })
                })
            }
        },

        delete: {
            params: {
                id: "string"
            },
            handler(ctx) {
                return new Promise((resolve, reject) => {
                    WebhookModel.deleteOne(
                        { ID: ctx.params.id }
                    ).then((res) => {
                        if (res.deletedCount != 0) {
                            resolve();
                        } else {
                            reject("ID does not exist.");
                        }
                        
                    }).catch((err) => {
                        if (err) {
                            throw err;
                        }
                    });
                })
            }
        }
    },
    methods: {
        async sendPostReq(webhooks, ipAddress) {
            for (const webhook of webhooks) {
                this.tryPost(webhook.targetUrl, ipAddress, 0);
            }
        },

        async tryPost(url, ipAddress, tries) {
            if (tries < 5) {
                const timeStamp = Math.round((new Date()).getTime() / 1000);
                superagent
                    .post(url)
                    .set("Content-Type", "application/json")
                    .send({
                        ipAddress: ipAddress,
                        timeStamp: timeStamp
                    })
                    .then((res) => {
                        if (res.status != 200) {
                            setTimeout(() => {
                                this.tryPost(url, ipAddress, tries + 1);
                            }, 100);
                        }
                    }, (err) => {
                        if (err) {
                            console.log(`${url} has failed ${tries + 1} times`)
                            setTimeout(() => {
                                this.tryPost(url, ipAddress, tries + 1);
                            }, 100);
                        }
                    });
            }
        }
    },
    created() {
        mongoose.connect(`mongodb://mongodb:${process.env.PORT}/webhookdb`, { useNewUrlParser: true }, (err) => {
            if (err) {
                console.log(err);
                console.log(`mongodb://mongodb:${process.env.PORT}/webhookdb`);
            }
        });
        mongoose.connection.once("open", () => {
            console.log("Database connected");
        })
    }
}
