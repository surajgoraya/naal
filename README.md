# naal - 🔗  A short-link service 
![naal admin panel](https://user-images.githubusercontent.com/4347494/102921346-3c0a8580-445a-11eb-846c-a9d881170b09.png)
<p align="center">
    <img width="256" height="256" src="https://user-images.githubusercontent.com/4347494/102923461-ca343b00-445d-11eb-9ac7-dda8fa2c0a7e.png">
   
   <p align="center">naal – logo</p>
</p>


## What Is it?
Simply put, naal is a self-hosted, short-linking service. It was born out of both curiosity, as well as none of the existing services fitting my relatively simple needs. __Would I recommend using this as a large scale prod application?__ _No, pls_ - I mostly made this to learn :)

## How it works
naal uses GitHub as it's storage medium for short-link mappings, as well as using as a means of authentication and management. The server simply looks up the current redirection mapping stored in the repo and upon a request it redirects the user based on the mapping.
## Stack
* Go (Server)
* Typescript/React (Frontend admin panel)
## Set up
**.env**
- The .env file stored in the root directory needs to contain the following:
    ```env
    GITHUB_CLIENTID=
    
    GITHUB_SECRET=
    
    ACCESS_CONTROL=https://api.github.com/repos/{user}/{repoName}
    
    CHECK_URL=https://raw.githubusercontent.com/{user}/{repo}/main/links.json
    
    MODE={prod | debug}
    ```
    The GitHub Client ID and Secret can be obtained by creating a new OAuth application in your GitHub settings. Access Control refers to the repo that you want to ensure users have access to so, i.e the repo which contains your links.json file. The check URL is the direct URL to the links.json file which the server will reference when redirecting users. The mode variable is used to change the way redirection works for the admin panel (i.e to a react app running at 3000, or to just the standard app)

**naal-admin/src/env.ts**
- Another environment file needs to be added and stored within the admin panel code, signifying if the environment is in development or not (adjusts how the admin panel redirects), as well as the name of the repo which contains the links.json file. 
  ```typescript
  export const enviroment = {
        "debug": true, //is app in production or not
        "access": "links" //name of the repo containing links.json
    }
  ```
  This env.ts file will likely be deprecated, in the future as this is a super inefficient way to manage this.

**GitHub OAuth App Settings**

* Callback URL should be set as `{Your Hostname}/auth/authenticated` 

## Managing links:
- This is done through an interface (pictured above) which currently hardcoded to be available at `/bossman` because I have a dumb sense of humor, although, I suspect I'll make this a variable in the future.
