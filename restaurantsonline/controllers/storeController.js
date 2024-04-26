const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // from Store.js bottom line
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const { render } = require('pug');
const User = mongoose.model('User');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: function(req, file, next){
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto){
            next(null, true);
        } else{
            next({message: 'That filetype isn\'t allowed!'}, false);
        }
    }
};

exports.homePage = (req, res) => {
    console.log(req.name);
    res.render('index');
};

exports.addStore = (req, res) => {

    res.render('editStore', {title: 'Add Store'});
};

exports.upload = multer(multerOptions).single('photo');
exports.resize = async (req, res, next) => {
    // check if there is no new file to resize
    if(!req.file){
        next(); // skip to the next
        return;
    }
    // console.log(req.file);
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    // resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    // once we have writtennn the photo to our filesystem keep going
    next();
};

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 4;
    const skip = limit * page - limit;

    // 1. query the DB for a list of all stores
    const storesPromise = Store
      .find()
      .skip(skip)
      .limit(limit)
      .sort({created: 'desc'});
    // console.log(stores);

    const countPromise = Store.count();
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);
    
    // if the input page number is exceeding the ones we have
    if(!stores.length && skip) {
       req.flash('info', `Hey you asked for page ${page} does not exist, we will navigate you back to page ${pages}`);
       res.redirect(`/stores/page/${pages}`);
       return;
    }

    res.render('stores', {title: 'Stores', stores, page, pages, count});
};

const confirmOwner = (store, user) => {
    if(!store.author.equals(user._id)){
        throw Error('You must own a store in order to edit it!');
    }
};


exports.editStore = async (req, res) => {
    // Find the store given the ID
    const store = await Store.findOne({_id: req.params.id});
    // check the result by json: res.json(store);
    // confirm they are the owner of the store
    confirmOwner(store, req.user);
    // render out the edit form so the user cann update the store
    res.render('editStore', {title: `Edit ${store.name}`, store: store});
};

exports.updateStore = async (req, res) => {
    // set the location data to be a point
    req.body.location.type = 'Point';
    // find and update the store
    const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
        new: true, // return the new store not the old one
        runValidators: true
    }).exec();
    req.flash('success', `Successfully update <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store --></a>`);
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
    // test if the page works: res.send('it works!');
    // res.json(req.params);
    const store = await Store.findOne({ slug: req.params.slug}).
    populate('author reviews'); // it populates some fields of author like _id, email etc.
    if(!store) 
        return next();

    //res.json(store);
    res.render('store', {store: store, title: store.name});
};

exports.getStoresByTag = async (req, res) => {
    // res.json('it worked');
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true}; // if no tag is found, we just return the one(s) with tag property
    const storesPromise = Store.find({tags: tagQuery});
    const tagsPromise = Store.getTagsList();
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
    //res.json(tags);
    res.render('tag', {tags, title: 'Tags', tag, stores});
};

exports.searchStores = async (req, res) => {
    const stores = await Store
    .find({
        $text: {
            $search: req.query.q
        }
    },
    {
        score: {$meta: 'textScore'}
    })
    .sort({
        score: {$meta: 'textScore'}
    })
    .limit(5); // limit to only 5 results
    res.json(stores);
};

exports.mapStores = async (req, res) => {
    const { lng, lat } = req.query;

    // Check if lng and lat are provided and are valid numbers
    if (!lng || !lat || isNaN(parseFloat(lng)) || isNaN(parseFloat(lat))) {
        return res.status(400).json({ error: 'Invalid coordinates provided' });
    }
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000 // 10km
            }
        }
    };
    const stores = await Store.find(q).select('slug name description location photo').limit(10);
    res.json(stores);
};

exports.mapPage = (req, res) => {
    res.render('map', {title: 'Map'});
};

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User
    .findByIdAndUpdate(req.user._id,
        {[operator]: {hearts: req.params.id}},
        {new: true}
    );
    res.json(user);
};

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts}
    });
    //res.json(stores);

    res.render('stores', {title: 'Hearted Stores', stores});

};

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', {stores, title:'Top Stores!'});
};

