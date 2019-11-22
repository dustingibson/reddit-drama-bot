// importing the dependencies
import * as express from 'express';
//const bodyParser = require('body-parser');
import * as cors from 'cors';
import * as helmet from 'helmet';
import * as morgan from 'morgan';
import * as sqlite3 from 'sqlite3';
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

app.post('/reddit',  (req, res) => {
  // getRedditComments("https://reddit.com/r/PublicFreakout/comments/dyr4nn/racist_woman_stops_a_man_and_his_kids_from_seeing").then( (result) => {
  //   res.send(result);
  // });
  // getRedditList("https://www.reddit.com/r/AmItheAsshole/top.json?t=week").then( (result) => {
  //   res.send(result);
  // });

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
        insertLinkToDB(url, comment.data.permalink, JSON.stringify(data), "RECORDED", score);
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

async function insertLinkToDB(srLink, link, data, status, score) {
  let query = `INSERT OR REPLACE INTO DATA ("LINK", "DATA", "STATUS", "DATALINK", "SCORE") VALUES (?, ?, ?, ?, ?)`;
  const stmt = db.run(query, [link, data, status, srLink, score], function(err) {
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