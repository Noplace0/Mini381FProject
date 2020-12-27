const express = require('express');
const session = require('cookie-session');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const mongourl = 'mongodb+srv://ToddyAdmin:T12345@cluster0.ahmuq.mongodb.net/test?retryWrites=true&w=majority';
const dbName = "test";

const fs = require('fs');
const formidable = require('formidable');
const app = express();

app.set('view engine','ejs');

app.use(session({
    name: 'session',
    keys: ['secret']
}));

//var username = '';
//demo
const users = new Array(
	{name: 'demo', password: ''},
	{name: 'student', password: 'admin'}
);

//login
app.use((req,res,next) => {
    if (req.originalUrl == '/login' || req.originalUrl.includes('/api')) {
        return next();
    } else {
        if (!req.session.authenticated) {
            res.redirect('/login');
        }else {
            return next();
        }
    }
});   
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', (req,res) => {
    res.redirect('/restaurants');
});

app.get('/login', (req,res) => {
    res.status(200).render('login.ejs');
});

app.post('/login', (req,res) => {
    users.forEach((user) => {
        if (user.name == req.body.name && user.password == req.body.password) {
            req.session.authenticated = true;
            req.session.username = user.name;
        }
    });
    if (req.session.authenticated != true) {
    	res.redirect('/login');
    } else {
    	res.redirect('/restaurants');
    }
});

app.get('/restaurants', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
            console.log('[INFO] connected toMongoDB');
        const db = client.db(dbName);
        findRestaurants(db,{},(restaurants) => {
            client.close();
            console.log('[INFO] Disconnected MongoDB');
            res.render('display.ejs',{username: req.session.username,restaurants:restaurants});
        });
    });
});

app.get('/create', (req,res) => {
    res.render('create.ejs');
    res.end();
});

app.post('/create', (req,res) => {
    checkSession(req,res);

    const form = new formidable.IncomingForm();
    form.parse(req, (err,fields,files) => {
        let new_r = {};
        new_r['name'] = fields.name;
        new_r['borough'] = fields.borough || '';
        new_r['cuisine'] = fields.cuisine || '';
        new_r['address'] = {};
        new_r['address']['street'] = fields.street || '';
        new_r['address']['building'] = fields.building || '';
        new_r['address']['zipcode'] = fields.zipcode || '';
        new_r['address']['coord'] = [fields.lat || '',fields.long || ''];
        new_r['grades'] = [];
        new_r['owner'] = req.session.username;
        if (files.photo.size == 0) {
            let client = new MongoClient(mongourl);
            client.connect((err) => {
                try {
                    assert.equal(err,null)
                } catch (err) {
                    res.status(500).end("MongoClient connect() failed!");
                }
                const db = client.db(dbName);
                new_r['photo'] = '';
                new_r['photo_mimetype'] = '';
                insertRestaurants(db,new_r,(result) => {
                    client.close();
                    res.redirect('/restaurants');
                });
            });
        } else {
            fs.readFile(files.photo.path, (err,data) => {
                let client = new MongoClient(mongourl);
                client.connect((err) => {
                    try {
                        assert.equal(err,null);
                    } catch (err) {
                        res.status(500).end("MongoClient connect() failed!");
                    }
                    const db = client.db(dbName);
                    new_r['photo'] = new Buffer.from(data).toString('base64');
                    new_r['photo_mimetype'] = files.photo.type;
                    insertRestaurants(db,new_r,(result) => {
                        client.close();
                        res.redirect('/restaurants');
                    });
                });
            });
        }
    });
});

app.get('/search', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
            console.log('[INFO] connected toMongoDB');
            console.log('[INFO] Searching Doc');
        const db = client.db(dbName);
        let criteria = {};
        criteria[req.query.searchBy] = req.query.keyword;
        findRestaurants(db,criteria,(restaurants) => {
            client.close();
            console.log('[INFO] Disconnected MongoDB');
            res.render('display.ejs',{username:req.session.username,restaurants:restaurants});
        });
    });
})

app.get('/show', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
            console.log('[INFO] connected toMongoDB');
        const db = client.db(dbName);
        let criteria = {};
        criteria['_id'] = ObjectID(req.query._id);
        findRestaurants(db,criteria,(restaurant) => {
            client.close();
            console.log('[INFO] Disconnected MongoDB');
            res.render('read.ejs',{restaurant:restaurant,session:req.session});
        });
    });
});

app.get("/map", (req,res) => {
	res.render("map.ejs", {
		lat:req.query.lat,
		lon:req.query.lon,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
	res.end();
});

app.get('/update', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
            console.log('[INFO] connected toMongoDB');
        const db = client.db(dbName);
        let criteria = {};
        criteria['_id'] = ObjectID(req.query._id);
        findRestaurants(db,criteria,(restaurant) => {
            client.close();
            console.log('[INFO] Disconnected MongoDB');
            res.render('update.ejs',{restaurant:restaurant});
        });
    });
});

