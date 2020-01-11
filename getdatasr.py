import requests 

SRs = open('sr.txt').readlines()

for SR in SRs:
    try:
        print("Get " + SR)
        URL = "http://localhost:3110/subreddit?name=" + SR.strip() + "&cat=top&time=week"
        r = requests.post(url = URL) 
        print(r)
        URL = "http://localhost:3110/subreddit?name=" + SR.strip() + "&cat=top&time=today"
        r = requests.post(url = URL) 
        print(r)
        URL = "http://localhost:3110/subreddit?name=" + SR.strip() + "&cat=controversial&time=today"
        r = requests.post(url = URL) 
        print(r)
    except:
        print("Error")