const { ServerDescription } = require('mongodb');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        require: 'Please enter a store name'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You mush supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
       
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, 
{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
}
);

// define the indexes
storeSchema.index({
    name: 'text',
    description: 'text'
});

storeSchema.index({
    location: '2dsphere'
});

storeSchema.pre('save', async function(next){
   if(!this.isModified('name')){
     next();
     return;
   }
   this.slug = slug(this.name);
   // find other stores that have a slug of duplicated names
   const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
   const storesWithSlug = await this.constructor.find({slug: slugRegEx});

   if(storesWithSlug.length){
       this.slug = `${this.slug}-${storesWithSlug.length + 1}`
   }
   next();
});

storeSchema.statics.getTagsList = function(){
    return this.aggregate([
        {$unwind: '$tags'},
        {$group: {_id: '$tags', count: {$sum:1} }},
        {$sort: {count: -1} }
        
    ]);
};

storeSchema.statics.getTopStores = function() {
    return this.aggregate([
            // find the stores and populate their reviews
        {$lookup: 
           {from: 'reviews',
           localField: '_id',
           foreignField: 'store',
           as: 'reviews'},
        },
        // filter for only items that have 2 or more reviews
        {$match: {'reviews.1':{$exists: true}}},
        // add the average reviews field
        // *creating our own fields
        {$project: {
            averageRating: {$avg: '$reviews.rating'},
            photo: '$$ROOT.photo',
            name: '$$ROOT.name',
            reviews: '$$ROOT.reviews',
            slug: '$$ROOT.slug'
        }},
        // sort it by new field, highest reviews first
        {$sort: {averageRating: -1}},
        // limit to at most 10
        {$limit: 10}
    ]);
};

// join in sql, find reviews where the stores _id === review's store
storeSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'store'
});

function autopopulate(next){
    this.populate('reviews');
    next();
}
storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