app.post('/update', (req,res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err,fields,files) => {
        let new_r = {};
        new_r['name'] = fields.name;
        new_r['borough'] = fields.borough || '';
        new_r['cuisine'] = fields.cuisine || '';
        new_r['address'] = {};
        new_r['address']['street'] = fields.street || '';
        new_r['address']['building'] = fields.building || '';
        new_r['address']['zipcode'] = fields.zipcode || '';
        new_r['address']['coord'] = [fields.lat || '',fields.long || ''];
        new_r['owner'] = req.session.username;
        if (files.photo.size == 0) {
            let client = new MongoClient(mongourl);
            client.connect((err) => {
                try {
                    assert.equal(err,null)
                } catch (err) {
                    res.status(500).end("MongoClient connect() failed!");
                }
                const db = client.db(dbName);
                findRestaurants(db,{_id:ObjectID(fields._id)},(restaurant) => {
                    new_r['grades'] = restaurant[0].grades;
                    new_r['photo'] = restaurant[0].photo;
                    new_r['photo_mimetype'] = restaurant[0].photo_mimetype;
                    updateRestaurants(db,fields._id,new_r,(result) => {
                        client.close();
                        res.redirect(`/show?_id=${fields._id}`);
                    });
                });
            });
        } else {
            fs.readFile(files.photo.path, (err,data) => {
                let client = new MongoClient(mongourl);
                client.connect((err) => {
                    try {
                        assert.equal(err,null);
                    } catch (err) {
                        res.status(500).end("MongoClient connect() failed!");
                    }
                    const db = client.db(dbName);
                    findRestaurants(db,{_id:ObjectID(fields._id)},(restaurant) => {
                        new_r['grades'] = restaurant[0].grades;
                        new_r['photo'] = new Buffer.from(data).toString('base64');
                        new_r['photo_mimetype'] = files.photo.type;
                        updateRestaurants(db,fields._id,new_r,(result) => {
                            client.close();
                            res.redirect(`/show?_id=${fields._id}`);
                        });
                    });
                });
            });
        }
    });
})

app.get('/delete', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
            console.log('[INFO] connected toMongoDB');
        const db = client.db(dbName);
        let criteria = {};
        criteria['_id'] = ObjectID(req.query._id);
        deleteRestaurants(db,criteria,(restaurant) => {
            client.close();
            console.log('[INFO] Disconnected MongoDB');
            res.redirect('/restaurants');
        });
    });
});

app.get('/rate', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
            console.log('[INFO] connected toMongoDB');
        const db = client.db(dbName);
        let criteria = {};
        criteria['_id'] = ObjectID(req.query._id);
        findRestaurants(db,criteria,(restaurant) => {
            client.close();
            console.log('[INFO] Disconnected MongoDB');
            console.log(restaurant[0].grades);
            res.render('rate.ejs',{restaurant:restaurant});
        });
    });
});

app.post('/rate', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end("MongoClient connect() failed!");
        }
        console.log("Connected to MongoDB");
        const db = client.db(dbName);
        let grade = {};
        grade.score = req.body.rating;
        grade.user = req.session.username;
        addRating(db,req.body.r_id,grade,(result) => {
            client.close();
            console.log("Disconnected MongoDB");
            res.redirect(`/show?_id=${req.body.r_id}`);
        });
    });
});

app.get('/logout', (req,res) => {
    req.session = null;
    res.redirect("/login");
});

//API 
app.get('/api/restaurant/:key/:value', (req,res) => {
    let client = new MongoClient(mongourl);
    client.connect((err) => {
        try {
            assert.equal(err,null);
        } catch (err) {
            res.status(500).end('[API]MongoClient connect() failed!');
        }
        console.log('API Connected to MongoDB');
        const db = client.db(dbName);
        let criteria = {};
        criteria[req.params.key] = req.params.value;
        findRestaurants(db,criteria,(restaurants) => {
            client.close();
            console.log('API Disconnected MongoDB');
            res.status(200).type('json').json(restaurants).end();
        });
    });
});

const PORT = process.env.PORT || 8099;
app.listen(PORT, console.log(`Server started on port ${PORT}`));

const findRestaurants = (db,criteria,callback) => {
    const cursor = db.collection("restaurants").find(criteria);
    let restaurants = [];
    cursor.forEach((doc) => {
        restaurants.push(doc);
    }, (err) => {
        assert.equal(err,null);
        callback(restaurants);
    })
};

const updateRestaurants = (db,r_id,doc,callback) => {
    db.collection('restaurants').replaceOne({_id: ObjectID(r_id)},doc,(err,result) => {
        assert.equal(err,null);
        console.log("update success");
        console.log(JSON.stringify(result));
        callback(result);
    });
}
const insertRestaurants = (db,r,callback) => {
    db.collection('restaurants').insertOne(r,(err,result) => {
        assert.equal(err,null);
        console.log("insert success");
        console.log(JSON.stringify(result));
        callback(result);
    });
};
const deleteRestaurants = (db,r,callback) => {
    db.collection('restaurants').deleteOne(r,(err,result) => {
        assert.equal(err,null);
        console.log("delete success");
        console.log(JSON.stringify(result));
        callback(result);
    })
}
const addRating = (db,r_id,grade,callback) => {
    db.collection('restaurants').updateOne({_id: ObjectID(r_id)},{$push:{grades:grade}},(err,result) => {
        assert.equal(err,null);
        console.log("rating success");
        console.log(JSON.stringify(result));
        callback(result);
    })
}

function checkSession(req,res) {
    if(req.session.authenticated==false){
        res.redirect('/login');
    }  
}