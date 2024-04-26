const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.submitReview = async (req, res) => {
    req.body.author = req.user._id;
    req.body.store = req.params.id;

    await (new Review(req.body)).save();
    
    req.flash('success','Review has been submitted succesfully');
    res.redirect('back');
};