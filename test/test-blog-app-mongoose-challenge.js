'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
  console.info('seeding blog data');
  let seedData = [];

  for (let i=1; i<=5; i++) {
    seedData.push(generateBlogPostData());
  }

  return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
  return {
    author: {firstName: faker.name.firstName(), lastName: faker.name.lastName()},
    content: faker.lorem.text(),
    title: faker.lorem.sentence(),
    created: faker.date.past()
  };
}

function tearDownDb() {
  console.warn('*Warning* Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('BlogPost API resource', function() {

	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogPostData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});

	describe ('GET endpoint', function() {

		it('should return all existing posts', function() {

			let _res;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					_res = res;
					expect(res).to.have.status(200);
					expect(res.body).to.have.lengthOf.at.least(1);
					return BlogPost.count();
	  			})
	  			.then(function(count) {
	  				expect(_res.body).to.have.lengthOf(count);
	  			});
			});

		it('should return posts with correct fields', function() {

			let resBlogPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.be.a('array');
					expect(res.body).to.have.lengthOf.at.least(1);

					res.body.forEach(function(post) {
						expect(post).to.be.a('object');
						expect(post).to.include.keys(
							'id', 'author', 'content', 'title', 'created');
					});
					resBlogPost = res.body[0];
					return BlogPost.findById(resBlogPost.id);
				})
				.then(function(post) {

					console.log(resBlogPost);
					console.log(post);
					expect(resBlogPost.id).to.equal(post.id);
					expect(resBlogPost.author).to.equal(post.author.firstName.concat(" ", post.author.lastName));
					expect(resBlogPost.content).to.equal(post.content);
					expect(resBlogPost.title).to.equal(post.title);
					expect(new Date(resBlogPost.created).toString).to.equal(new Date(post.created).toString);
			})
		})
	});

	describe('POST endpoint', function() {

		it('should add a new post', function() {

			const newBlogPost = generateBlogPostData();

			return chai.request(app)
				.post('/posts')
				.send(newBlogPost)
				.then(function(res) {
					expect(res).to.have.status(201);
					expect(res).to.be.json;
					expect(res.body).to.be.a('object');
					expect(res.body).to.include.keys(
						'id', 'author', 'content', 'title', 'created'
						);
					expect(res.body.author).to.not.be.null;
					expect(res.body.content).to.equal(newBlogPost.content);
					expect(res.body.title).to.equal(newBlogPost.title);
					expect(new Date(res.body.created).toString).to.equal(new Date(newBlogPost.created).toString);
			})
		})
	})

		describe('PUT endpoint', function() {

			it('should update fields you send over', function() {

				const updateData = {
					author: 'Stellinator',
					content: 'This is test data'
				};

				return BlogPost
					.findOne()
					.then(function(post) {
					  updateData.id = post.id;

					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData);
				})
				.then(function(res) {
					expect(res).to.have.status(204);

					return BlogPost.findById(updateData.id);
				})
				.then(function(post) {
					expect(post.content).to.equal(updateData.content);
					expect(post.author).to.equal(updateData.author);
				});
			});
		});

		describe('DELETE endpoint', function () {

			it('delete a post by id', function() {

				let post;

				return BlogPost
					.findOne()
					.then(function(_post) {
						post = _post;
						return chai.request(app).delete(`/posts/${post.id}`);
					})
					.then(function(res) {
						expect(res).to.have.status(204);
						return BlogPost.findById(post.id);
					})
					.then(function(_post) {
						expect(_post).to.be.null;
				});
			});
		});
	});