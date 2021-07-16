# dyte-backend-submission
A submission for Dyte placement task

---
## Running the project
#### 1. Without Docker
  * Start a MongoDB server locally at the port 27017
  * Run the following commands in the order
    * npm install
    * npm run start

#### 2. Using Docker
  * Verify docker is installed
  * Run the following commands in the order
    * docker-compose up
---

## Problem Statement
### Backend (Javascript/Typescript)
For this problem statement, you may use any database of your choice. You are allowed to use any library, but you must use the libraries that are specified in the problem.

The goal in this problem statement is to create a “webhooks microservice” using  Moleculer and a “backend” using Express with the following specifications:

#### 1. The backend should have the following routes:
  * A set of routes that lets an “admin” create, read, update, and delete webhooks. The routes should use actions defined in the “webhooks microservice” below (“register”, “list”, “update”, “delete”) to carry out the actual functionality and return the result of the action call appropriately as a response.  
  
  * A route called ‘/ip’, which calls the “trigger” action exposed by the “webhooks microservice”. The IP of the user visiting this route should be sent as a parameter to the action.
### 2. The “webhooks microservice” should have the following actions:
  * “webhooks.register”:  
    1. This accepts a single parameter called “targetUrl” (the URL to which the webhook be sent out).  

    2. The action should generate a unique ID for the webhook to be created and then save the ID and the “targetUrl” in the database.  

    3. This action should return the unique ID as a response.  
    
  * “webhooks.update”:
    1. This accepts two parameters, “id” and “newTargetUrl”.  

    2. The action should update the target endpoint of a webhook with the specified id to “newTargetUrl”.  
    
    3. Return a success response if the webhook was updated, otherwise, return an appropriate error response (if the webhook wasn't found).  
    
  * “webhooks.list”:
    1. This action takes no parameters.
    
    2. The action should query all registered webhooks from the database and return them as a response.

  * “webhooks.trigger”: 
    1. This accepts a single parameter called “ipAddress”.

    2. Upon calling this action, the list of target URLs for the webhooks is extracted from the database.
    
    3. An HTTP POST request is sent to each of these target URLs. The request body contains a JSON with the “ipAddress” and a UNIX timestamp of when the webhook was sent.
    
    4. The requests must be sent to all the target URLs in parallel. Since there might be a huge number of target URLs, you must limit the number of requests that happen concurrently. (E.G., If 200 requests are to be made, you can make the requests in 20 batches of 10 parallel requests)
### 3. Bonus: 
  * If a request to any target URL fails in the “webhooks.trigger” action (i.e. the response has a non 200 status code), the microservice should keep retrying the request until it succeeds (maximum of 5 retries).

  * Dockerize the backend and the moleculer microservice. You may or may not include a docker-compose.yml.





