import requests, sys

def callMethod(URL):
    try:
        print("Get " + URL)
        r = requests.post(url = URL) 
        print(r)
    except:
        print("error")

SRs = open('sr.txt').readlines()

for SR in SRs:
    if SR[0] != '-':
        if sys.argv[1].lower() == "year":
            callMethod("http://dustingibson.com/api/subreddit?name=" + SR.strip() + "&cat=top&time=year")
        elif sys.argv[1].lower() == "week":
            callMethod("http://dustingibson.com/api/subreddit?name=" + SR.strip() + "&cat=top&time=week")
        elif sys.argv[1].lower() == "month":
            callMethod("http://dustingibson.com/api/subreddit?name=" + SR.strip() + "&cat=top&time=month")
        else:
            callMethod("http://dustingibson.com/api/subreddit?name=" + SR.strip() + "&cat=controversial&time=today")
    else:
        print("SKIP " + SR)
