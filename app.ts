// importing the dependencies
import express = require('express');
import helmet = require('helmet');
import cors = require('cors');
import morgan = require('morgan');
import sqlite3 = require('sqlite3');
//const bodyParser = require('body-parser');
import * as fetch from 'node-fetch';
import { linkSync } from 'fs';
const snoowrap = require('snoowrap');
import * as config from './config.json';
var path = require('path');


let db = new sqlite3.Database('./db/db.bin');

const app = express();

app.use(helmet());

app.use(cors());

app.use(morgan('combined'));

app.use(express.static('search'))

app.get('/', (req, res) => {
  res.send("hello");
});

app.get('/authtest', (req, res) => {
  const r = new snoowrap({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
    clientId: config.clientid,
    clientSecret: config.secret,
    username: config.username,
    password: config.password
  });
  r.getSubreddit('RedditDramaBot').submitLink({
    title: 'Test',
    url: 'https://google.com'
  });
  res.send("test");
});

app.get('/fetchcomments', async (req, res) => {
  const sort = req.query.sort;
  const sortOrder = req.query.sortOrder;
  const subreddit = req.query.subreddit;
  const keyword = req.query.keyword;
  const limit = req.query.limit;
  const offset = (req.query.page-1) * req.query.limit;
  return res.send(await executeQuery(keyword, subreddit, sort, sortOrder, limit, offset));
});

app.post('/postthread', async (req, res) => {
  const query = "SELECT * FROM DATA WHERE STATUS='RECORDED' AND DATA <>'[removed]' AND DATA <> '[deleted]' ORDER BY RANDOM() DESC LIMIT 1";
  let data = {};
  const prom = await new Promise(function (resolve, reject) {
  db.all(query, function(err, rows) {
      rows.forEach( async (row) => { 
        data = row;
      });
      resolve(data);
    })
  });
  const updateQuery = `UPDATE DATA SET STATUS='POSTED' WHERE ID=?`;
  db.run(updateQuery, [data['ID']], function(err) {
  });
  const subreddit = getSubredditFromLink(data['LINK']);
  const comment = data['DATA'].substr(0, Math.min(150, data['DATA'].length));
  const title = `[${subreddit}] "${comment}..."`;
  const r = new snoowrap({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
    clientId: config.clientid,
    clientSecret: config.secret,
    username: config.username,
    password: config.password
  });
  r.getSubreddit('RedditDramaBot').submitLink({
    title: title,
    url: data['LINK']
  });
  res.send(title);
});

app.post('/subreddit', async (req, res) => {
  try {
    let links = [];
    await getRedditList(`https://www.reddit.com/r/${req.query.name}/${req.query.cat}.json?t=${req.query.time}`);
    await getRedditList(`https://www.reddit.com/r/${req.query.name}/${req.query.cat}.json?t=${req.query.time}`);
    await getRedditList(`https://www.reddit.com/r/${req.query.name}/${req.query.cat}.json?t=${req.query.time}`);
    res.send("Pass");
  }
  catch(err) {
    res.send("ERROR");
  }
});

app.get('/subredditlist', async(req, res) => {
  try {
    getSubredditList().then( (result) => {
      res.send(result);
    })
  }
  catch(err) {
    res.send("ERROR");
  }
});

app.get('/view', async(req, res) => {
  const parent = path.resolve(__dirname, '..');
  res.sendFile(path.join(parent + '/search/search.html'));
});

app.post('/reddit',  (req, res) => {
  try {
    console.log("Getting Subreddit List");
    traverseSubreddits().then( (result) => {
        res.send(result);
      });;
  }
  catch(err) {
    res.send("ERROR");
  }
});

app.post('/insertMissingDates', async(req, res) => {
  insertMissingDates();
  res.send("OK");
})

app.listen(config.port, () => {
  console.log('listening on port ' + config.port);
});

function getSubredditFromLink(link) {
  return link.split('/')[4]
}

 async function traverseSubreddits() {
  let links = [];
    const prom = await new Promise(function (resolve, reject) {
      db.all("SELECT LINK AS link FROM SUBREDDITS WHERE ACTIVE='Y'", function(err, rows) {
        rows.forEach( async (row) => { 
          links.push(`https://www.reddit.com/r/${row.link}/top.json?t=week`);
          links.push(`https://www.reddit.com/r/${row.link}/top.json?t=today`);
          links.push(`https://www.reddit.com/r/${row.link}/controversial.json?t=week`);

        });
        resolve(links);
      })
    });
    let results = [];
    await Promise.all( links.map( async (link) => {
      console.log("Checking " + link);
      const result = await getRedditList(link);
      results.push(result);
    }));
    return results;
}

