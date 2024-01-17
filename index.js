const express = require('express');
const jwt = require('jsonwebtoken');

const mongoose = require('mongoose')

const app = express();
require('dotenv').config();


const SECRETA = process.env.SECRETA;
const SECRETU = process.env.SECRETU;
const dbUrl = process.env.DATABASE_URL;
const PORT = process.env.PORT;
app.use(express.json())

const userSchema = new mongoose.Schema({
    username: {type: String},
    password: String,
    purchasedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
})
const adminSchema = new mongoose.Schema({
    username: String,
    password: String
  });
  
const courseSchema = new mongoose.Schema({
    title: String,
    description: String,
    price: Number,
    imageLink: String,
    published: Boolean
  });

// Define mongoose models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Course = mongoose.model('Course', courseSchema);


mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true, dbName: "courses" });
// const adminExists = (admin)=>{
//     return admins.some(a=> a.username === admin.username);
// }

const getTokenForAdmin = (admin)=>{
    const payload = {username : admin.username,};
    return jwt.sign(payload, SECRETA, {expiresIn : '1h'});
}
const adminAuth = (req, res, next)=>{
    const authHeader = req.headers.authorization;
    if(authHeader){
        let token = authHeader.split(' ')[1];
        jwt.verify(token, SECRETA, (err, admin)=>{
            if(err){
                return res.status(403).json({error: "Not authorised"})
            }
            req.admin = admin;
            next();
        })
    }else{
        res.status(401).json({error: "Not Authorised"})
    }
    
}

const getTokenForUser =(user)=>{
    const payload = {username : user.username, };
    return jwt.sign(payload, SECRETU, {expiresIn: '1h'});
}
const userAuth = (req, res, next)=>{
    const authHeader = req.headers.authorization;

    if(authHeader){
        let token = authHeader.split(' ')[1];
        jwt.verify(token, SECRETU, (err, user)=>{
            if(err){
                return res.status(403).json({error: "Not authorised"})
            }
            req.user = user;
            return next();
        }) 
    }else{
        return res.status(401).json({error: "Not Authorised"})
    }
}
//admin signup route
app.post('/admin/signup', (req, res) => {
    try {
        const {username, password} = req.body;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        Admin.findOne({username})
        .then((admin)=>{

            console.log(admin);
            if(admin){
                return res.status(409).json({error:"Admin already exists."});
            }else{
                const adminObj = {username: username, password: password};
                const newAdmin = new Admin(adminObj);
                newAdmin.save();
                const token = getTokenForAdmin({username});
                res.status(201).json({messege: "Admin created succesfully.", token : token,});
            }
        })
    } catch (error) {
        console.error("Error in admin signup", error)
        res.status(500).json({error: "Internal server error"});
    }
})
//admin login route
app.post('/admin/login', async (req, res) => {
    try {
        const {username, password} = req.headers;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        const admin = await Admin.findOne({username, password});
        if(admin){
            const token = getTokenForAdmin({username});
            return res.status(201).json({messege: "Admin logged in succesfully.",
        token : token});
        }
        
        res.status(401).json({error: "Incorrect credentials."});
    } catch (error) {
        console.error("Error in admin login", error)
        res.status(500).json({error: "Internal server error"});
    }
})
//route to create course
app.post('/admin/course',adminAuth ,async (req, res) => {
    try {
        const course = new Course(req.body);
        await course.save(course);
        return res.status(201).json({messege: "course added succesfully",
     courseId : course.id});
    } catch (error) {
        console.error("Error in creating course", error)
        res.status(500).json({error: "Internal server error"});
    }
})

//route to update the course
app.put('/admin/:courseid',adminAuth,async (req,res)=>{
    try{
        const course = await Course.findByIdAndUpdate(req.params.courseid, req.body, {new: true});
    if(course){
        return res.status(201).json({messege: "course updated succesfully",
                courseId : course.id});
    }
        return res.status(401).json({error: "Course doesn't exists"});

    }
    catch (error) {
        console.error("Error in updating course", error)
        res.status(500).json({error: "Internal server error"});
    }
})

app.get('/admin/courses', adminAuth, async (req,res)=>{
    const courses = await Course.find({});
    res.status(201).json({courses});
})
//admin routes are done 

//user routes 
//signup route
app.post('/user/signup', async (req, res) => {
    try {
        const {username, password} = req.body;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        const user = await User.findOne({username});
        if(user){
            return res.status(409).json({error:"User already exists."});
        }
        const newUser = new User({username, password});
        await newUser.save();
        const token = getTokenForUser({username});
        res.status(201).json({messege: "User created succesfully.", token: token});
    } catch (error) {
        console.error("Error in user signup", error)
        res.status(500).json({error: "Internal server error"});
    }
})
//user login route
app.post('/user/login', async (req, res) => {
    try {
        const {username, password} = req.headers;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        const user = await User.findOne({username, password});
        if(user){
            const token = getTokenForUser({username});
            return res.status(201).json({messege: "User logged in succesfully.", token: token});
        }
        res.status(401).json({error: "Incorrect credentials."});
    } catch (error) {
        console.error("Error in user login", error)
        res.status(500).json({error: "Internal server error"});
    }
})

//route to get all the courses 
app.get('/user/courses',userAuth, async (req,res)=>{
    const courses =await Course.find({});
    res.status(201).json({courses});
})

//route to buy course
app.post('/user/courses/:courseid',userAuth, async (req,res)=>{
    let courseId = req.params.courseid;
    let username = req.user.username;
    const course = await Course.findById(courseId);
    
    // if(courseAlredyBought(courseId,username)){
    //     return res.status(409).json({error: "Course alredy purchased by the user"})
    // }
    // const requestedCourse = courses.find(c=>{
    //     return Number(c.courseId) === courseId; 
    // })
    if(course){
        const user = await User.findOne({username});
        if(user){
            user.purchasedCourses.push(course);
            await user.save();
            return res.status(201).json({messege:"Course purchased succesfully"});
        }
        return res.status(403).json({ message: 'User not found' });
    }
    return res.status(401).json({error: "Course not found"});
})

//route to get the purchased courses
app.get('/user/purchased', userAuth, async (req,res)=>{
    const username = req.user.username;
    let user =await User.findOne({username}).populate('purchasedCourses');
    if(user){
        res.status(201).json({purchasedCourses: user.purchasedCourses} || []);
    }else{
        res.status(403).json({ message: 'User not found' });    
    }
})
app.all('*', (req, res) => {
   res.status(404).send("Not Found");
})
app.listen(PORT, () => {
  console.log(`Example app listening on PORT ${PORT}`)
})