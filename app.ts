// importing the dependencies
import express = require('express');
import helmet = require('helmet');
import cors = require('cors');
import morgan = require('morgan');
import sqlite3 = require('sqlite3');
//const bodyParser = require('body-parser');
import * as fetch from 'node-fetch';
import { linkSync } from 'fs';

const threshold = -40;

let db = new sqlite3.Database('./db/db.bin');

const app = express();

app.use(helmet());

app.use(cors());

app.use(morgan('combined'));

app.get('/', (req, res) => {
  res.send("hello");
});

app.post('/subreddit',  (req, res) => {
  getRedditList(req.query.url).then( (result) => {
       res.send(result);
     });;

});

app.post('/reddit',  (req, res) => {
  traverseSubreddits().then( (result) => {
       res.send(result);
     });;

});

app.listen(3050, () => {
  console.log('listening on port 3050');
});

 async function traverseSubreddits() {
  let links = [];
    const prom = await new Promise(function (resolve, reject) {
      db.all("SELECT LINK AS link FROM SUBREDDITS WHERE ACTIVE='Y'", function(err, rows) {

        rows.forEach( async (row) => { 
          links.push(row.link);
        });
        resolve(links);
      })
    });
    let results = [];
    await Promise.all( links.map( async (link) => {
      const result = await getRedditList(link);
      results.push(result);
    }));
    return results;
}

function countReplies(replies, cntObj) {
  replies.forEach((reply) => {
    cntObj.cnt += 1;
    if(reply["data"] && reply.data["replies"] && reply.data.replies["data"] && reply.data.replies.data["children"])
      countReplies(reply.data.replies.data.children, cntObj);
  });
  return cntObj.cnt;
}

async function getRedditComments(url) {
  let results = "";
  try {
    const links = [];
    const result = await fetch(url);
    const response = await result.json(url);
    const comments = response[1].data.children;
    comments.forEach( async (comment) => {
      const score = comment.data.score;
      if( score <= threshold ) { 
        links.push( comment.data.permalink );
        const data = await getCommentData(comment.data.permalink);
        const replies = data[1].data.children[0].data.replies.data.children;
        const count = countReplies(replies, {cnt: 0});
        insertLinkToDB(url, comment.data.permalink, JSON.stringify(data), "RECORDED", score, count);
      }
    });
    return links;
  } catch(err) {
    console.log(results);
    return "";
  }
}

async function getCommentData(permaLink) {
  try {
    const url = "https://reddit.com" + permaLink.substr(0, permaLink.length-1) + ".json";
    const result = await fetch(url);
    const response = await result.json();
    return response;
  }
  catch(err) {
    return "{}";
  }
}

async function insertLinkToDB(srLink, link, data, status, score, comments) {
  let query = `INSERT OR REPLACE INTO DATA ("LINK", "DATA", "STATUS", "DATALINK", "SCORE", "COMMENTS") VALUES (?, ?, ?, ?, ?, ?)`;
  const stmt = db.run(query, [link, data, status, srLink, score, comments], function(err) {
    console.log(err);
  });
  return stmt;
}

async function linkExists(url) {
  return await new Promise(function (resolve, reject) {
    db.all(`SELECT LINK AS link FROM DATA WHERE DATALINK='${url}'`, function(err, rows) {
      if(rows.length > 0)
        resolve(true);
      else
        resolve(false);
    });
  });
}

async function getRedditList(url) {
  const result = await fetch(url);
  const response = await result.json();
  const comments = [];
  await Promise.all( response.data.children.map(async (redditThread) => {
    //Get reddit link
    let redditLink = "https://reddit.com" + redditThread.data.permalink;
    



    //Sort by controversial
    redditLink = redditLink.substr(0, redditLink.length-1) + ".json?sort=controversial";

    //Look if it's already done
    const exists = await linkExists(redditLink);
    
    if (!exists) {
      //Get comments
      comments.push(await getRedditComments(redditLink));
    }
  }));
  return "";
}