function naiveCountReplies(dataStr) {
  return dataStr.split("\"replies\":").length;
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
    for( let comment of comments )
    {
      try {
        if(comment["data"] != undefined && comment.data["permalink"] != undefined) {
          const score = comment.data.score;
          if( comment.data.replies != "" && score <= config.thresholdWithComments && score != 0 && score != 1 )
          {
            const data = await getCommentData(comment.data.permalink);
            const ogComment = comment.data.body;
            //let count = 0;
            let count = naiveCountReplies(JSON.stringify(data));
            if( ogComment !== "[deleted]" && ogComment !== "[removed]" && (score <= config.threshold && count >= config.minCommentsWithThreshold) || (score <= config.thresholdWithComments && count >= config.minComments) ) { 
              links.push( comment.data.permalink );
              await insertLinkToDB(url, "https://reddit.com" +  comment.data.permalink, ogComment, "RECORDED", score, count, comment.data.created_utc, comment.data.subreddit);
            }
          }
        }
      } catch(err) {
        console.log("Error getting comments");
      }
    }
    return "";
  } catch(err) {
    return "";
  }
}

async function getCommentData(permaLink) {
  const url = "https://reddit.com" + permaLink.substr(0, permaLink.length-1) + ".json";
  try {
    const result = await fetch(url);
    try {
      const response = await result.json();
      return response;
    } catch(err) {
      console.log("Response to JSON error");
      return [];
    }
  }
  catch(err) {
    console.log(err);
    return [];
  }
}

async function insertMissingDates() {
  let query = `SELECT * FROM DATA WHERE DATE IS NULL`;
  db.all(query, async function(err, rows) {
    rows.forEach( async (row) => {
      const url = row.LINK + '.json';
      const result = await fetch(url);
      const response = await result.json(url);
      const commentDate = response[1].data.children[0].data.created_utc;
      console.log(response[1].data.children[0].data.created_utc);
      const updateQuery = `UPDATE DATA SET DATE=${commentDate} WHERE ID=?`;
      console.log(updateQuery + " " + row.ID);
      db.run(updateQuery, [row.ID], function(err) {

      });
    });
  });
}

async function insertLinkToDB(srLink, link, data, status, score, comments, date, sr) {
  console.log(comments);
  let error = false;
  let query = `INSERT OR REPLACE INTO DATA ("LINK", "DATA", "STATUS", "DATALINK", "SCORE", "COMMENTS", "DATE", "SUBREDDIT") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [link, data, status, srLink, score, comments, date, sr], function(err) {
    console.log("INSERTING...");
    error = true;
  });
  if(error) {
      db.run(query, [link, "{}", status, srLink, score, comments, date, sr], function(err) {
        console.log("RETRYING INSERT...");
    });
  }
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

async function executeQuery(keyword, subReddit, sort, sortOrder, limit, offset) {
  let query = '';
  subReddit = subReddit.toLowerCase();
  let keywordQuery = `DATA LIKE '%${keyword}%'`;
  let subredditQuery = `LOWER(LINK) LIKE '%${subReddit}%'`;
  let whereList = [];
  let whereStr = '';
  if(keyword && keyword !== ' ' && keyword !== '')
    whereList.push(keywordQuery);
  if(subReddit && subReddit !== 'all')
    whereList.push(subredditQuery);
  if(whereList.length > 0)
    whereStr = ' WHERE ' + whereList.join(' AND ');
  query = `SELECT * FROM DATA ${whereStr} ORDER BY ${sort} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`;
  console.log(query);
  return await new Promise(function (resolve, reject) {
    db.all(query, function(err, rows) {
      resolve(rows);
    });
  })
}

async function getSubredditList(){
  const query = "SELECT DISTINCT LOWER(SUBREDDIT) FROM DATA ORDER BY SUBREDDIT ASC";
  return await new Promise(function (resolve, reject) {
    db.all(query, function(err, rows) {
      resolve(rows);
    });
  })
}

async function getRedditList(url) {
  const result = await fetch(url);
  const response = await result.json();
  const comments = [];
  for(let redditThread of response.data.children) 
  {
    try {
      //Get reddit link
      let redditLink = "https://reddit.com" + redditThread.data.permalink;
      
      //Sort by controversial
      redditLink = redditLink.substr(0, redditLink.length-1) + ".json?sort=controversial";

      //Look if it's already done
      const exists = await linkExists(redditLink);
      
      if (!exists) {
        console.log("Find comments on: " + redditLink);
        //Get comments
        comments.push(await getRedditComments(redditLink));
      }
    }
    catch(err) {
      console.log(err);
    }
  }
  return "";
}