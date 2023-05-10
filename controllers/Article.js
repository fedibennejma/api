/**
 * @author AbdelkarimTurki
 * @email abdelkarim.turki@gmail.com
 * @create date 2021-02-03 11:55:22
 * @modify date 2021-03-22 12:53:43
 * @desc [description]
 */

const Article = require('../models/Article');
const Blog = require('../models/Blog');
const { cloudinary } = require('../bin/cloudinary');
const Tag = require('../models/Tag');
var mongoose = require('mongoose');
var ObjectId = require('mongodb').ObjectID;
/**
 * Create article
 * @param {*} req 
 * @param {*} res 
 */
exports.createArticle = async (req, res, next) => {
    try {
        const fileStr = req.body.imageUrl
        const uploadedResponse = await cloudinary.uploader.
            upload(fileStr, {
                upload_preset: 'tto6fni3'
            });
        const article = new Article({
            title: req.body.title,
            description: req.body.description,
            category: req.body.category,
            author: req.userId,
            imageUrl: uploadedResponse.url,
            content: req.body.content
        });
        // affect article to blog
        Blog.findOneAndUpdate({ name: article.category }, { $addToSet: { articles: article } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => { });
        const arrayTag = [];
        addArticleToTag(arrayTag, req.body.tags, article._id).then((result) => {
            article.tags = result;
            article.save((err, newArticle) => {
                if (err) {
                    res.status(500).send(err)
                } else {
                    res.send(newArticle)
                }  
            })
        }).catch((error) => {
            console.error(error);
            res.status(500).json({ err: 'error' });
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ err: 'error' });
    }
};
/**
 * Find all article
 * @param {*} req 
 * @param {*} res 
 */
exports.getAllArticle = (req, res, next) => {
    Article.find({ isDeleted: false }, (err, articles) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(articles)
    }).populate([
        {
            path: 'tags',
            model: 'Tag',
            match: { isDeleted: false },
            populate: 
            {
                path: 'articles',
                model: 'Article',
                match: { isDeleted: false }
            }
        },
        {
            path: 'author',
            model: 'User',
            select: 'userName firstName profilePicture',
        }
    ])
};

exports.getArticlePagination = (req, res, next) => {
    var skip = parseInt(req.params.skip) || 0; //for next page pass 1 here
    var limit = parseInt(req.params.limit) || 3;
    var category = req.params.category || "All";
    var query = {};
    if(category !== "All") {
        query = { isDeleted: false, category : category }   
    } else {
        query = { isDeleted: false} 
    }
    Article.find(query).skip(skip).limit(limit).exec((err, articles) => {
        if (err) {
            res.status(500).send(err)
        } else {
            Article.countDocuments(query).exec((count_error, count) => {
                if(err) {
                    res.status(500).send(count_error)
                } else {
                    res.send({
                        total: count,
                        elements: articles.length,
                        restElements: count - (skip + limit),
                        articles: articles
                      });
                }
            })
        }
    });
};


exports.getTopArticles = (req, res, next) => {
    Article.find({ isDeleted: false, topArticle: true }, (err, articles) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(articles)
    }).limit(5).populate([
        {
            path: 'tags',
            model: 'Tag',
            match: { isDeleted: false },
            populate: 
            {
                path: 'articles',
                model: 'Article',
                match: { isDeleted: false }
            }
        },
        {
            path: 'author',
            model: 'User',
            select: 'userName firstName profilePicture',
        }
    ])
};

/**
 * Find article by slug
 * @param {*} req 
 * @param {*} res 
 */
exports.getArticle = (req, res, next) => {
    Article.findOne({ slug: req.params.slug }, (err, article) => {
        if (err) {
            res.status(500).send(err)
        } else
            res.send(article)
    }).populate([
        {
            path: 'tags',
            model: 'Tag',
            match: { isDeleted: false },
            populate: 
            {
                path: 'articles',
                model: 'Article',
                match: { isDeleted: false }
            }
        },
        {
            path: 'author',
            model: 'User',
            select: 'userName firstName profilePicture',
        }
    ])
};

addArticleToTag = async (arrayTag, tags, article) => {
    const promises = tags.map(async tag =>
        await Tag.findOneAndUpdate({ tagName: tag.tagName }, { $addToSet: { articles: article } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => {
            if(!result) {
                const tag = new Tag({
                    tagName: tag.tagName
                });
                tag.save((err, tag) => {
                    if (err)
                        res.status(500).send(err)
                })
                arrayTag.push(tag);
            } else {
                arrayTag.push(result);
            }
        })
    )
    await Promise.all(promises)
    return new Promise((resolve) => {
        return resolve(arrayTag);
    })
}

deleteArticleFromTag = (deletedTags, articleToDelete) => {
    deletedTags.map(tag =>
        Tag.findOneAndUpdate({ tagName: tag.tagName }, { $pull: { articles: articleToDelete } }, { upsert: true, new: true, setDefaultsOnInsert: true }).then((result) => {})
    )
}

/**
 * update article
 * @param {*} req 
 * @param {*} res 
 */
exports.updateArticle = (req, res) => {
    let arrayTag = [];
    const deletedTags = req.body.deletedTags;
    const articleToUpdate = req.body.newSelectedArticle;
    const tags = articleToUpdate.tags;
    if(deletedTags.length > 0) {
        deleteArticleFromTag(deletedTags, articleToUpdate._id)
    }
    addArticleToTag(arrayTag, tags, articleToUpdate._id).then((result) => {
        Article.findOneAndUpdate({ _id: articleToUpdate._id }, {
            ...articleToUpdate,
            _id: articleToUpdate._id,
            tags: result
        }, { new: true }, (err, article) => {
            if (err) {
                res.status(500).send(err)
            } else
                res.send(article)
        }).populate([
            {
                path: 'tags',
                model: 'Tag',
                match: { isDeleted: false },
                populate: 
                    {
                        path: 'articles',
                        model: 'Article',
                        match: { isDeleted: false }
                    }
            },
            {
                path: 'author',
                model: 'User',
                select: 'userName firstName profilePicture',
            }
        ]);
    })
};

/**
 * Delete article by setting isDeleted
 * @param {*} req 
 * @param {*} res 
 */
exports.deleteArticle = (req, res) => {
    Article.updateOne(
        { _id: req.params.id },
        { $set: { isDeleted: true } },
        (err, article) => {
            if (err) {
                res.status(500).send(err)
            } else
                res.send(article)
        });
};

