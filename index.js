const express = require('express');
const app = express();

const port = 3000
app.use(express.json())


let admins = [];
let users = [];
let courses = [];

const adminExists = (admin)=>{
    return admins.some(a=> a.username === admin.username);
}
const isAdmin = (admin)=>{
    return admins.some(a=> a.username === admin.username && a.password === admin.password);
}
const adminAuth = (req, res, next)=>{
    const {username, password} = req.headers;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
    if(isAdmin( {username, password})){
        return next();
    }
    return res.status(401).json({error: "Not Authorised"})
}

const userExists = (user)=>{
    return users.some(usr=>user.username === user.username);
}
const isUser =(user)=>{
    return users.some(usr=> usr.username === user.username && usr.password === user.password);
}
const userAuth = (req, res, next)=>{
    const {username, password} = req.headers;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
    if(isUser( {username, password})){
        return next();
    }
    return res.status(401).json({error: "Not Authorised"})
}
const courseAlredyBought = (courseId, username)=>{
    let user = users.find(u=> u.username === username);
    let course = user.courses.find(c=>Number(c.courseId) === Number(courseId));
    if(course){
        return true;
    }
    return false;
}
//admin signup route
app.post('/admin/signup', (req, res) => {
    try {
        const {username, password} = req.body;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        if(adminExists({username, password})){
            return res.status(409).json({error:"Admin already exists."});
        }
        admins.push({username,password});
        res.status(201).json({messege: "Admin created succesfully."});
    } catch (error) {
        console.error("Error in admin signup", error)
        res.status(500).json({error: "Internal server error"});
    }
})
//admin login route
app.post('/admin/login', (req, res) => {
    try {
        const {username, password} = req.headers;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        if(isAdmin({username, password})){
            return res.status(201).json({messege: "Admin logged in succesfully."});
        }
        
        res.status(401).json({error: "Incorrect credentials."});
    } catch (error) {
        console.error("Error in admin login", error)
        res.status(500).json({error: "Internal server error"});
    }
})
//route to create course
app.post('/admin/course',adminAuth ,(req, res) => {
    try {
        const course = {
            courseId : Math.floor(Math.random()*10000),
            title: req.body.title,
            description : req.body.description,
            price : req.body.price,
            imgUrl : req.body.imgUrl,
            published : req.body.published
        }

    courses.push(course);

    // if(!title || !description || !price || !imgUrl || !published){
    //     return res.status(400).json({error:"Please fill all the information about course."});
    // }
   


    // let admin = admins.find(a=>{
    //     return a.username === req.headers.username;
    // })
    // console.log(admin)
    // console.log(req.headers)
    // admin.courses.push(course.courseId);
    return res.status(201).json({messege: "course added succesfully",
     course})
    } catch (error) {
        console.error("Error in creating course", error)
        res.status(500).json({error: "Internal server error"});
    }
})

//route to update the course
app.put('/admin/:courseid',adminAuth,(req,res)=>{
    try {
        const id = Number(req.params.courseid);
        const course = {
            title: req.body.title,
            description : req.body.description,
            price : req.body.price,
            imgUrl : req.body.imgUrl,
            published : req.body.published
        }
        let courseToUpdate = courses.find(c => c.courseId === id);
        if(courseToUpdate){
            Object.assign(courseToUpdate, course);
            return res.status(201).json({messege: "course updated succesfully",
                course});
        }
        return res.status(401).json({error: "Course doesn't exists"});

    } catch (error) {
        console.error("Error in creating course", error)
        res.status(500).json({error: "Internal server error"});
    }
})

app.get('/admin/courses', adminAuth, (req,res)=>{
    res.status(201).send(courses);
})
//admin routes are done 

//user routes 
//signup route
app.post('/user/signup', (req, res) => {
    try {
        const {username, password} = req.body;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        if(userExists({username, password})){
            return res.status(409).json({error:"User already exists."});
        }
        users.push({username,password, courses:[]});
        res.status(201).json({messege: "User created succesfully."});
    } catch (error) {
        console.error("Error in user signup", error)
        res.status(500).json({error: "Internal server error"});
    }
})
//user login route
app.post('/user/login', (req, res) => {
    try {
        const {username, password} = req.headers;
        if(!username || !password){
            return res.status(400).json({error:"username and password are required."});
        }
        if(isUser({username, password})){
            return res.status(201).json({messege: "User logged in succesfully."});
        }
        
        res.status(401).json({error: "Incorrect credentials."});
    } catch (error) {
        console.error("Error in user login", error)
        res.status(500).json({error: "Internal server error"});
    }
})

//route to get all the courses 
app.get('/user/courses',userAuth,(req,res)=>{
    res.status(201).json({courses:courses});
})

//route to buy course
app.post('/user/courses/:courseid',userAuth, (req,res)=>{
    let courseId = Number(req.params.courseid);
    console.log(courseId)
    let username = req.headers.username;
    if(courseAlredyBought(courseId,req.headers.username)){
        return res.status(409).json({error: "Course alredy purchased by the user"})
    }
    const requestedCourse = courses.find(c=>{
        return Number(c.courseId) === courseId; 
    })
    console.log(requestedCourse);
    if(requestedCourse){
        const user = users.find(usr => usr.username === username);
        console.log(user)
        user.courses.push(requestedCourse);
        return res.status(201).json({messege:"Course purchased succesfully"});
    }
    return res.status(401).json({error: "Course Doesn't exists"});
})

//route to get the purchased courses
app.get('/user/purchased', userAuth, (req,res)=>{
    let user = users.find(usr=> usr.username === req.headers.username);
    res.status(201).json({PurchaseCourses: user.courses});
})
app.all('*', (req, res) => {
   res.status(404).send("Not Found");
})
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})