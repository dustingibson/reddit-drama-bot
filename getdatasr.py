import requests 

def callMethod(URL):
    try:
        print("Get " + URL)
        r = requests.post(url = URL) 
        print(r)
    except:
        print("error")

SRs = open('sr.txt').readlines()

for SR in SRs:
    callMethod("http://localhost:3110/subreddit?name=" + SR.strip() + "&cat=top&time=week")
    callMethod("http://localhost:3110/subreddit?name=" + SR.strip() + "&cat=top&time=today")
    callMethod("http://localhost:3110/subreddit?name=" + SR.strip() + "&cat=controversial&time=today")
