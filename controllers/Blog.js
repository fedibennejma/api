/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-03 11:55:43
 * @modify date 2021-02-04 11:14:50
 * @desc [description]
 */

const Article = require('../models/Article');
const Blog = require('../models/Blog');

exports.createBlog = (req, res, next) => {
    const blog = new Blog({
        name: req.body.name,
        description: req.body.description,
        articles: req.body.articles
    });
    blog.save((err, blog) => {
        if (err)
            res.status(500).send(err)
        res.send(blog)
    })
};

exports.getAllBlog = (req, res, next) => {
    Blog.find({ isDeleted: false }, (err, blogs) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(blogs)
    }).select('name slug lang')
};

exports.updateBlog = (req, res) => {
    Blog.updateOne({ _id: req.params.id }, { ...req.body, _id: req.params.id }, (err, blog) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(blog)
    });
};


exports.deleteBlog = (req, result) => {
    Blog.findOneAndUpdate(
        { _id: req.params.id },
        { $set: { isDeleted: true } },
        (error, blog) => {
            if (error)
                result.status(500).send(error)
            else if (blog.articles.length)
                Article.bulkWrite(
                    blog.articles.map((article) => (
                        {
                            updateOne: {
                                filter: { _id: article._id },
                                update: { $set: { isDeleted: true } },
                            },
                        }
                    ))).then((res, error) => {
                        if (error)
                            result.status(500).send(error)
                        else
                            result.send(res)
                    });
            else
                result.send(blog)
        });
};