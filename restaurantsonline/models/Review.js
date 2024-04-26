const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const Schema = mongoose.Schema;

const reviewSchema = new Schema ({
    created: {
        type: Date,
        default: Date.now
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply the author name'
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        required: 'You must supply the store name'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5

    },
    text: {
        type: String,
        required: 'You must supply the comment text'// this makes sure the section will not be empty before storig to the DB, otherwise it will throw the error message
    }
});

function autopopulate(next) {
    this.populate('author');
    next();
};

reviewSchema.pre('find', autopopulate);
reviewSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Review', reviewSchema);