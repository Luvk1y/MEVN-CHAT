const express = require("express");

const app = express();

const http = require("http").createServer(app);
const cors = require('cors')
const bodyParser = require('body-parser')


var mongodb = require("mongodb");

const MongoClient = mongodb.MongoClient;

const ObjectId = mongodb.ObjectId;

const port = (process.env.PORT || 3000);
app.use(cors())
app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());



// Add headers before the routes are defined
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader("Access-Control-Allow-Origin", "*")

    // Request methods you wish to allow
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE")

    // Request headers you wish to allow
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,content-type,Authorization")

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader("Access-Control-Allow-Credentials", true)

    // Pass to next layer of middleware
    next();
});

// module required for parsing FormData values
const expressFormidable = require("express-formidable")

// setting the middleware
app.use(expressFormidable());

// module required for encrypting the passwords
// and verify the password as well
const bcrypt = require("bcrypt");

// JWT used for authentication
const jwt = require("jsonwebtoken");

// secret JWT key
const jwtSecret = "jwtSecret1234567890";

//import auth
const auth = require("./modules/auth");

http.listen(port, function (){
    console.log("jia jia bwoy "+ port);

    MongoClient.connect("mongodb+srv://admin:admin@cluster0.hback0i.mongodb.net/test", function (error, client) {
        if (error) {
            console.error(error)
            return
        }
       

        // database name
        db = client.db("MEVN-CHAT")
        global.db = db
        console.log("Database connected")
        
        //API for fetching user data
        app.post("/getUser", auth, async function (request, result) {
            const user = request.user;
             console.log(user,'user')
            result.json({
                status: "success",
                message: "Data has been fetched.",
                user: user
            });
        });

        // route for login requests
        app.post("/login", async function (request, result) {

            // get values from login form
            const email = request.fields.email;
            const password = request.fields.password;

            // check if email exists
            const user = await db.collection("Users").findOne({
                "email": email
            });

            if (user == null) {
                result.json({
                    status: "error",
                    message: "Email does not exists."
                });
                return;
            }

            // check if password is correct
            bcrypt.compare(password, user.password, async function (error, isVerify) {
                if (isVerify) {

                    // generate JWT of user
                    const accessToken = jwt.sign({
                        "userId": user._id.toString()
                    }, jwtSecret);

                    // update JWT of user in database
                    await db.collection("Users").findOneAndUpdate({
                        "email": email
                    }, {
                        $set: {
                            "accessToken": accessToken
                        }
                    });

                    result.json({
                        status: "success",
                        message: "Login successfully.",
                        accessToken: accessToken
                    });

                    return;
                }

                result.json({
                    status: "error",
                    message: "Password is not correct."
                });
            });
        });

        app.post("/registration", async function (request, result) {
            const username = request.fields.username;
            const email = request.fields.email;
            const password = request.fields.password;
            const createdAt = new Date().getTime();
    
            if (!username || !email || !password) {
                result.json({
                    status: "error",
                    message: "Please enter all values."
                });
                return;
            }
    
            // check if email already exists
            var user = await db.collection("Users").findOne({
                email: email
            });
    
            if (user != null) {
                result.json({
                    status: "error",
                    message: "Email already exists."
                });
                return;
            }
    
            // encrypt the password
            bcrypt.hash(password, 10, async function (error, hash) {
    
                // insert in database
                await db.collection("Users").insertOne({
                    username: username,
                    email: email,
                    password: hash,
                    accessToken: "",
                    contacts: [],
                    notifications: [],
                    createdAt: createdAt
                });
    
                result.status(200).json({
                    status: "success",
                    message: "Account has been created. Please login now."
                });
            });
       });
    });
});

