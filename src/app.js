const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require('express-session');
const connectDB = require('../src/db_connect/connect');
const { Registration, adminCollection } = require('../src/models/MongoSchema');

const multer = require('multer');

const app = express();
const port = process.env.PORT || 80;

app.listen(port, () => console.log(`Server is running at PORT: ${port}`));

connectDB();

const uploadDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ storage });

app.set("view engine", "hbs");
app.set('views', path.join(__dirname, '../src/public/views'));

app.use('/css', express.static(path.join(__dirname, '../src/public/views/css')));
app.use('/uploads', express.static(uploadDir));


//  parsing form data submitted via POST requests.
app.use(bodyParser.urlencoded({ extended: false }));


// parsing JSON data submitted via POST requests.
app.use(bodyParser.json());
// sets up session management for an Express.js application. It uses a secret string to sign session IDs for security, and it's configured not to save sessions unless they're modified (to save resources) and to save uninitialized sessions (for compliance).
app.use(session({ secret: 'srijita', resave: false, saveUninitialized: true }));




//  the authenticate middleware checks if the user is authenticated by
//  looking for the presence of a session object and an authenticated property within it.
//  If the user is authenticated,
//  it allows the request to continue to the next middleware.
//  Otherwise, it redirects the user to the root URL ("/").
const authenticate = (req, res, next) => req.session && req.session.authenticated ? next() : res.redirect("/");

app.get("/uploads/:filename", authenticate, (req, res) => {
    const fileName = req.params.filename;
    res.sendFile(path.join(uploadDir, fileName));
});

app.get("/", (req, res) => req.session && req.session.authenticated ? res.redirect("/admin") : res.render("login"));

app.get("/register", (req, res) => res.render("register"));

// app.get("/admin", authenticate, async (req, res) => {
//     try {
//         const users = await User.find({});
//         res.render("admin", { users });
//     } catch (error) {
//         res.status(500).send("Error fetching from DB");
//     }
// });

app.get("/admin",(req, res) => {
   res.render("adminLogin")
});

//admin login post

app.post("/adminlogin", async (req, res) => {
    const { username, password } = req.body;
    try {
        const adminExist = await adminCollection.findOne({ username: username });
        if (adminExist) {
            if (adminExist.password === password) {
                const allUserData = await Registration.find(); 
                res.status(200).render("admin", { users: allUserData });
              
            } else {
                res.status(401).send("Invalid password");
            }
        } else {
            res.status(404).send("Admin user not found");
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
});





app.post("/register", upload.single('profile_picture'), async (req, res) => {
    try {
        const newUser = new Registration({
            ...req.body,
            profile_picture: req.file ? `/uploads/${req.file.filename}` : '',
            declaration: req.body.declaration === 'true',
            timestamp: new Date()
        });

        const existingUser = await Registration.findOne({ email: newUser.email });
        if (existingUser) return res.send('User already exists. Please choose a different email.');

        await newUser.save();
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(400).send(error);
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await Registration.findOne({ email, password });

        if (!user) return res.send("User not found");
        if (password !== user.password) return res.send("Incorrect password");

        req.session.authenticated = true;
        console.log('user found');
        console.log(user.email);

        // res.redirect("/admin");
        // res.send("Reached");
        const users = [user]
        res.render('user', {users:user});
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("Error logging in");
    }
});

app.get("/update/:id", authenticate, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await Registration.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("update", { user });
    } catch (error) {
        console.error("Error rendering update form:", error);
        res.status(500).send("Error rendering update form");
    }
});

app.post("/update/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedUserData = req.body;

       await Registration.findByIdAndUpdate(userId, updatedUserData);
       const profileUser = await Registration.findOne({_id:userId})
        res.status(200).render("user",{users:profileUser})
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Error updating user");
    }
});

app.post('/logout', (req, res) => {
    res.render('login');
});
// rendering is when you collect information through a data set, while redirecting is when you send someone to a particular