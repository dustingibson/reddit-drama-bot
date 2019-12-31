import requests 

SRs = open('sr.txt').readlines()

for SR in SRs:
    print("Get " + SR)
    URL = "http://localhost:3110/subreddit?name=" + SR.strip()
    r = requests.post(url = URL) 
    print(r)